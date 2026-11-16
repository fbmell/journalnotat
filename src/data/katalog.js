// Katalog over plan-linjer til intern medicinsk stuegang.
//
// OBS: Moduler UDEN feltet `kilde` er EKSEMPLER og er ikke valideret mod
// behandlingsvejledninger. Moduler MED `kilde` er skrevet ud fra den nævnte
// retningslinje (titel, version, gældende fra).
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
        navn: 'Obstipation',
        kilde: {
          titel: 'Obstipation, regional retningslinje (Region Midtjylland)',
          version: '8',
          gaeldendeFra: '14-08-2026',
        },
        husk: [
          'Sidste afføring og Bristol-type? Spørg dagligt',
          'Obstiperende medicin: opioider, jern, diuretika, calcium, calciumantagonister, antidepressiva',
          'Væskeindtag og mobilisering',
          'Sterkoral diarré?',
          'Afføring i rektum? (rektaleksploration)',
          'Laksantia gives som udgangspunkt om aftenen – osmotisk først, peristaltikfremmende ved opioidudløst obstipation',
        ],
        linjer: [
          { id: 'movicol', tekst: 'Rp. macrogol (Movicol) 1 brev x {} dgl.', valg: ['1', '2', '3'] },
          { id: 'magnesia', tekst: 'Rp. magnesiumhydroxid (Magnesia) {} dgl. (obs. nyrefunktion)', valg: ['500 mg x 1', '1.000 mg x 1', '500 mg x 2', '1.000 mg x 2'] },
          { id: 'laktulose', tekst: 'Rp. laktulose {} dgl.', valg: ['10 ml x 1', '15 ml x 1', '10 ml x 2', '15 ml x 2'] },
          { id: 'laxoberal', tekst: 'Rp. natriumpicosulfat (Laxoberal) {} dråber x 1 dgl.', valg: ['10', '15', '20'] },
          { id: 'toilax-tabl', tekst: 'Rp. bisacodyl (Toilax) tabl. {} mg x 1 dgl.', valg: ['5', '10'] },
          { id: 'rektal', tekst: 'Ved afføring i rektum: {}', valg: ['Toilax rektalvæske 5 ml', 'Glyoktyl klysma 7,5 ml', 'olieklysma 250 ml'] },
          { id: 'akut-movicol', tekst: 'Akut udrensning: Movicol 8 breve i 1 liter vand over 6 timer' },
          { id: 'akut-picoprep', tekst: 'Akut udrensning: PicoPrep 1 brev i min. 1,5 dl væske, evt. gentaget efter 6–12 timer' },
          { id: 'tarmfunktion', tekst: 'Daglig observation af tarmfunktion (Bristol-skala)' },
          { id: 'vaeske-mob', tekst: 'Sikre tilstrækkeligt væskeindtag og mobilisering' },
          { id: 'med-obst', tekst: 'Medicingennemgang mhp. obstiperende lægemidler' },
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
        kilde: {
          titel: 'Tromboseprofylakse til medicinske patienter, AUH',
          version: '10',
          gaeldendeFra: '01-05-2025',
        },
        husk: [
          'Sengeliggende med tidligere VTE → profylakse, hvis ikke i AK-behandling og ingen kontraindikationer',
          'Overvej ved: kendt trombofili, paralytisk ben, aktiv cancer, betydende immobilisering, intensiv, alder > 60 år (som regel kun sammen med andre risikofaktorer)',
          'Blødningsrisiko? (nyre-/leverinsufficiens, trombocytter < 50, blødning < 3 mdr., aktivt ulcus)',
          'Mobilisering er vigtig profylakse',
          'Præparat, dosis og varighed dokumenteres',
        ],
        linjer: [
          { id: 'lmh', tekst: 'Rp. {} s.c. x 1 dgl. som tromboseprofylakse', valg: ['dalteparin 5.000 IE', 'enoxaparin 40 mg', 'tinzaparin 4.500 IE', 'fondaparinux 2,5 mg'] },
          { id: 'varighed', tekst: 'Tromboseprofylakse fortsættes til: __' },
          { id: 'mekanisk', tekst: 'Høj blødningsrisiko: ingen farmakologisk tromboseprofylakse, graduerede kompressionsstrømper' },
          { id: 'ingen-ind', tekst: 'Ikke indikation for tromboseprofylakse efter samlet vurdering af trombose- og blødningsrisiko' },
          { id: 'ak-fortsat', tekst: 'I forvejen i AK-behandling, som fortsættes' },
          { id: 'mobilisering', tekst: 'Mobilisering' },
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
