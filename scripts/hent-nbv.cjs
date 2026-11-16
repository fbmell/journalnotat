#!/usr/bin/env node
// Henter nationale behandlingsvejledninger (NBV) fra de faglige selskabers
// hjemmesider og gemmer dem som PDF i nbv/<selskab>/.
//
//   node scripts/hent-nbv.cjs                 hent alt (springer allerede hentede over)
//   node scripts/hent-nbv.cjs --kun dsgh,nnbv kun bestemte selskaber
//   node scripts/hent-nbv.cjs --max 2         højst 2 pr. selskab (til test)
//   node scripts/hent-nbv.cjs --list          vis kun hvad der ville blive hentet
//
// PDF-links gemmes direkte. HTML-sider gemmes som PDF med headless Chromium.
// Der holdes ca. 1 sekunds pause mellem kald. Resultatet skrives til
// nbv/manifest.csv, og fejl til nbv/fejl.csv.

const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'nbv')
const MANIFEST = path.join(ROOT, 'manifest.csv')
const FEJL = path.join(ROOT, 'fejl.csv')
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const PAUSE_MS = 1000
const I_DAG = new Date().toISOString().slice(0, 10)

const args = process.argv.slice(2)
const arg = (navn) => (args.includes(navn) ? args[args.indexOf(navn) + 1] : null)
const KUN = arg('--kun')?.split(',')
const MAX = arg('--max') ? Number(arg('--max')) : Infinity
const KUN_LISTE = args.includes('--list')

// ---------- hjælpefunktioner ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let sidsteKald = 0
async function pause() {
  const vent = PAUSE_MS - (Date.now() - sidsteKald)
  if (vent > 0) await sleep(vent)
  sidsteKald = Date.now()
}

function curl(url, ekstra = []) {
  return execFileSync('curl', ['-sS', '--compressed', '-L', '--fail', '-m', '180', '-A', UA, ...ekstra, url], {
    maxBuffer: 300 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}
async function hentHtml(url) {
  for (let forsoeg = 1; ; forsoeg++) {
    await pause()
    try {
      return curl(url).toString('utf8')
    } catch (e) {
      if (forsoeg >= 3) throw e
      await sleep(5000)
    }
  }
}

const entiteter = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', aelig: 'æ', oslash: 'ø', aring: 'å', AElig: 'Æ', Oslash: 'Ø', Aring: 'Å', eacute: 'é', ouml: 'ö', uuml: 'ü', auml: 'ä', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' }
function afkod(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => entiteter[n] ?? m)
}
const ren = (s) => afkod(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

function links(html, base) {
  const ud = []
  const set = new Set()
  const re = /<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const href = afkod(m[1] ?? m[2]).trim()
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue
    let url
    try {
      url = new URL(href, base)
    } catch {
      continue
    }
    url.hash = ''
    if (set.has(url.href)) continue
    set.add(url.href)
    ud.push({ url: url.href, tekst: ren(m[3]) })
  }
  return ud
}

const erPdfUrl = (u) => /\.pdf($|\?)/i.test(new URL(u).pathname + new URL(u).search)
const udenSlash = (u) => u.replace(/\/+$/, '')

function filnavn(titel) {
  const n = titel
    .replace(/[\/\\:*?"<>|]+/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .trim()
    .replace(/[. ]+$/, '')
  return (n.slice(0, 120).trim() || 'uden-titel') + '.pdf'
}

function titelFraHtml(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1 && ren(h1[1])) return ren(h1[1])
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return t ? ren(t[1]).split(/\s+[|–—-]\s+/)[0] : null
}

// ---------- CSV ----------

const csvFelt = (v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
function laesCsv(fil) {
  if (!fs.existsSync(fil)) return []
  const raekker = []
  let felt = '', raekke = [], iCitat = false
  const t = fs.readFileSync(fil, 'utf8').replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (iCitat) {
      if (c === '"' && t[i + 1] === '"') { felt += '"'; i++ }
      else if (c === '"') iCitat = false
      else felt += c
    } else if (c === '"') iCitat = true
    else if (c === ',') { raekke.push(felt); felt = '' }
    else if (c === '\n') { raekke.push(felt); raekker.push(raekke); raekke = []; felt = '' }
    else if (c !== '\r') felt += c
  }
  if (felt || raekke.length) { raekke.push(felt); raekker.push(raekke) }
  return raekker.slice(1).filter((r) => r.length >= 5)
}
const manifest = new Map() // kilde-URL → {selskab,titel,url,fil,dato}
for (const [selskab, titel, url, fil, dato] of laesCsv(MANIFEST)) manifest.set(url, { selskab, titel, url, fil, dato })
function skrivManifest() {
  const linjer = ['selskab,titel,kilde_url,filnavn,dato']
  for (const r of [...manifest.values()].sort((a, b) => (a.selskab + a.fil).localeCompare(b.selskab + b.fil, 'da')))
    linjer.push([r.selskab, r.titel, r.url, r.fil, r.dato].map(csvFelt).join(','))
  fs.writeFileSync(MANIFEST, '﻿' + linjer.join('\n') + '\n')
}

// ---------- opdagelse pr. selskab ----------
// Hver funktion returnerer en liste af { titel?, url, hentUrl?, bilag? }.
// bilag: true betyder, at PDF'er der linkes til inde på HTML-siden også hentes.

const selskaber = {
  'dcs-kardiologi': async () => {
    const html = await hentHtml('https://nbv.cardio.dk/kapitler/')
    return links(html, 'https://nbv.cardio.dk/kapitler/')
      .filter((l) => /^https:\/\/nbv\.cardio\.dk\/kapitel\/[^/]+\/?$/.test(l.url))
      .map((l) => {
        const nr = l.tekst.match(/^(\d+)/)?.[1]
        return { url: l.url, prefix: nr ? nr.padStart(2, '0') + ' ' : '' }
      })
  },

  'des-endokrinologi': async () => {
    const html = await hentHtml('https://endocrinology.dk/nbv/')
    return links(html, 'https://endocrinology.dk/nbv/')
      .filter((l) => /^https:\/\/endocrinology\.dk\/nbv\/[^/]+\/[^/]+\/?$/.test(l.url))
      .map((l) => ({ url: l.url, titel: l.tekst.replace(/^\d+\.\s*/, '') }))
  },

  'dsgh-gastroenterologi': async () => {
    const base = 'https://dsgh.dk/guidelines/'
    const menu = new Set(links(await hentHtml(base), base).map((l) => l.url))
    const ud = []
    for (const kat of ['ibd', 'lever', 'pancreas', 'ventrikel-og-duodenum', 'andre']) {
      const u = `https://dsgh.dk/${kat}/`
      for (const l of links(await hentHtml(u), u))
        if (!menu.has(l.url) && l.tekst) ud.push({ url: l.url, titel: l.tekst })
    }
    return ud
  },

  'dns-nefrologi': async () => {
    const base = 'https://nephrology.dk/vejledninger/'
    const egne = (l) =>
      (l.url.startsWith(base) && udenSlash(l.url) !== udenSlash(base)) ||
      (l.url.startsWith('https://nephrology.dk/wp-content/uploads/') && erPdfUrl(l.url))
    const eksterne = links(await hentHtml(base), base)
    const ud = eksterne.filter(egne).map((l) => ({ url: l.url, titel: l.tekst.replace(/^\/\s*/, '').replace(/\s*\/$/, ''), bilag: true, under: base }))
    // Links på oversigten til vejledninger hos andre (KDIGO, DAHS m.fl.) noteres som sprunget over
    const i = eksterne.findIndex((l) => egne(l))
    for (const l of eksterne.slice(i))
      if (!egne(l) && !l.url.includes('nephrology.dk') && l.tekst) ud.push({ url: l.url, titel: l.tekst, ekstern: true })
    return ud
  },

  'dls-lungemedicin': async () => {
    const base = 'https://lungemedicin.dk/retningslinjer/'
    const menu = new Set(links(await hentHtml(base), base).map((l) => l.url))
    const ud = []
    for (const kat of ['astma', 'andre', 'cancer', 'iltbehandling', 'infektioner', 'interstitielle', 'kol', 'procedurer', 'pleurasygdomme']) {
      const u = `https://lungemedicin.dk/${kat}/`
      for (const l of links(await hentHtml(u), u))
        if (!menu.has(l.url) && l.url.startsWith('https://lungemedicin.dk/') && l.tekst && !/\/page\/\d+/.test(l.url))
          ud.push({ url: l.url, titel: l.tekst, bilag: true, menu })
    }
    return ud
  },

  'dsg-geriatri': async () => {
    const base = 'https://geriatri.dk/forside/nbv.php'
    const html = await hentHtml(base)
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    return links(main, base)
      .filter((l) => erPdfUrl(l.url))
      .map((l) => ({ url: l.url, titel: l.tekst.split(/\s+-\s+Faglig godkendelse/i)[0] }))
  },

  'dsi-infektionsmedicin': async () => {
    const html = await hentHtml('https://infmed.dk/guidelines')
    const ud = []
    const re = /<div class="file_item item_title trigger" rel="([^"]+)">([^<]+)<\/div>([\s\S]*?)<\/li>/g
    let m
    while ((m = re.exec(html))) {
      const uid = m[3].match(/data-uid="([a-f0-9]+)"/)?.[1]
      const type = m[3].match(/class="filetype (\w+)"/)?.[1]
      if (!uid || (type && type !== 'pdf')) continue
      ud.push({
        url: 'https://infmed.dk/guidelines#' + afkod(m[1]),
        hentUrl: 'https://infmed.dk/site/tools/download.php?UID=' + uid,
        titel: ren(m[2]),
      })
    }
    return ud
  },

  'drs-reumatologi': async () => {
    const base = 'https://danskreumatologi.dk/nbv/sygdomme/'
    const html = await hentHtml(base)
    const alle = links(html, base)
    const fra = alle.findIndex((l) => /\/nbv\/sygdomme\/[^/]+/.test(l.url))
    const til = alle.findIndex((l) => /privatlivs-og-cookiepolitik/.test(l.url))
    return alle
      .slice(fra, til)
      .filter((l) => l.url.startsWith('https://danskreumatologi.dk/') && l.tekst)
      .map((l) => ({ url: l.url, titel: l.tekst }))
  },

  'dsko-onkologi': async () => {
    const base = 'https://onkologi.dk/nbv/'
    const ren1 = (u) => u.replace(/(%20)+$/, '').replace(/(%20)+\/$/, '/')
    const forside = links(await hentHtml(base), base).map((l) => ({ ...l, url: ren1(l.url) }))
    const menu = new Set(forside.map((l) => udenSlash(l.url)))
    const emner = forside.filter((l) => /^https:\/\/onkologi\.dk\/nbv\/[^/]+\/?$/.test(l.url))
    // Emnesiderne 'Onkologens ABC' og 'Understøttende behandling' har selv fagligt indhold
    const ud = emner.filter((l) => /onkologens-abc|understoettende/.test(l.url)).map((l) => ({ url: l.url, titel: l.tekst }))
    for (const emne of emner) {
      for (const l of links(await hentHtml(emne.url), emne.url)) {
        const url = ren1(l.url)
        if (menu.has(udenSlash(url)) || !l.tekst) continue
        if (/^https:\/\/onkologi\.dk\/nbv\/[^/]+\/?$/.test(url)) ud.push({ url, titel: l.tekst, bilag: true, menu: new Set(forside.map((x) => x.url)) })
        else if (url.startsWith('https://onkologi.dk/wp-content/uploads/') && erPdfUrl(url)) ud.push({ url, titel: l.tekst })
      }
    }
    return ud
  },

  'nnbv-neurologi': async () => {
    const base = 'https://nnbv.dk/'
    const html = await hentHtml(base)
    return links(html, base)
      .filter((l) => {
        const u = new URL(l.url)
        if (u.hostname !== 'nnbv.dk' || !l.tekst) return false
        if (u.searchParams.has('page_id')) return true
        if (u.search) return false
        return /^\/(?!20\d\d\/|om-nnbv|wp-|category|tag|author|feed|kontakt|cookie|privatliv)[^/]+(\/[^/]+)?\/?$/.test(u.pathname)
      })
      .map((l) => ({ url: l.url, titel: l.tekst }))
  },
}

// ---------- hentning ----------

const fejl = []
let browser, side

async function tilPdfMedChromium(url, dest) {
  if (!browser) {
    browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
    side = await (await browser.newContext({ userAgent: UA, viewport: { width: 1100, height: 1400 }, locale: 'da-DK' })).newPage()
  }
  await pause()
  const svar = await side.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (svar && svar.status() >= 400) throw new Error('HTTP ' + svar.status())
  await side.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
  await side.evaluate(async () => {
    // Rul igennem siden, så billeder der indlæses dovent kommer med
    for (let y = 0; y < document.body.scrollHeight; y += 1200) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
    document.querySelectorAll('details').forEach((d) => (d.open = true))
    // Faste bjælker (menu, cookiebanner) ville ellers gentages på hver side
    for (const el of document.querySelectorAll('body *')) {
      const p = getComputedStyle(el).position
      if (p === 'fixed') el.style.setProperty('display', 'none', 'important')
      else if (p === 'sticky') el.style.setProperty('position', 'static', 'important')
    }
  })
  await side.addStyleTag({
    content: `.cmplz-cookiebanner,#cookie-notice,#cookie-law-info-bar,.cookie-banner{display:none!important}
      .elementor-tab-content,.elementor-toggle .elementor-tab-content,.e-n-accordion-item>div{display:block!important}`,
  })
  await side.pdf({ path: dest, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } })
}

function ledigtNavn(mappe, navn, brugte) {
  let n = navn, i = 2
  while (brugte.has(n.toLowerCase()) || fs.existsSync(path.join(mappe, n))) n = navn.replace(/\.pdf$/, ` (${i++}).pdf`)
  brugte.add(n.toLowerCase())
  return n
}

async function hentEn(selskab, emne, brugte, koe) {
  const mappe = path.join(ROOT, selskab)
  const kendt = manifest.get(emne.url)
  if (kendt && fs.existsSync(path.join(mappe, kendt.fil))) return 'sprunget over'
  if (emne.ekstern) throw new Error('ligger på en anden hjemmeside – ikke hentet')

  const tmp = path.join(mappe, '.tmp-hent')
  await pause()
  let data = curl(emne.hentUrl ?? emne.url)
  // Nogle servere skriver lidt tekst (fx PHP-advarsler) foran selve PDF'en
  const start = data.subarray(0, 16384).indexOf('%PDF-')
  const erPdf = start >= 0
  if (start > 0) data = data.subarray(start)
  fs.writeFileSync(tmp, data)
  let titel = emne.titel

  if (erPdf) {
    titel = titel || decodeURIComponent(path.basename(new URL(emne.url).pathname)).replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ')
    const fil = ledigtNavn(mappe, filnavn((emne.prefix ?? '') + titel), brugte)
    fs.renameSync(tmp, path.join(mappe, fil))
    manifest.set(emne.url, { selskab, titel, url: emne.url, fil, dato: I_DAG })
    return 'PDF'
  }

  const html = data.toString('utf8')
  fs.rmSync(tmp, { force: true })
  if (!/<html|<!doctype/i.test(html.slice(0, 3000))) throw new Error('hverken PDF eller HTML')
  if (/locked_page_header|Access Denied/i.test(html)) throw new Error('kræver login (Access Denied)')
  titel = titel && titel.length > 3 ? titel : titelFraHtml(html) || titel || 'uden titel'
  if (!emne.titel) titel = titelFraHtml(html) || titel

  // PDF'er og undersider der linkes til inde på selve vejledningssiden
  if (emne.bilag) {
    for (const l of links(html, emne.url)) {
      if (emne.menu?.has(l.url) || koe.set.has(l.url)) continue
      const u = new URL(l.url)
      const sammeSted = u.hostname === new URL(emne.url).hostname
      if (sammeSted && erPdfUrl(l.url) && u.pathname.includes('/wp-content/uploads/')) {
        const navn = l.tekst.length > 3 && !/^(her|pdf|link|download|hent)$/i.test(l.tekst) ? l.tekst : ''
        koe.tilfoej({ url: l.url, titel: navn && !/pdf/i.test(navn) ? `${titel} - ${navn}` : `${titel} (PDF${navn ? ' - ' + navn.replace(/\s*pdf\s*/i, ' ').trim() : ''})`.replace(' - )', ')') })
      } else if (emne.under && l.url.startsWith(emne.under) && udenSlash(l.url) !== udenSlash(emne.under) && l.tekst) {
        koe.tilfoej({ url: l.url, titel: l.tekst, bilag: true, under: emne.under })
      }
    }
  }

  const fil = ledigtNavn(mappe, filnavn((emne.prefix ?? '') + titel), brugte)
  await tilPdfMedChromium(emne.url, path.join(mappe, fil))
  manifest.set(emne.url, { selskab, titel, url: emne.url, fil, dato: I_DAG })
  return 'HTML → PDF'
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true })
  const taeller = { hentet: 0, sprunget: 0 }

  for (const [selskab, find] of Object.entries(selskaber)) {
    if (KUN && !KUN.some((k) => selskab.includes(k))) continue
    const mappe = path.join(ROOT, selskab)
    fs.mkdirSync(mappe, { recursive: true })
    console.log(`\n=== ${selskab}`)

    let emner
    try {
      emner = await find()
    } catch (e) {
      fejl.push({ selskab, titel: '(oversigtssiden)', url: '', grund: e.message.split('\n')[0] })
      console.log('  FEJL ved oversigtssiden:', e.message.split('\n')[0])
      continue
    }
    const koe = {
      liste: [],
      set: new Set(),
      tilfoej(e) {
        if (this.set.has(e.url)) return
        this.set.add(e.url)
        this.liste.push(e)
      },
    }
    emner.forEach((e) => koe.tilfoej(e))
    console.log(`  ${koe.liste.length} fundet`)
    if (KUN_LISTE) {
      koe.liste.forEach((e) => console.log(`   - ${e.titel ?? ''} <${e.url}>`))
      continue
    }

    const brugte = new Set()
    for (let i = 0; i < koe.liste.length && i < MAX; i++) {
      const emne = koe.liste[i]
      try {
        const res = await hentEn(selskab, emne, brugte, koe)
        if (res === 'sprunget over') taeller.sprunget++
        else {
          taeller.hentet++
          skrivManifest()
        }
        console.log(`  [${i + 1}/${koe.liste.length}] ${res}: ${manifest.get(emne.url)?.fil ?? emne.titel}`)
      } catch (e) {
        const grund = (e.stderr?.toString() || e.message).split('\n')[0].replace(/^curl: \(\d+\) /, '').slice(0, 200)
        fejl.push({ selskab, titel: emne.titel ?? '', url: emne.url, grund })
        console.log(`  [${i + 1}/${koe.liste.length}] FEJL: ${emne.titel ?? emne.url} – ${grund}`)
        fs.rmSync(path.join(mappe, '.tmp-hent'), { force: true })
      }
    }
  }

  if (browser) await browser.close()
  if (KUN_LISTE) return
  skrivManifest()
  if (!KUN && MAX === Infinity) fs.writeFileSync(FEJL, '﻿' + ['selskab,titel,kilde_url,grund', ...fejl.map((f) => [f.selskab, f.titel, f.url, f.grund].map(csvFelt).join(','))].join('\n') + '\n')

  console.log(`\nHentet: ${taeller.hentet} · Sprunget over (fandtes i forvejen): ${taeller.sprunget} · Fejlet: ${fejl.length}`)
  if (fejl.length) {
    console.log('\nFejlede:')
    for (const f of fejl) console.log(`  - [${f.selskab}] ${f.titel} <${f.url}> – ${f.grund}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
