import { useEffect, useMemo, useRef, useState } from 'react'
import { katalog } from './data/katalog.js'

const LAGER_NOEGLE = 'journalnotat:valg:v1'

function laes(noegle, standard) {
  try {
    const v = localStorage.getItem(noegle)
    return v ? JSON.parse(v) : standard
  } catch {
    return standard
  }
}
function gem(noegle, vaerdi) {
  try {
    localStorage.setItem(noegle, JSON.stringify(vaerdi))
  } catch {
    /* ignorér */
  }
}

const noegle = (modulId, linjeId) => `${modulId}:${linjeId}`

// Vises første gang, så man kan se hvordan planen bygges op.
const EKSEMPEL_VALG = {
  'smertebehandling:pcm': '4',
  'laksantia:movicol': '1',
  'diabetes:bs': '5',
  'diabetes:semglee': '0,2',
  'tromboseprofylakse:lmh': 'dalteparin 5.000 IE',
}

// Kort i den daglige visning, indtil man selv har valgt favoritter med stjernen.
const DAGLIGE = [
  'diabetes', 'smertebehandling', 'laksantia', 'kvalme', 'antibiotika', 'ernaering', 'refeeding',
  'vaeske', 'nyrer', 'delir', 'behandlingsniveau', 'ilt', 'resp-ovrigt', 'kredslob',
  'tromboseprofylakse', 'udskrivelse',
]
const ALLE_KORT = katalog.flatMap((o) => o.moduler)

// Fjerner gemte valg, der ikke længere findes i kataloget (eller har en udgået værdi).
function kunKendte(gemt) {
  const ud = {}
  for (const o of katalog)
    for (const m of o.moduler)
      for (const l of m.linjer) {
        const k = noegle(m.id, l.id)
        if (!(k in gemt)) continue
        ud[k] = l.valg ? (l.valg.includes(gemt[k]) ? gemt[k] : l.valg[0]) : null
      }
  return ud
}

function linjeTekst(linje, valgt) {
  if (!linje.valg) return linje.tekst
  return linje.tekst.replace('{}', valgt ?? linje.valg[0])
}

function byggPlan(valg, medOverskrifter, fritekst) {
  const blokke = []
  for (const omraade of katalog) {
    for (const modul of omraade.moduler) {
      const linjer = modul.linjer
        .filter((l) => noegle(modul.id, l.id) in valg)
        .map((l) => linjeTekst(l, valg[noegle(modul.id, l.id)]))
      if (linjer.length === 0) continue
      blokke.push(
        medOverskrifter
          ? `${modul.navn}:\n${linjer.map((t) => `- ${t}`).join('\n')}`
          : linjer.map((t) => `- ${t}`).join('\n'),
      )
    }
  }
  const tekst = fritekst.trim()
  if (tekst) blokke.push(medOverskrifter ? `Øvrigt:\n${tekst}` : tekst)
  return blokke.join(medOverskrifter ? '\n\n' : '\n')
}

function matcher(soeg, ...tekster) {
  if (!soeg) return true
  const s = soeg.toLowerCase()
  return tekster.some((t) => t.toLowerCase().includes(s))
}

export default function App() {
  const [valg, setValg] = useState(() => kunKendte(laes(LAGER_NOEGLE, EKSEMPEL_VALG)))
  const [medOverskrifter, setMedOverskrifter] = useState(() => laes(`${LAGER_NOEGLE}:overskrifter`, true))
  const [fritekst, setFritekst] = useState('')
  const [soeg, setSoeg] = useState('')
  const [kopieret, setKopieret] = useState(false)
  const [planAaben, setPlanAaben] = useState(false)
  const [visning, setVisning] = useState(() => (laes(`${LAGER_NOEGLE}:visning`, 'daglig') === 'alle' ? 'alle' : 'daglig'))
  const [favoritter, setFavoritter] = useState(() => {
    const gemt = laes(`${LAGER_NOEGLE}:favoritter`, DAGLIGE)
    return (Array.isArray(gemt) ? gemt : DAGLIGE).filter((id) => ALLE_KORT.some((m) => m.id === id))
  })
  useEffect(() => gem(`${LAGER_NOEGLE}:visning`, visning), [visning])
  useEffect(() => gem(`${LAGER_NOEGLE}:favoritter`, favoritter), [favoritter])
  const skiftFavorit = (id) =>
    setFavoritter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const standardFavoritter =
    favoritter.length === DAGLIGE.length && DAGLIGE.every((id) => favoritter.includes(id))
  // I daglig visning vises favoritter og kort, der allerede er valgt noget fra. Søgning går altid i alt.
  const daglig = visning === 'daglig' && !soeg

  useEffect(() => gem(LAGER_NOEGLE, valg), [valg])
  useEffect(() => gem(`${LAGER_NOEGLE}:overskrifter`, medOverskrifter), [medOverskrifter])

  const plan = useMemo(() => byggPlan(valg, medOverskrifter, fritekst), [valg, medOverskrifter, fritekst])
  const antal = Object.keys(valg).length

  const synligt = useMemo(
    () =>
      katalog
        .map((o) => ({
          ...o,
          moduler: o.moduler
            .filter(
              (m) =>
                !daglig ||
                favoritter.includes(m.id) ||
                m.linjer.some((l) => noegle(m.id, l.id) in valg),
            )
            .map((m) => {
              if (matcher(soeg, o.navn, m.navn)) return m
              const linjer = m.linjer.filter((l) => matcher(soeg, l.tekst))
              return linjer.length ? { ...m, linjer } : null
            })
            .filter(Boolean),
        }))
        .filter((o) => o.moduler.length),
    [soeg, daglig, favoritter, valg],
  )

  const antalIOmraade = (omraade) =>
    omraade.moduler.reduce(
      (sum, m) => sum + m.linjer.filter((l) => noegle(m.id, l.id) in valg).length,
      0,
    )

  function skift(modulId, linje) {
    const k = noegle(modulId, linje.id)
    setValg((v) => {
      const ny = { ...v }
      if (k in ny) delete ny[k]
      else ny[k] = linje.valg ? linje.valg[0] : null
      return ny
    })
  }
  function vaelgVaerdi(modulId, linje, vaerdi) {
    setValg((v) => ({ ...v, [noegle(modulId, linje.id)]: vaerdi }))
  }
  function skiftModul(modul, alleValgt) {
    setValg((v) => {
      const ny = { ...v }
      for (const l of modul.linjer) {
        const k = noegle(modul.id, l.id)
        if (alleValgt) delete ny[k]
        else if (!(k in ny)) ny[k] = l.valg ? l.valg[0] : null
      }
      return ny
    })
  }

  const planRef = useRef(null)
  async function kopier() {
    try {
      await navigator.clipboard.writeText(plan)
      setKopieret(true)
      setTimeout(() => setKopieret(false), 2000)
    } catch {
      planRef.current?.focus()
      planRef.current?.select()
    }
  }
  // Ryd fjerner alle tilvalg og fritekst; kan fortrydes i nogle sekunder.
  const [fortryd, setFortryd] = useState(null)
  const fortrydTimer = useRef(null)
  function ryd() {
    if (antal === 0 && !fritekst) return
    setFortryd({ valg, fritekst })
    setValg({})
    setFritekst('')
    clearTimeout(fortrydTimer.current)
    fortrydTimer.current = setTimeout(() => setFortryd(null), 8000)
  }
  function fortrydRyd() {
    if (!fortryd) return
    setValg(fortryd.valg)
    setFritekst(fortryd.fritekst)
    setFortryd(null)
    clearTimeout(fortrydTimer.current)
  }

  const planPanel = (
    <PlanPanel
      plan={plan}
      planRef={planRef}
      antal={antal}
      medOverskrifter={medOverskrifter}
      setMedOverskrifter={setMedOverskrifter}
      fritekst={fritekst}
      setFritekst={setFritekst}
      kopier={kopier}
      kopieret={kopieret}
      ryd={ryd}
    />
  )

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 py-3 px-[max(16px,env(safe-area-inset-left,0px))]">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-extrabold tracking-tight">Journalnotat</h1>
            <span className="hidden text-sm text-muted sm:inline">PLAN til intern medicinsk stuegang</span>
          </div>
          <div className="ml-auto inline-flex overflow-hidden rounded-md border border-line text-sm font-semibold" role="group" aria-label="Visning">
            {[
              ['daglig', 'Daglig'],
              ['alle', `Alle ${ALLE_KORT.length}`],
            ].map(([id, tekst]) => (
              <button
                key={id}
                type="button"
                aria-pressed={visning === id}
                onClick={() => setVisning(id)}
                className={`px-3 py-1.5 border-l border-line first:border-l-0 ${
                  visning === id ? 'bg-accent text-accent-ink' : 'bg-surface text-muted hover:text-ink'
                }`}
              >
                {tekst}
              </button>
            ))}
          </div>
          <label className="relative w-full sm:w-72" htmlFor="soeg">
            <span className="sr-only">Søg</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth="2">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 4 4" />
            </svg>
            <input
              id="soeg"
              type="search"
              value={soeg}
              onChange={(e) => setSoeg(e.target.value)}
              placeholder="Søg, fx »insulin« eller »væske«"
              className="w-full rounded-md border border-line bg-bg py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
          </label>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 py-6 px-[max(16px,env(safe-area-inset-left,0px))] lg:grid-cols-[200px_minmax(0,1fr)_380px]">
        {/* Emner */}
        <nav aria-label="Emner" className="hidden lg:block">
          <ul className="sticky top-20 flex flex-col gap-0.5">
            {synligt.map((o) => {
              const n = antalIOmraade(o)
              return (
                <li key={o.id}>
                  <a
                    href={`#${o.id}`}
                    className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-ink"
                  >
                    <span>{o.navn}</span>
                    {n > 0 && (
                      <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-semibold tabular-nums text-accent-ink">
                        {n}
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Katalog */}
        <main className="flex min-w-0 flex-col gap-8">
          <p className="rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
            <strong>Prototype.</strong> Kort mærket <strong>AUH</strong> bygger på lokale instrukser fra e-dok og går forud for nationale vejledninger.
            Skriv ikke navn, CPR-nummer eller andre patientoplysninger i appen.
          </p>

          {/* Emne-chips på mobil */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
            {synligt.map((o) => {
              const n = antalIOmraade(o)
              return (
                <a
                  key={o.id}
                  href={`#${o.id}`}
                  className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
                    n ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted'
                  }`}
                >
                  {o.navn}
                  {n > 0 && <span className="ml-1 font-semibold tabular-nums">{n}</span>}
                </a>
              )
            })}
          </div>

          {synligt.length === 0 && (
            <p className="text-muted">
              {soeg ? `Ingen punkter matcher »${soeg}«.` : 'Ingen favoritter endnu. Skift til »Alle«, og sæt stjerne på de kort, du bruger dagligt.'}
            </p>
          )}
          {visning === 'daglig' && soeg && (
            <p className="text-sm text-muted">Søgningen dækker alle kort, også dem uden for den daglige visning.</p>
          )}

          {synligt.map((omraade) => (
            <section key={omraade.id} id={omraade.id} className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{omraade.navn}</h2>
              {omraade.moduler.map((modul) => (
                <ModulKort
                  key={modul.id}
                  modul={ALLE_KORT.find((m) => m.id === modul.id)}
                  synligeLinjer={modul.linjer}
                  valg={valg}
                  skift={skift}
                  vaelgVaerdi={vaelgVaerdi}
                  skiftModul={skiftModul}
                  tvungetAaben={Boolean(soeg)}
                  favorit={favoritter.includes(modul.id)}
                  skiftFavorit={skiftFavorit}
                />
              ))}
            </section>
          ))}

          {daglig && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4 text-sm text-muted">
              <span>
                Viser {favoritter.length} favoritter af {ALLE_KORT.length} kort. Stjernen på et kort tilføjer eller fjerner det herfra.
              </span>
              <button type="button" onClick={() => setVisning('alle')} className="font-semibold text-accent hover:underline">
                Vis alle kort
              </button>
              {!standardFavoritter && (
                <button type="button" onClick={() => setFavoritter(DAGLIGE)} className="font-semibold text-accent hover:underline">
                  Nulstil til standard
                </button>
              )}
            </p>
          )}
        </main>

        {/* Plan (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">{planPanel}</div>
        </aside>
      </div>

      {/* Besked efter Ryd */}
      {fortryd && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6"
        >
          <div className="flex items-center gap-4 rounded-lg bg-ink px-4 py-3 text-sm text-bg shadow-lg">
            <span>Alle valg er ryddet</span>
            <button type="button" onClick={fortrydRyd} className="font-semibold underline underline-offset-2">
              Fortryd
            </button>
          </div>
        </div>
      )}

      {/* Bundbjælke (mobil) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden px-[max(16px,env(safe-area-inset-left,0px))] pt-3 pb-[max(12px,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <button
            type="button"
            onClick={() => setPlanAaben(true)}
            className="flex-1 rounded-md border border-line px-4 py-2.5 text-left text-sm font-semibold"
          >
            Plan <span className="ml-1 tabular-nums text-muted">({antal} valgt)</span>
          </button>
          <button
            type="button"
            onClick={ryd}
            disabled={!plan}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-muted disabled:opacity-40"
          >
            Ryd
          </button>
          <button
            type="button"
            onClick={kopier}
            disabled={!plan}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-40"
          >
            {kopieret ? 'Kopieret' : 'Kopiér'}
          </button>
        </div>
      </div>

      {/* Plan-ark (mobil) */}
      {planAaben && (
        <div className="fixed inset-0 z-40 flex flex-col bg-bg lg:hidden" role="dialog" aria-modal="true" aria-label="Plan">
          <div className="flex items-center justify-between border-b border-line bg-surface py-3 px-[max(16px,env(safe-area-inset-left,0px))] pt-[max(12px,env(safe-area-inset-top,0px))]">
            <h2 className="font-bold">Plan</h2>
            <button type="button" onClick={() => setPlanAaben(false)} className="rounded-md px-3 py-1.5 text-sm font-semibold text-accent">
              Luk
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4 px-[max(16px,env(safe-area-inset-left,0px))] pb-[max(16px,env(safe-area-inset-bottom,0px))]">
            {planPanel}
          </div>
        </div>
      )}
    </div>
  )
}

function ModulKort({ modul, synligeLinjer, valg, skift, vaelgVaerdi, skiftModul, tvungetAaben, favorit, skiftFavorit }) {
  const antalValgt = modul.linjer.filter((l) => noegle(modul.id, l.id) in valg).length
  const alleValgt = antalValgt === modul.linjer.length
  const [aaben, setAaben] = useState(antalValgt > 0)
  const vis = aaben || tvungetAaben

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex items-start justify-between gap-x-3 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">
            <button
              type="button"
              onClick={() => setAaben(!aaben)}
              aria-expanded={vis}
              className="inline-flex items-center gap-2 text-left"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" className={`h-3 w-3 shrink-0 fill-none stroke-muted transition-transform ${vis ? 'rotate-90' : ''}`} strokeWidth="2">
                <path d="m4 2 4 4-4 4" />
              </svg>
              {modul.navn}
            </button>
            {modul.lokal && (
              <span className="ml-2 inline-block translate-y-[-1px] rounded-full bg-accent px-2 py-0.5 align-middle text-[0.68rem] font-semibold uppercase tracking-wider text-accent-ink">
                AUH
              </span>
            )}
            {antalValgt > 0 && (
              <span className="ml-2 text-sm font-medium tabular-nums text-accent">
                {antalValgt}/{modul.linjer.length}
              </span>
            )}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        {vis && <button
          type="button"
          onClick={() => skiftModul(modul, alleValgt)}
          className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
        >
          {alleValgt ? 'Fjern alle' : 'Tilføj alle'}
        </button>}
        <button
          type="button"
          aria-pressed={favorit}
          aria-label={favorit ? `Fjern ${modul.navn} fra daglig visning` : `Vis ${modul.navn} i daglig visning`}
          title={favorit ? 'Fjern fra daglig visning' : 'Vis i daglig visning'}
          onClick={() => skiftFavorit(modul.id)}
          className={`grid h-7 w-7 place-items-center rounded-md hover:bg-bg ${favorit ? 'text-accent' : 'text-muted'}`}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-[18px] w-[18px] stroke-current ${favorit ? 'fill-current' : 'fill-none'}`} strokeWidth="1.6" strokeLinejoin="round">
            <path d="m10 2.5 2.3 4.7 5.2.8-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2L2.5 8l5.2-.8Z" />
          </svg>
        </button>
        </div>
      </header>
      {vis && modul.husk?.length > 0 && (
        <p className="px-4 pb-3 text-sm text-muted">
          <span className="font-semibold text-ink/70">Husk: </span>
          {modul.husk.join(' · ')}
        </p>
      )}

      {vis && <ul className="border-t border-line">
        {synligeLinjer.map((linje) => {
          const k = noegle(modul.id, linje.id)
          const valgt = k in valg
          const [foer, efter] = linje.valg ? linje.tekst.split('{}') : [linje.tekst, '']
          return (
            <li key={linje.id} className={`border-b border-line last:border-b-0 ${valgt ? 'bg-accent-soft' : ''}`}>
              <div className="flex items-start gap-3 px-4 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={valgt}
                  onClick={() => skift(modul.id, linje)}
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${
                    valgt ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface'
                  }`}
                  aria-label={linjeTekst(linje, valg[k])}
                >
                  {valgt && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.2" aria-hidden="true">
                      <path d="m2.5 6.5 2.3 2.3 4.7-5.3" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1 text-[0.94rem] leading-snug">
                  <span className="cursor-pointer" onClick={() => skift(modul.id, linje)}>
                    {foer}
                  </span>
                  {linje.valg && (
                    <span className="mx-1 inline-flex translate-y-[-1px] overflow-hidden rounded-md border border-line align-middle">
                      {linje.valg.map((v) => {
                        const aktiv = valgt ? valg[k] === v : v === linje.valg[0]
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => vaelgVaerdi(modul.id, linje, v)}
                            className={`px-2 py-0.5 text-sm font-semibold tabular-nums ${
                              aktiv && valgt
                                ? 'bg-accent text-accent-ink'
                                : aktiv
                                  ? 'bg-bg text-ink'
                                  : 'bg-surface text-muted hover:text-ink'
                            } border-l border-line first:border-l-0`}
                          >
                            {v}
                          </button>
                        )
                      })}
                    </span>
                  )}
                  {efter && (
                    <span className="cursor-pointer" onClick={() => skift(modul.id, linje)}>
                      {efter}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>}
      {vis && <footer className="border-t border-line px-4 py-2 text-xs text-muted">
        {modul.kilde ? (
          <>
            <span className="font-semibold text-accent">{modul.lokal ? 'Lokal instruks (e-dok): ' : 'Kilde: '}</span>
            {modul.kilde}
            {modul.ogsaa && <span className="block">Se også: {modul.ogsaa}</span>}
          </>
        ) : (
          <span className="text-warn">Eksempel – ikke valideret mod retningslinje</span>
        )}
      </footer>}
    </article>
  )
}

function PlanPanel({ plan, planRef, antal, medOverskrifter, setMedOverskrifter, fritekst, setFritekst, kopier, kopieret, ryd }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Plan <span className="tabular-nums">· {antal} valgt</span>
        </h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted" htmlFor="overskrifter">
          <input
            id="overskrifter"
            type="checkbox"
            checked={medOverskrifter}
            onChange={(e) => setMedOverskrifter(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Overskrifter
        </label>
      </div>

      <div className="rounded-lg border border-line bg-paper">
        {plan ? (
          <textarea
            ref={planRef}
            id="plan-tekst"
            readOnly
            value={plan}
            rows={Math.min(22, Math.max(6, plan.split('\n').length + 1))}
            className="block w-full resize-none bg-transparent p-4 font-mono text-[0.82rem] leading-relaxed outline-none"
          />
        ) : (
          <p className="p-4 text-sm text-muted">
            Intet valgt endnu. Sæt flueben ved de punkter, der skal med i PLAN – de samles her i den rækkefølge, de står i kataloget.
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm" htmlFor="fritekst">
        <span className="font-semibold">Fritekst</span>
        <textarea
          id="fritekst"
          rows={3}
          value={fritekst}
          onChange={(e) => setFritekst(e.target.value)}
          placeholder="Tilføjes til sidst i planen"
          className="rounded-md border border-line bg-surface p-3 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={kopier}
          disabled={!plan}
          className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-40"
        >
          {kopieret ? 'Kopieret til udklipsholderen' : 'Kopiér plan'}
        </button>
        <button
          type="button"
          onClick={ryd}
          disabled={!plan}
          className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink disabled:opacity-40"
        >
          Ryd alle valg
        </button>
      </div>
      <p className="text-xs text-muted">
        »__« markerer felter, du udfylder selv i journalen. Dine valg huskes i denne browser, indtil du trykker »Ryd alle valg«.
      </p>
    </div>
  )
}
