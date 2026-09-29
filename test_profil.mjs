import { niveauDe, avancerSerie, avatarSVG, couvertureSVG, LISTE_AVATARS, LISTE_COUVERTURES } from './src/profil.js';
let echecs = 0;
const ok = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' - ' + l); if (!c) echecs++; };

ok(niveauDe(0).nom === 'Disciple', '0 verset -> Disciple');
ok(niveauDe(4).nom === 'Disciple' && niveauDe(5).nom === 'Serviteur', '5 versets -> Serviteur');
ok(niveauDe(15).nom === 'Pilier' && niveauDe(30).nom === 'Érudit', '15 -> Pilier, 30 -> Érudit');
ok(niveauDe(60).nom === 'Sagesse' && niveauDe(999).suivant === null, '60+ -> Sagesse (max)');
ok(niveauDe(4).reste === 1, 'reste avant niveau suivant');

const s1 = avancerSerie({ serieJours: 4, dernierJour: hier() });
ok(s1.serieJours === 5, 'hier -> série +1 (obtenu ' + s1.serieJours + ')');
const s2 = avancerSerie({ serieJours: 4, dernierJour: aujourdhui() });
ok(s2.serieJours === 4, 'même jour -> série inchangée');
const s3 = avancerSerie({ serieJours: 7, dernierJour: '2026-01-01' });
ok(s3.serieJours === 1, 'rupture -> série à 1');
ok(avancerSerie({}).serieJours === 1, 'premier jour -> série à 1');

function dISO(dec) { const d = new Date(); d.setDate(d.getDate() + dec); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function hier() { return dISO(-1); }
function aujourdhui() { return dISO(0); }

ok(avatarSVG({ displayName: 'Samuel', avatar: 'nuit' }).includes('S'), 'avatar contient l initiale');
ok(couvertureSVG('nuit').includes('#1e2a4a'), 'couverture nuit rendue');
ok(LISTE_AVATARS.length >= 6 && LISTE_COUVERTURES.length >= 4, 'catalogues avatar/couverture complets');
console.log(echecs === 0 ? 'TESTS PROFIL : TOUS PASSSENT' : echecs + ' ECHEC(S)');
process.exit(echecs ? 1 : 0);
