// =====================================================================
//  bible-api.js — Résolution de références bibliques Louis Segond 1910
//  API getBible (CORS ouvert, sans clé) :
//    - Query API : https://query.getbible.net/v2/ls1910/<reference>
//  La Query API accepte directement les noms de livres FRANÇAIS.
//  Exemple : https://query.getbible.net/v2/ls1910/Jean%203:16
// =====================================================================

const TRANSLATION = 'ls1910'; // Louis Segond (1910)
const QUERY_BASE = 'https://query.getbible.net/v2';

// Cache mémoire de session (évite de re-solliciter l'API)
const cache = new Map();

// ---------------------------------------------------------------------
// Numéros canoniques des livres (ordre protestant, 1 à 66) — utilisés
// pour les clés de cache et d'éventuels appels à la Main API.
// ---------------------------------------------------------------------
const NUMEROS_LIVRES = {
  'Genèse': 1, 'Exode': 2, 'Lévitique': 3, 'Nombres': 4, 'Deutéronome': 5,
  'Josué': 6, 'Juges': 7, 'Ruth': 8, '1 Samuel': 9, '2 Samuel': 10,
  '1 Rois': 11, '2 Rois': 12, '1 Chroniques': 13, '2 Chroniques': 14,
  'Esdras': 15, 'Néhémie': 16, 'Esther': 17, 'Job': 18, 'Psaumes': 19,
  'Proverbes': 20, 'Ecclésiaste': 21, 'Cantique des Cantiques': 22,
  'Ésaïe': 23, 'Jérémie': 24, 'Lamentations': 25, 'Ézéchiel': 26,
  'Daniel': 27, 'Osée': 28, 'Joël': 29, 'Amos': 30, 'Obadia': 31,
  'Jonas': 32, 'Michée': 33, 'Nahum': 34, 'Habacuc': 35, 'Sophonie': 36,
  'Aggée': 37, 'Zacharie': 38, 'Malachie': 39, 'Matthieu': 40, 'Marc': 41,
  'Luc': 42, 'Jean': 43, 'Actes des Apôtres': 44, 'Romains': 45,
  '1 Corinthiens': 46, '2 Corinthiens': 47, 'Galates': 48,
  'Éphésiens': 49, 'Philippiens': 50,
  'Colossiens': 51, '1 Thessaloniciens': 52, '2 Thessaloniciens': 53,
  '1 Timothée': 54, '2 Timothée': 55, 'Tite': 56, 'Philémon': 57,
  'Hébreux': 58, 'Jacques': 59, '1 Pierre': 60, '2 Pierre': 61,
  '1 Jean': 62, '2 Jean': 63, '3 Jean': 64, 'Jude': 65, 'Apocalypse': 66,
};


// Normalisation : variantes sans accents / abréviations → nom canonique
const CANONIQUE = {};
function enregistrer(...noms) {
  const canon = noms[0];
  for (const n of noms) {
    const cle = n
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\s.\-']/g, '');
    CANONIQUE[cle] = canon;
  }
}

enregistrer('Genèse', 'Genese', 'Gen', 'Gn');
enregistrer('Exode', 'Ex', 'Exo');
enregistrer('Lévitique', 'Levitique', 'Lev', 'Lv');
enregistrer('Nombres', 'Nom', 'Nb');
enregistrer('Deutéronome', 'Deutronome', 'Deut', 'Dt');
enregistrer('Josué', 'Josue', 'Jos');
enregistrer('Juges', 'Jug', 'Jg');
enregistrer('Ruth', 'Rt', 'Ru');
enregistrer('1 Samuel', '1Samuel', '1S', '1Sa');
enregistrer('2 Samuel', '2Samuel', '2S', '2Sa');
enregistrer('1 Rois', '1Rois', '1R');
enregistrer('2 Rois', '2Rois', '2R');
enregistrer('1 Chroniques', '1Chroniques', '1Ch');
enregistrer('2 Chroniques', '2Chroniques', '2Ch');
enregistrer('Esdras', 'Esd');
enregistrer('Néhémie', 'Nehemie', 'Neh');
enregistrer('Esther', 'Est');
enregistrer('Job', 'Jb');
enregistrer('Psaumes', 'Psaume', 'Ps', 'Psa');
enregistrer('Proverbes', 'Proverbe', 'Pr', 'Prov');
enregistrer('Ecclésiaste', 'Ecclesiaste', 'Eccl', 'Ec');
enregistrer('Cantique des Cantiques', 'Cantique', 'Ct');
enregistrer('Ésaïe', 'Esaie', 'Es', 'Esa');
enregistrer('Jérémie', 'Jeremie', 'Jer', 'Jr');
enregistrer('Lamentations', 'Lam');
enregistrer('Ézéchiel', 'Ezechiel', 'Eze', 'Ez');
enregistrer('Daniel', 'Dan', 'Dn');
enregistrer('Osée', 'Osee', 'Os');
enregistrer('Joël', 'Joel', 'Jl');
enregistrer('Amos', 'Am');
enregistrer('Abdias', 'Obadia', 'Obadiah', 'Ab', 'Ob');
enregistrer('Jonas', 'Jon');
enregistrer('Michée', 'Michee', 'Mi');
enregistrer('Nahum', 'Na');
enregistrer('Habacuc', 'Habakuk', 'Hab');
enregistrer('Sophonie', 'Sop');
enregistrer('Aggée', 'Agee', 'Ag');
enregistrer('Zacharie', 'Za');
enregistrer('Malachie', 'Mal');
enregistrer('Matthieu', 'Mt', 'Matt');
enregistrer('Marc', 'Mc', 'Mr');
enregistrer('Luc', 'Lc', 'Lu');
enregistrer('Jean', 'Jn', 'Jehan');
enregistrer('Actes des Apôtres', 'Actes', 'Acte', 'Ac', 'Act');
enregistrer('Romains', 'Rm', 'Rom');
enregistrer('1 Corinthiens', '1Corinthians', '1Corinthiens', '1Co', '1Cor');
enregistrer('2 Corinthiens', '2Corinthians', '2Corinthiens', '2Co', '2Cor');
enregistrer('Galates', 'Ga', 'Gal');
enregistrer('Éphésiens', 'Ephesiens', 'Eph');
enregistrer('Philippiens', 'Ph', 'Php', 'Phil');
enregistrer('Colossiens', 'Col');
enregistrer('1 Thessaloniciens', '1Thessaloniciens', '1Th', '1Thess');
enregistrer('2 Thessaloniciens', '2Thessaloniciens', '2Th', '2Thess');
enregistrer('1 Timothée', '1Timothee', '1Ti', '1Tim');
enregistrer('2 Timothée', '2Timothee', '2Ti', '2Tim');
enregistrer('Tite', 'Tit', 'Tt');
enregistrer('Philémon', 'Philemon', 'Phlm');
enregistrer('Hébreux', 'Hebreux', 'He', 'Heb');
enregistrer('Jacques', 'Jc', 'Jaq');
enregistrer('1 Pierre', '1Pierre', '1P', '1Pi');
enregistrer('2 Pierre', '2Pierre', '2P', '2Pi');
enregistrer('1 Jean', '1Jean', '1Jn');
enregistrer('2 Jean', '2Jean', '2Jn');
enregistrer('3 Jean', '3Jean', '3Jn');
enregistrer('Jude', 'Juda', 'Jd');
enregistrer('Apocalypse', 'Apocalyspe', 'Revelation', 'Apoc', 'Apo', 'Ap');

/**
 * Analyse une référence brute ("Jean 3:16", "1 Co 13:4", "psaume 23:1")
 * et retourne { livreCanonique, chapitre, verset, numeroLivre } ou null.
 */
export function analyserReference(brute) {
  if (!brute || typeof brute !== 'string') return null;

  const s = brute
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.;]/g, ':')
    .replace(/\s+/g, ' ')
    .trim();

  // "<livre> <chap>:<verset>" — le livre peut contenir un chiffre initial
  const m = s.match(/^(\d?\s?[A-Za-z]+(?:\s[A-Za-z]+)*)\s+(\d+)\s*:\s*(\d+)$/);
  if (!m) return null;

  const cleLivre = m[1].toLowerCase().replace(/[\s.\-']/g, '');
  const livreCanonique = CANONIQUE[cleLivre];
  if (!livreCanonique) return null;

  const chapitre = parseInt(m[2], 10);
  const verset = parseInt(m[3], 10);
  if (!chapitre || !verset) return null;

  return {
    livre: livreCanonique,
    chapitre,
    verset,
    numeroLivre: NUMEROS_LIVRES[livreCanonique] || null,
    referenceComplete: `${livreCanonique} ${chapitre}:${verset}`,
  };
}

/**
 * Nettoie le texte renvoyé par l'API (espaces fins, doubles espaces…).
 */
function nettoyerTexte(texte) {
  return (texte || '')
    .replace(/[\u2009\u202f\u00a0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Récupère le texte LSG d'une référence française.
 * @param {string} reference — ex : "Jean 3:16", "1 Co 13:4"
 * @returns {Promise<{livre, chapitre, verset, texte, referenceComplete}>}
 * @throws {Error} si la référence est invalide ou introuvable
 */
export async function recupererVerset(reference) {
  const analyse = analyserReference(reference);
  if (!analyse) {
    throw new Error(
      `Référence non reconnue : « ${reference} ». ` +
        `Format attendu : "Jean 3:16".`,
    );
  }

  const cleCache = analyse.referenceComplete;
  if (cache.has(cleCache)) return cache.get(cleCache);

  const url = `${QUERY_BASE}/${TRANSLATION}/${encodeURIComponent(
    analyse.referenceComplete,
  )}`;

  let data;
  try {
    const reponse = await fetch(url);
    if (!reponse.ok) {
      throw new Error(`API getBible indisponible (HTTP ${reponse.status}).`);
    }
    data = await reponse.json();
  } catch (err) {
    throw new Error(
      `Impossible de récupérer « ${analyse.referenceComplete} » : ${err.message}`,
    );
  }

  // La Query API renvoie { "<trans>_<livre>_<chap>": { verses: [...] } }
  const premier = data && Object.values(data)[0];
  const verses = (premier && premier.verses) || [];
  const trouve = verses.find((v) => v.verse === analyse.verset);

  if (!trouve) {
    throw new Error(
      `Verset introuvable : « ${analyse.referenceComplete} ».`,
    );
  }

  const resultat = {
    livre: analyse.livre,
    chapitre: analyse.chapitre,
    verset: analyse.verset,
    texte: nettoyerTexte(trouve.text),
    referenceComplete: trouve.name || analyse.referenceComplete,
  };

  cache.set(cleCache, resultat);
  return resultat;
}

/**
 * Formate une référence à partir de ses composants.
 */
export function formaterReference(livre, chapitre, verset) {
  return `${livre} ${chapitre}:${verset}`;
}
