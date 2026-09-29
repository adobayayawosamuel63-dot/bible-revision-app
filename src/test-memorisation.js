// =====================================================================
//  test-memorisation.js — Épreuves de mémorisation (module pur)
//  Double validation : un verset n'est validé qu'après la réussite de
//  DEUX épreuves différentes à 100 % (saisie mot à mot + reconstitution
//  dans l'ordre, ou test d'initiales). Aucune dépendance Firebase.
// =====================================================================

/**
 * Normalise un texte pour comparaison stricte : accents retirés,
 * ponctuation neutralisée, casse uniforme, espaces compactés.
 * @param {string} texte
 * @returns {string}
 */
export function normaliserTexte(texte) {
  return String(texte || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Découpe un texte en mots (la ponctuation reste collée au mot,
 * la comparaison passe toujours par normaliserTexte).
 * @param {string} texte
 * @returns {string[]}
 */
export function motsDe(texte) {
  return String(texte || '').split(/\s+/).filter(Boolean);
}

/**
 * Compare une saisie au texte attendu, mot à mot et dans l'ordre.
 * @param {string} saisi
 * @param {string} attendu
 * @returns {{exact: boolean, pct: number}} pct = correspondances
 *          positionnelles (feedback), exact = validation à 100 %.
 */
export function comparerSaisie(saisi, attendu) {
  const a = normaliserTexte(saisi);
  const b = normaliserTexte(attendu);
  if (!a || !b) return { exact: false, pct: 0 };

  const motsSaisis = a.split(' ');
  const motsAttendus = b.split(' ');
  const total = Math.max(motsSaisis.length, motsAttendus.length);

  let correspondances = 0;
  for (let i = 0; i < total; i++) {
    if (motsSaisis[i] === motsAttendus[i]) correspondances++;
  }

  return {
    exact: a === b,
    pct: Math.round((correspondances / total) * 100),
  };
}

/**
 * Initiales majuscules de chaque mot — support du test d'initiales.
 * @param {string} texte
 * @returns {string} ex : "Car Dieu a aimé" → "C D A A"
 */
export function initialesDe(texte) {
  return motsDe(texte)
    .map((mot) => {
      const lettre = mot.match(/\p{L}/u);
      return lettre ? lettre[0].toUpperCase() : '•';
    })
    .join(' ');
}

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) — un même
 * verset donne toujours le même mélange pour une graine donnée,
 * ce qui évite que les blocs changent à chaque re-rendu.
 * @param {number} graine
 * @returns {() => number}
 */
function generateur(graine) {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mélange les mots d'un verset pour l'épreuve de reconstitution.
 * @param {string} texte
 * @param {number} [graine] — graine déterministe (ex : hash du verset)
 * @returns {{id: number, mot: string}[]} blocs avec identifiants stables
 */
export function melangerBlocs(texte, graine = Date.now()) {
  const mots = motsDe(texte);
  const blocs = mots.map((mot, id) => ({ id, mot }));
  if (blocs.length < 2) return blocs;

  const alea = generateur(graine);
  const original = blocs.map((b) => b.mot).join(' ');

  // Mélange de Fisher-Yates
  for (let i = blocs.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [blocs[i], blocs[j]] = [blocs[j], blocs[i]];
  }

  // Si le mélange reproduit l'ordre original, on pivote d'un cran
  if (blocs.map((b) => b.mot).join(' ') === original) {
    blocs.push(blocs.shift());
  }
  return blocs;
}

/**
 * Graine déterministe à partir d'une chaîne (hash simple).
 * @param {string} chaine
 * @returns {number}
 */
export function graineDe(chaine) {
  let h = 2166136261;
  for (let i = 0; i < chaine.length; i++) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Épreuves disponibles et leur libellé français.
 */
export const EPREUVES = {
  saisie: 'Saisie mot à mot',
  blocs: 'Reconstitution dans l\'ordre',
  initiales: 'Test d\'initiales',
};

/**
 * Séquence de validation imposée : 2 épreuves différentes.
 * Tant que les deux ne sont pas réussies à 100 %, la validation
 * du verset reste verrouillée côté interface.
 */
export const SEQUENCE_VALIDATION = ['saisie', 'blocs'];

/**
 * Comportement d'interface attendu (implémenté dans app.js) :
 * dès que l'utilisateur modifie le champ de saisie (événement 'input'),
 * la correction affichée est EFFACÉE automatiquement ; elle ne
 * réapparaît qu'au prochain clic sur « Vérifier ma saisie ».
 */
