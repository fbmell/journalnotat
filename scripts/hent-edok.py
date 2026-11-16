#!/usr/bin/env python3
"""Henter dokumentsamlinger fra e-dok (Region Midtjylland) som tekst.

    python3 scripts/hent-edok.py samlinger.txt       # én linje pr. samling: <unid> <navn>
    python3 scripts/hent-edok.py --unid X... "Navn"  # én samling
    python3 scripts/hent-edok.py --bilag             # hent PDF-bilag til allerede hentede dokumenter

For hver samling gemmes nbv/edok/<navn>/<mappe> - <titel>.txt (+ .html med den
originale brødtekst). Allerede hentede dokumenter springes over. Der holdes ca. 1
sekunds pause mellem kald. Resultatet samles i nbv/edok/manifest.csv og
nbv/edok/fejl.csv.

e-dok-links bruger http://; her hentes via https://, som giver samme indhold.
"""
import csv, datetime, html, json, os, re, subprocess, sys, time, urllib.parse

ROD = os.path.join(os.path.dirname(__file__), '..', 'nbv', 'edok')
UA = 'Mozilla/5.0 (X11; Linux x86_64)'
BASE = 'https://e-dok.rm.dk'
_sidst = 0.0


def hent(url):
    global _sidst
    vent = 1.0 - (time.time() - _sidst)
    if vent > 0:
        time.sleep(vent)
    _sidst = time.time()
    for forsoeg in range(3):
        r = subprocess.run(['curl', '-sS', '--fail', '-m', '60', '-A', UA, url], capture_output=True)
        if r.returncode == 0:
            return r.stdout.decode('utf-8', 'replace')
        time.sleep(3)
    raise RuntimeError(r.stderr.decode()[:150])


def tekst(h):
    h = re.sub(r'(?is)<(script|style).*?</\1>', '', h)
    h = re.sub(r'(?i)<br\s*/?>|</p>|</li>|</tr>|</h\d>|</div>', '\n', h)
    h = re.sub(r'(?i)<li[^>]*>', '\n- ', h)
    h = re.sub(r'(?i)</t[dh]>', ' | ', h)
    h = html.unescape(re.sub(r'<[^>]+>', '', h)).replace('Tilbage til top', '')
    h = re.sub(r'[ \t\xa0]+', ' ', h)
    return re.sub(r'\n\s*\n+', '\n\n', h).strip()


def rent(s, n=120):
    return re.sub(r'\s+', ' ', re.sub(r'[\\/:*?"<>|]+', '-', s)).strip()[:n].rstrip(' .')


def samling(unid, navn, manifest, fejl):
    mappe = os.path.join(ROD, rent(navn, 80))
    os.makedirs(mappe, exist_ok=True)
    try:
        trae = json.loads(hent(f'{BASE}/edok/collection/collection.nsf/LoadCollectionTree?OpenAgent&collectionid={unid}&node=root'))
    except Exception as e:
        fejl.append([navn, '(samlingen)', unid, str(e)])
        print('  FEJL ved samlingen:', e)
        return
    docs = []

    def gaa(noder, sti):
        for x in noder:
            if x.get('docid'):
                docs.append((sti, x))
            gaa(x.get('children') or [], sti if x.get('docid') else (sti + [x['text']]))
    gaa(trae, [])
    print(f'=== {navn}: {len(docs)} dokumenter')
    set_ = set()
    for sti, x in docs:
        if x['docid'] in set_:
            continue
        set_.add(x['docid'])
        fil = rent(' - '.join(sti[-1:] + [x['text']]))
        sti_fil = os.path.join(mappe, fil + '.txt')
        if os.path.exists(sti_fil):
            continue
        url = f"{BASE}/{x['dbfilepath']}/aLoadInfoDokRead?OpenAgent&id={x['docid']}&level=1"
        try:
            d = json.loads(hent(url))
            if not d.get('success'):
                raise RuntimeError(d.get('error', 'ukendt fejl'))
            d = d['data']
            krop = d.get('BodyWeb', '')
            hoved = (f"{d.get('Afsnit') or x['text']}\nUdgiver: {d.get('PublisherDisplay', '')}\n"
                     f"Type: {d.get('TemplateID', '')} · Version {d.get('Versionsnr', '')} · "
                     f"Gældende fra {d.get('StartDato', '')} · Revision {d.get('RevisionsDato', '')}\n"
                     f"e-dok: {x['docid']}\n\n")
            open(sti_fil, 'w').write(hoved + tekst(krop))
            open(os.path.join(mappe, fil + '.html'), 'w').write(krop)
            manifest.append([navn, ' / '.join(sti), x['text'], d.get('PublisherDisplay', ''), d.get('StartDato', ''),
                             d.get('RevisionsDato', ''), x['docid'], os.path.relpath(sti_fil, ROD),
                             'ja' if d.get('AttachmentID') else '', datetime.date.today().isoformat()])
        except Exception as e:
            fejl.append([navn, x['text'], x['docid'], str(e)[:150]])
            print('  FEJL:', x['text'][:60], '–', str(e)[:80])


def bilag():
    """Henter PDF-bilag, som de allerede hentede dokumenter linker til, til <samling>/bilag/
    og laver en tekstudgave (.txt) med pdftotext."""
    n = fejl = 0
    for rod, _, filer in os.walk(ROD):
        if os.path.basename(rod) == 'bilag':
            continue
        for f in filer:
            if not f.endswith('.html'):
                continue
            krop = open(os.path.join(rod, f), errors='replace').read()
            hrefs = sorted(set(re.findall(r'href="(/edok/[^"]+?\.pdf)"', krop, flags=re.I)))
            for h in hrefs:
                navn = rent(f[:-5], 70) + ' - ' + rent(html.unescape(h.rsplit('/', 1)[-1]), 80)
                mappe = os.path.join(rod, 'bilag')
                os.makedirs(mappe, exist_ok=True)
                ud = os.path.join(mappe, navn if navn.lower().endswith('.pdf') else navn + '.pdf')
                if os.path.exists(ud):
                    continue
                try:
                    global _sidst
                    vent = 1.0 - (time.time() - _sidst)
                    if vent > 0:
                        time.sleep(vent)
                    _sidst = time.time()
                    subprocess.run(['curl', '-sS', '--fail', '-m', '120', '-A', UA, '-o', ud, BASE + urllib.parse.quote(html.unescape(h), safe='/$')], check=True, capture_output=True)
                    if open(ud, 'rb').read(5) != b'%PDF-':
                        os.remove(ud)
                        raise RuntimeError('ikke en PDF (kræver formentlig login)')
                    subprocess.run(['pdftotext', '-layout', ud, ud[:-4] + '.txt'], capture_output=True)
                    n += 1
                    print('  bilag:', os.path.relpath(ud, ROD))
                except Exception as e:
                    fejl += 1
                    print('  FEJL bilag:', h[-60:], '–', str(e)[:80])
    print(f'\nBilag hentet: {n} · Fejlet: {fejl}')


def main():
    if sys.argv[1] == '--bilag':
        return bilag()
    if sys.argv[1] == '--unid':
        liste = [(sys.argv[2], sys.argv[3])]
    else:
        liste = [l.strip().split(' ', 1) for l in open(sys.argv[1]) if l.strip() and not l.startswith('#')]
    os.makedirs(ROD, exist_ok=True)
    manifest, fejl = [], []
    for unid, navn in liste:
        samling(unid, navn, manifest, fejl)
    mf = os.path.join(ROD, 'manifest.csv')
    ny = not os.path.exists(mf)
    with open(mf, 'a', newline='') as f:
        w = csv.writer(f)
        if ny:
            w.writerow(['samling', 'mappe', 'titel', 'udgiver', 'gældende fra', 'revision', 'e-dok-id', 'fil', 'bilag', 'hentet'])
        w.writerows(manifest)
    with open(os.path.join(ROD, 'fejl.csv'), 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['samling', 'titel', 'e-dok-id', 'grund'])
        w.writerows(fejl)
    print(f'\nHentet: {len(manifest)} · Fejlet: {len(fejl)}')
    for r in fejl:
        print('  -', ' | '.join(r))


if __name__ == '__main__':
    main()
