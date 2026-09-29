import { avancerNiveau, estDue, compterDues, intervallePourNiveau, INTERVALLES_JOURS } from './src/spaced-repetition.js';
import { analyserReference, recupererVerset } from './src/bible-api.js';

let echecs = 0;
function ok(cond, label) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) echecs++;
}

// --- Algorithme de répétition espacée ---
ok(INTERVALLES_JOURS.join(',') === '1,3,7,14,30,90', 'intervalles 1/3/7/14/30/90');
ok(intervallePourNiveau(0) === 1 && intervallePourNiveau(5) === 90, 'intervallePourNiveau');

const carte0 = { niveau: 0 };
const r1 = avancerNiveau(carte0, true);
ok(r1.niveau === 1, 'succes N0 -> N1');
ok(r1.nombreSucces === 1 && r1.nombreEchecs === 0, 'compteurs succes');
const diff = (r1.prochaineRevision - r1.derniereRevision) / 86400000;
ok(Math.abs(diff - 3) < 0.05, 'prochaine revision N1 = +3 jours (obtenu ' + diff.toFixed(2) + ')');

let n = 0;
for (let i = 0; i < 10; i++) n = avancerNiveau({ niveau: n }, true).niveau;
ok(n === 5, 'plafond N5 (obtenu ' + n + ')');

const r2 = avancerNiveau({ niveau: 4, nombreSucces: 7 }, false);
ok(r2.niveau === 0 && r2.nombreEchecs === 1 && r2.nombreSucces === 7, 'echec -> N0 + compteur');
const d2 = (r2.prochaineRevision - r2.derniereRevision) / 86400000;
ok(Math.abs(d2 - 1) < 0.05, 'echec -> prochaine revision demain');

ok(estDue({ prochaineRevision: new Date(Date.now() - 1000) }), 'estDue passe');
ok(!estDue({ prochaineRevision: new Date(Date.now() + 86400000) }), 'estDue futur');
ok(compterDues([{ prochaineRevision: null }, { prochaineRevision: new Date(Date.now() - 5) }]) === 2, 'compterDues');

// --- Analyse de références ---
const cas = [
  ['Jean 3:16', 'Jean', 3, 16],
  ['1 Co 13:4', '1 Corinthiens', 13, 4],
  ['1 corinthiens 13:4', '1 Corinthiens', 13, 4],
  ['Ps 23:1', 'Psaumes', 23, 1],
  ['psaume 91:1', 'Psaumes', 91, 1],
  ['Romains 12:2', 'Romains', 12, 2],
  ['1 Jean 1:9', '1 Jean', 1, 9],
  ['1Jn 1:9', '1 Jean', 1, 9],
  ['Mt 5:44', 'Matthieu', 5, 44],
  ['esaie 41:10', 'Ésaïe', 41, 10],
  ['Actes 2:4', 'Actes des Apôtres', 2, 4],
  ['Gen 1:1', 'Genèse', 1, 1],
  ['Ab 1:4', 'Abdias', 1, 4],
];
for (const [ref, livre, ch, v] of cas) {
  const a = analyserReference(ref);
  ok(a && a.livre === livre && a.chapitre === ch && a.verset === v,
    `analyse "${ref}" -> ${livre} ${ch}:${v} (obtenu ${a ? a.livre + ' ' + a.chapitre + ':' + a.verset : 'null'})`);
}
ok(analyserReference('invalide') === null, 'reference invalide -> null');
ok(analyserReference('Foo 3:16') === null, 'livre inconnu -> null');

// --- Appels réels API getBible ---
try {
  const v = await recupererVerset('Jean 3:16');
  ok(v.texte.startsWith('Car Dieu a tant aimé'), 'API Jean 3:16 (obtenu: ' + v.texte.slice(0, 40) + '...)');
  ok(v.referenceComplete === 'Jean 3:16', 'referenceComplete');
} catch (e) { ok(false, 'API Jean 3:16 -> ' + e.message); }

try {
  const v = await recupererVerset('1 co 13:4');
  ok(v.texte.includes('charité') || v.texte.length > 20, 'API 1 Co 13:4 (obtenu: ' + v.texte.slice(0, 40) + '...)');
} catch (e) { ok(false, 'API 1 Co 13:4 -> ' + e.message); }

try { await recupererVerset('Matthieu 999:1'); ok(false, 'verset inexistant doit lever'); }
catch (e) { ok(true, 'verset inexistant leve une erreur'); }

console.log(echecs === 0 ? '\nTOUS LES TESTS PASSENT ✓' : `\n${echecs} TEST(S) EN ÉCHEC ✗`);
process.exit(echecs ? 1 : 0);
