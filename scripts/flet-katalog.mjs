// Fletter nye kort ind i src/data/katalog.js og kontrollerer strukturen.
//
//   node scripts/flet-katalog.mjs <fil.mjs>
//
// <fil.mjs> eksporterer:
//   tilfoej     { områdeId: { foer?: modulId, moduler: [...] } }   nye kort i eksisterende område
//   erstat      { modulId: modul }                                  udskift et eksisterende kort (samme plads)
//   nyeOmraader [{ efter: områdeId, omraade: {...} }]               nye områder
//
// Et kort kan have `lokal: true` (lokal AUH-instruks fra e-dok, går forud for nationale
// kilder) og `ogsaa` (tekst med supplerende kilder).
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'katalog.js')
const url = pathToFileURL(p).href
const { katalog } = await import(url + '?' + Date.now())
const { tilfoej = {}, erstat = {}, nyeOmraader = [] } = await import(pathToFileURL(path.resolve(process.argv[2])).href)

for (const [mid, nyt] of Object.entries(erstat)) {
  const o = katalog.find((x) => x.moduler.some((m) => m.id === mid))
  if (!o) throw new Error('kan ikke erstatte – findes ikke: ' + mid)
  const i = o.moduler.findIndex((m) => m.id === mid)
  o.moduler[i] = nyt
}
for (const [oid, { foer, moduler }] of Object.entries(tilfoej)) {
  const o = katalog.find((x) => x.id === oid)
  if (!o) throw new Error('mangler område ' + oid)
  for (const m of moduler) if (katalog.some((x) => x.moduler.some((y) => y.id === m.id))) throw new Error('findes allerede: ' + m.id)
  const i = foer ? o.moduler.findIndex((x) => x.id === foer) : -1
  if (i >= 0) o.moduler.splice(i, 0, ...moduler)
  else o.moduler.push(...moduler)
}
for (const { efter, omraade } of nyeOmraader) {
  if (katalog.some((x) => x.id === omraade.id)) throw new Error('område findes: ' + omraade.id)
  const i = katalog.findIndex((x) => x.id === efter)
  katalog.splice(i + 1, 0, omraade)
}

const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
const arr = (a, ind) => (a.join(', ').length < 110 ? `[${a.map(q).join(', ')}]` : `[\n${a.map((x) => ind + '  ' + q(x) + ',').join('\n')}\n${ind}]`)
let ud = ''
for (const o of katalog) {
  ud += `  {\n    id: ${q(o.id)},\n    navn: ${q(o.navn)},\n    moduler: [\n`
  for (const m of o.moduler) {
    ud += `      {\n        id: ${q(m.id)},\n        navn: ${q(m.navn)},\n`
    if (m.lokal) ud += `        lokal: true,\n`
    if (m.kilde) ud += `        kilde: ${q(m.kilde)},\n`
    if (m.ogsaa) ud += `        ogsaa: ${q(m.ogsaa)},\n`
    if (m.husk) ud += `        husk: ${arr(m.husk, '        ')},\n`
    ud += `        linjer: [\n`
    for (const l of m.linjer) ud += `          { id: ${q(l.id)}, tekst: ${q(l.tekst)}${l.valg ? `, valg: [${l.valg.map(q).join(', ')}]` : ''} },\n`
    ud += `        ],\n      },\n`
  }
  ud += `    ],\n  },\n`
}
const kilde = fs.readFileSync(p, 'utf8')
const hoved = kilde.slice(0, kilde.indexOf('export const katalog'))
fs.writeFileSync(p, `${hoved}export const katalog = [\n${ud}]\n`)

// kontrol
const { katalog: k2 } = await import(url + '?' + Date.now() + 'x')
let m = 0, l = 0, kk = 0, lok = 0
const ids = new Set()
for (const o of k2) for (const x of o.moduler) {
  m++; if (x.kilde) kk++; if (x.lokal) lok++
  if (ids.has(x.id)) console.log('DUP modul', x.id); ids.add(x.id)
  const li = new Set()
  for (const y of x.linjer) {
    l++; if (li.has(y.id)) console.log('DUP linje', x.id, y.id); li.add(y.id)
    if (!!y.valg !== y.tekst.includes('{}')) console.log('valg/{} passer ikke', x.id, y.id)
  }
}
console.log(k2.length, 'områder', m, 'kort', kk, 'med kilde', lok, 'lokale', l, 'linjer')
