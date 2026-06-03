// Outil de DEV (jetable) : sonde la structure JSON de l'API La Table des Savoirs.
// Le token est lu dans l'env (jamais en dur). Exemple :
//   $env:LTDS_API_TOKEN='...'; node scripts/probe-ltds.mjs facile 98
const token = process.env.LTDS_API_TOKEN;
const base = process.env.LTDS_API_BASE_URL || 'https://api.latabledessavoirs.fr';
const level = process.argv[2] || 'facile';
const day = process.argv[3] || '98';

if (!token) {
  console.error('LTDS_API_TOKEN manquant.');
  process.exit(1);
}

const url = `${base}/game/${level}/${day}`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
});
console.log('GET', url);
console.log('HTTP', res.status, res.statusText);

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.log('Réponse non-JSON, 600 premiers caractères :\n', text.slice(0, 600));
  process.exit(0);
}

const keysOf = (o) => (o && typeof o === 'object' ? Object.keys(o) : typeof o);

console.log('\nTOP type:', Array.isArray(data) ? 'array' : typeof data);
console.log('TOP keys:', keysOf(data));

const day0 = data.day ?? data;
console.log('\nday keys:', keysOf(day0));

const questions = day0.questions ?? data.questions;
console.log('\nquestions length:', Array.isArray(questions) ? questions.length : '(aucune)');
if (Array.isArray(questions) && questions.length) {
  console.log('Q0 keys:', keysOf(questions[0]));
  console.log('Q0 sample:\n', JSON.stringify(questions[0], null, 2).slice(0, 1800));
}

console.log('\nday meta:', {
  name: day0.name,
  dayNumber: day0.dayNumber,
  difficulty: day0.difficulty,
  totalQuestions: day0.totalQuestions,
});
console.log('\nday.results type:', Array.isArray(day0.results) ? 'array' : typeof day0.results);
console.log('day.results keys:', keysOf(day0.results));
const qr = day0.results?.questionResults ?? data.results?.questionResults;
console.log('\nquestionResults type:', Array.isArray(qr) ? `array[${qr.length}]` : typeof qr);
if (qr) console.log('questionResults dump:\n', JSON.stringify(qr, null, 2).slice(0, 2600));
