// =====================================================================
//  spaced-repetition.js — Algorithme de répétition espacée (helper)
//  Variante simplifiée Leitner / Anki, isolée de toute dépendance
//  (aucun import Firebase) pour rester testable et réutilisable.
// =====================================================================

// Intervalles (en jours) par niveau : N0 → N5
export const INTERVALLES_JOURS = [1, 3, 7, 14, 30, 90];

export const NIVEAU_MAX = 5;
export const NIVEAU_MIN = 0;

/**
 * Retourne l'intervalle en jours associé à un niveau.
 * @param {number} niveau - niveau actuel (0 à 5)
 * @returns {number} intervalle en jours
 */
export function intervallePourNiveau(niveau) {
  const n = Math.min(Math.max(Number(niveau) || 0, NIVEAU_MIN), NIVEAU_MAX);
  return INTERVALLES_JOURS[n];
}

/**
 * Calcule une date exactement n jours plus tard (même heure), afin que
 * l'intervalle réel entre deux révisions corresponde à +N jours.
 * @param {number} jours
 * @param {Date} [depuis=new Date()]
 * @returns {Date}
 */
export function dateDansJours(jours, depuis = new Date()) {
  const d = new Date(depuis.getTime());
  d.setDate(d.getDate() + jours);
  return d;
}

/**
 * Calcule le prochain état d'un verset après une révision.
 *
 * @param {object} carte      - progression actuelle
 * @param {number} carte.niveau
 * @param {number} [carte.nombreSucces=0]
 * @param {number} [carte.nombreEchecs=0]
 * @param {boolean} succes    - true = réussi, false = à revoir
 * @param {Date}   [maintenant=new Date()]
 * @returns {{niveau: number, prochaineRevision: Date, derniereRevision: Date,
 *          nombreSucces: number, nombreEchecs: number}}
 */
export function avancerNiveau(carte, succes, maintenant = new Date()) {
  const succesAvant = carte.nombreSucces || 0;
  const echecsAvant = carte.nombreEchecs || 0;

  if (succes) {
    const nouveauNiveau = Math.min(
      (Number(carte.niveau) || 0) + 1,
      NIVEAU_MAX,
    );
    return {
      niveau: nouveauNiveau,
      prochaineRevision: dateDansJours(
        intervallePourNiveau(nouveauNiveau),
        maintenant,
      ),
      derniereRevision: maintenant,
      nombreSucces: succesAvant + 1,
      nombreEchecs: echecsAvant,
    };
  }

  // Échec : retour au niveau 0, prochaine révision demain (+1 jour)
  return {
    niveau: NIVEAU_MIN,
    prochaineRevision: dateDansJours(1, maintenant),
    derniereRevision: maintenant,
    nombreSucces: succesAvant,
    nombreEchecs: echecsAvant + 1,
  };
}

/**
 * Vérifie si une carte est due pour révision maintenant.
 * @param {object} carte
 * @param {Date|import('firebase/firestore').Timestamp|string|number} carte.prochaineRevision
 * @param {Date} [maintenant=new Date()]
 * @returns {boolean}
 */
export function estDue(carte, maintenant = new Date()) {
  return nouvelleDate(carte.prochaineRevision) <= maintenant;
}

/**
 * Convertit les différents formats de date (Timestamp Firestore, ISO,
 * Date, null) en Date JS valide. Les cartes sans date sont toujours dues.
 * @param {*} valeur
 * @returns {Date}
 */
export function nouvelleDate(valeur) {
  if (!valeur) return new Date(0); // due immédiatement
  if (typeof valeur.toDate === 'function') return valeur.toDate();
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Formate une date pour l'affichage (fr-FR).
 * @param {*} valeur
 * @returns {string}
 */
export function formaterDate(valeur) {
  if (!valeur) return '—';
  return nouvelleDate(valeur).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Compte le nombre de cartes dues parmi une liste.
 * @param {Array<object>} cartes
 * @param {Date} [maintenant=new Date()]
 * @returns {number}
 */
export function compterDues(cartes, maintenant = new Date()) {
  return cartes.filter((c) => estDue(c, maintenant)).length;
}

/**
 * Trie les cartes par priorité de révision (les plus en retard d'abord).
 * @param {Array<object>} cartes
 * @returns {Array<object>}
 */
export function trierParEcheance(cartes) {
  return [...cartes].sort(
    (a, b) =>
      nouvelleDate(a.prochaineRevision) - nouvelleDate(b.prochaineRevision),
  );
}
