// ============================================================
// HARIPRABODHAM KATHAMRUT — Content Data
// (All articles are added via the Feed page)
// ============================================================

const CATEGORIES = [
  { id: 'bhakti', name: 'ભક્તિ', slug: 'bhakti', description: 'ભક્તિ, ભજન અને ભગવાન પ્રત્યેની નિષ્ઠા' },
  { id: 'katha', name: 'કથા', slug: 'katha', description: 'ઐતિહાસિક અને ધાર્મિક કહાણીઓ' },
  { id: 'gyan', name: 'જ્ઞાન', slug: 'gyan', description: 'આત્મજ્ઞાન, ફિલોસોફી અને ઉપદેશ' },
  { id: 'charitra', name: 'ચરિત્ર', slug: 'charitra', description: 'સંત-ભક્તોના જીવન-ચરિત્ર' },
  { id: 'granth', name: 'ગ્રંથ', slug: 'granth', description: 'ભારતીય ગ્રંથ, શાસ્ત્ર અને પુરાણ' },
  { id: 'dhyan', name: 'ધ્યાન', slug: 'dhyan', description: 'ધ્યાન, મેડિટેશન અને યોગ સાધના' },
];

const TOPIC_LABELS = {
    mahima: 'મહિમા',
    atmiyata: 'આત્મીયતા',
    nishtha: 'નિષ્ઠા',
    seva: 'સેવા',
    bhagvadi: 'ભગવદી',
    bhakti: 'ભક્તિ/મહિમા',
    saralata: 'સરળતા',
    swadharm: 'સ્વધર્મ',
    swadhyay: 'સ્વાધ્યાય-ભજન',
    bhajan: 'ભજન/સ્વામિનારાયણ મહામંત્ર',
    svasarap: 'સ્વસારપ',
    vachanamrut: 'વચનામૃત',
    swamini: 'સ્વામીની વાતો',
    shikshapatri: 'શિક્ષાપત્રી',
    samagam: 'સમાગમ',
    'katha-varta': 'કથા-વાર્તા',
    'custom-topic-1773152608723': 'વિવેક',
    other: 'અન્ય',
};

const PRASANG_LABELS = {
    bhagwan: 'ભગવાન સ્વામિનારાયણ',
    gunatit: 'ગુણાતીતાનંદ સ્વામી',
    bhagatji: 'ભગતજી મહારાજ',
    yogiji: 'યોગીજી મહારાજ',
    shastriji: 'શાસ્ત્રીજી મહારાજ',
    hariprasad: 'હરિપ્રસાદ સ્વામીજી મહારાજ',
    prabodh: 'પ્રબોધ સ્વામીજી',
    bhakto: 'ભક્તો',
    prabhudasbhai: 'પ્રભુદાસભાઈ',
};

const ARTICLES = [];

const QUOTES = [
    { text: 'જ્ઞાન, ભક્તિ અને વૈરાગ્ય – ત્રણ ભક્તિના સ્તંભ', author: 'ગુરુહરી હરિપ્રસાદ સ્વામીજી મહારાજ' },
    { text: 'ભજન કરનારને ભગવાન ઝૂર મળે', author: 'ગુણાતીતાનંદ સ્વામી' },
    { text: 'મન શાંત હોય ત્યારે ઈશ્વર પ્રગટ થાય', author: 'યોગીજી મહારાજ' },
    { text: 'ભક્તિ જ જ્ઞાનની માતા', author: 'ગુરુહરી હરિપ્રસાદ સ્વામીજી મહારાજ' },
    { text: 'જે હરિનામ લે, તે ભવ-સાગર તરે', author: 'શાસ્ત્રીજી મહારાજ' }
];

