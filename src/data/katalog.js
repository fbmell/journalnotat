// Katalog over plan-linjer til intern medicinsk stuegang.
//
// OBS: Alt indhold her er EKSEMPLER og er ikke valideret mod
// behandlingsvejledninger. Det skal gennemgås og rettes, før det bruges.
//
// Struktur:
//   omraade  – et organsystem/tema (vises i navigationen)
//   modul    – en "vare" man kan tilvælge, fx "Diabetes"
//   husk     – spørgsmål man bør overveje (kommer IKKE med i planen)
//   linjer   – tekst der kan tilvælges til PLAN
//     valg   – hvis linjen indeholder {}, vælges værdien blandt disse
//              (første værdi er standard)
//   "__" i en tekst er et felt, man udfylder selv i journalen.

export const katalog = [
  {
    id: 'smerter',
    navn: 'Smerter',
    moduler: [
      {
        id: 'smertebehandling',
        navn: 'Smertebehandling',
        husk: ['Er pt. smertedækket?', 'Opioid → husk laksantia', 'Nyrefunktion ved NSAID?'],
        linjer: [
          { id: 'pcm', tekst: 'Rp. paracetamol 1 g x {} dgl. fast', valg: ['4', '3'] },
          { id: 'opioid-pn', tekst: 'Rp. opioid p.n. ved gennembrudssmerter: __' },
          { id: 'nrs', tekst: 'Smertescore (NRS) x {} dgl.', valg: ['3', '2'] },
          { id: 'smerte-rev', tekst: 'Smertebehandling revurderes ved næste stuegang' },
        ],
      },
    ],
  },
  {
    id: 'mave-tarm',
    navn: 'Mave-tarm',
    moduler: [
      {
        id: 'laksantia',
        navn: 'Lakserende behandling',
        husk: ['Sidste afføring?', 'Får pt. opioid?'],
        linjer: [
          { id: 'movicol', tekst: 'Rp. Movicol 1 brev x {} dgl.', valg: ['1', '2'] },
          { id: 'afforing', tekst: 'Afføringsskema' },
          { id: 'klysma', tekst: 'Ved manglende afføring > 3 døgn: klysma' },
        ],
      },
    ],
  },
  {
    id: 'infektion',
    navn: 'Infektion',
    moduler: [
      {
        id: 'antibiotika',
        navn: 'Antibiotika',
        husk: ['Indikation og fokus?', 'Planlagt varighed?', 'Dyrkningssvar?', 'Kan der skiftes til p.o.?'],
        linjer: [
          { id: 'ab-fortsat', tekst: 'Fortsat antibiotika: __, planlagt varighed {} dage i alt', valg: ['5', '7', '10', '14'] },
          { id: 'ab-po', tekst: 'Vurdér skift fra i.v. til p.o. ved klinisk bedring' },
          { id: 'ab-dyrk', tekst: 'Følg op på dyrkningssvar og tilpas behandling' },
          { id: 'crp', tekst: 'CRP og leukocytter i morgen' },
          { id: 'ab-stop', tekst: 'Antibiotika seponeres efter endt behandling' },
        ],
      },
    ],
  },
  {
    id: 'ernaering',
    navn: 'Ernæring',
    moduler: [
      {
        id: 'ernaering',
        navn: 'Ernæring',
        husk: ['Spiser pt.?', 'Tilstrækkelig ernæring?', 'Skal der suppleres?', 'Risiko for refeeding?'],
        linjer: [
          { id: 'nrs2002', tekst: 'Ernæringsscreening (NRS 2002)' },
          { id: 'kostreg', tekst: 'Kostregistrering x {} døgn', valg: ['3', '2'] },
          { id: 'protein', tekst: 'Rp. proteindrik x {} dgl.', valg: ['2', '3'] },
          { id: 'dietist', tekst: 'Henvises til diætist' },
          { id: 'sonde', tekst: 'Overvej sondeernæring ved fortsat utilstrækkeligt indtag' },
        ],
      },
      {
        id: 'refeeding',
        navn: 'Refeeding',
        husk: ['Lavt BMI, vægttab eller lavt indtag over flere dage?', 'Alkoholoverforbrug?'],
        linjer: [
          { id: 'tiamin', tekst: 'Rp. tiamin før opstart af ernæring' },
          { id: 'refeed-blod', tekst: 'Fosfat, kalium og magnesium dagligt de første {} døgn', valg: ['3', '5'] },
          { id: 'refeed-opt', tekst: 'Langsom optrapning af ernæring' },
        ],
      },
    ],
  },
  {
    id: 'vaeske-nyrer',
    navn: 'Væske og nyrer',
    moduler: [
      {
        id: 'vaeske',
        navn: 'Væske og vandladning',
        husk: ['Drikker pt.?', 'Urinproduktion?', 'Ødemer eller tør?'],
        linjer: [
          { id: 'vaeskeskema', tekst: 'Væske- og vandladningsskema' },
          { id: 'vaegt', tekst: 'Daglig vægt' },
          { id: 'iv-vaeske', tekst: 'Rp. i.v. væske __ {} ml', valg: ['1000', '500', '2000'] },
          { id: 'skanning', tekst: 'Blærescanning mhp. resturin' },
          { id: 'kad', tekst: 'KAD – indikation revurderes dagligt' },
        ],
      },
      {
        id: 'nyrer',
        navn: 'Nyrefunktion',
        husk: ['Nyretal i bedring eller forværring?', 'Nefrotoksiske lægemidler?'],
        linjer: [
          { id: 'nyretal', tekst: 'Kreatinin, carbamid og elektrolytter i morgen' },
          { id: 'nefrotox', tekst: 'Pausér nefrotoksiske lægemidler (NSAID, ACE-hæmmer/ARB, diuretika) – genoptages ved stabil nyrefunktion' },
          { id: 'dosis-egfr', tekst: 'Medicin dosisjusteres efter eGFR' },
        ],
      },
    ],
  },
  {
    id: 'kognitivt',
    navn: 'Kognitivt',
    moduler: [
      {
        id: 'delir',
        navn: 'Delir',
        husk: ['Orienteret?', 'Ændret adfærd?', 'Delirfremkaldende medicin?'],
        linjer: [
          { id: 'delir-screen', tekst: 'Delirscreening (fx 4AT) x 1 dgl.' },
          { id: 'reorient', tekst: 'Reorientering, døgnrytme, briller og høreapparat' },
          { id: 'med-gennemgang', tekst: 'Medicingennemgang mhp. delirfremkaldende lægemidler' },
        ],
      },
    ],
  },
  {
    id: 'respiratorisk',
    navn: 'Respiratorisk',
    moduler: [
      {
        id: 'ilt',
        navn: 'Ilt og respiration',
        husk: ['Iltbehov stigende eller faldende?', 'KOL – risiko for CO₂-retention?'],
        linjer: [
          { id: 'ilt-mal', tekst: 'Ilt på næsekateter, mål-saturation {} %', valg: ['92–96', '88–92'] },
          { id: 'ilt-ud', tekst: 'Iltudtrapning efter saturation' },
          { id: 'salbutamol', tekst: 'Rp. salbutamol inhalation p.n.' },
          { id: 'pep', tekst: 'PEP-fløjte x {} dgl.', valg: ['3', '5'] },
          { id: 'cpap', tekst: 'CPAP ved behov – vurderes af __' },
          { id: 'fysio-resp', tekst: 'Fysioterapi mhp. respiration og mobilisering' },
        ],
      },
    ],
  },
  {
    id: 'cirkulatorisk',
    navn: 'Cirkulatorisk',
    moduler: [
      {
        id: 'kredslob',
        navn: 'Kredsløb',
        husk: ['Hypotension eller hypertension?', 'Væskestatus?', 'Antihypertensiva pauseret?'],
        linjer: [
          { id: 'bt', tekst: 'BT og puls x {} dgl.', valg: ['2', '3', '4'] },
          { id: 'ab-pause', tekst: 'Antihypertensiva pauseres ved systolisk BT < __' },
          { id: 'ekg', tekst: 'EKG i morgen' },
          { id: 'telemetri', tekst: 'Telemetri' },
        ],
      },
    ],
  },
  {
    id: 'koagulation',
    navn: 'Koagulation',
    moduler: [
      {
        id: 'tromboseprofylakse',
        navn: 'Tromboseprofylakse',
        husk: ['Risiko for venøs trombose?', 'Blødningsrisiko?', 'Allerede i AK-behandling?'],
        linjer: [
          { id: 'fragmin', tekst: 'Rp. Fragmin 5.000 IE s.c. x 1 dgl. under indlæggelse' },
          { id: 'ingen-prof', tekst: 'Ingen tromboseprofylakse pga. blødningsrisiko' },
          { id: 'ak-fortsat', tekst: 'Vanlig AK-behandling fortsættes' },
          { id: 'mobilisering', tekst: 'Tidlig mobilisering' },
        ],
      },
    ],
  },
  {
    id: 'endokrinologisk',
    navn: 'Endokrinologisk',
    moduler: [
      {
        id: 'diabetes',
        navn: 'Diabetes',
        husk: ['Type 1 eller 2?', 'BS-niveau de sidste døgn?', 'Spiser pt.?', 'Nyrefunktion ved metformin?'],
        linjer: [
          { id: 'bs', tekst: 'Rp. BS x {} dgl.', valg: ['3', '5', '7'] },
          { id: 'semglee', tekst: 'Rp. langtidsvirkende insulin (Semglee) __ IE x 1 dgl.' },
          { id: 'hurtig', tekst: 'Rp. hurtigvirkende insulin efter korrektionsskema' },
          { id: 'tablet', tekst: 'Vanlig tabletbehandling: __' },
          { id: 'metformin-pause', tekst: 'Metformin pauseres under indlæggelse' },
          { id: 'hba1c', tekst: 'HbA1c' },
        ],
      },
    ],
  },
  {
    id: 'udskrivelse',
    navn: 'Mobilisering og udskrivelse',
    moduler: [
      {
        id: 'udskrivelse',
        navn: 'Udskrivelse',
        husk: ['Funktionsniveau som før indlæggelse?', 'Hjemmepleje?', 'Opfølgning?'],
        linjer: [
          { id: 'fys-ergo', tekst: 'Fysio- og ergoterapeutisk vurdering' },
          { id: 'forventet-udskr', tekst: 'Forventet udskrivelse om {} døgn', valg: ['1–2', '2–3', '3–5'] },
          { id: 'egen-laege', tekst: 'Opfølgning hos egen læge: __' },
        ],
      },
    ],
  },
]
