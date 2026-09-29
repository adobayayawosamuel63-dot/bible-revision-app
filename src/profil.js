// =====================================================================
//  profil.js — Identité, niveaux et suivi de progression (module pur)
//  Aucune dépendance : consommé par app.js (vue Profil + Classement).
// =====================================================================

// ---------------------------------------------------------------------
// Avatars : identifiants → initiale + duo de couleurs (aucun upload requis)
// ---------------------------------------------------------------------
export const AVATARS = {
  aurore:    { fond: '#c9a227', texte: '#fffdf5', lettres: 'A' },
  olive:     { fond: '#6b7f3f', texte: '#f7f4e9', lettres: 'O' },
  bordeaux:  { fond: '#6d1f2c', texte: '#f9efe7', lettres: 'B' },
  nuit:      { fond: '#1e2a4a', texte: '#e8ecf6', lettres: 'N' },
  ambré:     { fond: '#b45309', texte: '#fff8ec', lettres: 'V' },
  sauge:     { fond: '#5f7470', texte: '#f2f5f3', lettres: 'S' },
};

export const LISTE_AVATARS = Object.keys(AVATARS);

/**
 * Rend l'avatar d'un utilisateur en SVG inline (initiale sur disque coloré).
 * @param {object} profil — document /users/{uid}
 * @param {number} [taille=48]
 * @returns {string} HTML
 */
export function avatarSVG(profil, taille = 48) {
  const cle = profil?.avatar && AVATARS[profil.avatar] ? profil.avatar : 'aurore';
  const palette = AVATARS[cle];
  const nom = String(profil?.displayName || profil?.email || '?').trim();
  const initiale = (nom[0] || '?').toUpperCase();
  // Si l'utilisateur a téléversé une vraie photo, on l'affiche
  if (profil?.photoURL) {
    return `<img class="avatar-img" src="${profil.photoURL}" alt=""
              style="width:${taille}px;height:${taille}px;border-radius:50%;object-fit:cover" />`;
  }
  return `
    <span class="avatar-disque" aria-hidden="true" style="
      width:${taille}px;height:${taille}px;border-radius:50%;
      background:${palette.fond};color:${palette.texte};
      display:inline-flex;align-items:center;justify-content:center;
      font-family:'Playfair Display',Georgia,serif;
      font-weight:700;font-size:${Math.round(taille * 0.44)}px;
      box-shadow:0 1px 4px rgba(35,41,58,.25)">
      ${initiale}
    </span>`;
}

// ---------------------------------------------------------------------
// Couvertures de profil : illustrations SVG thématiques inline
// (paysages bibliques sobres — aucune image distante, aucune licence)
// ---------------------------------------------------------------------
function svgAurore() {
  return `<svg class="illustration-couverture" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="800" height="200" fill="#f4ead0"/>
    <circle cx="620" cy="150" r="90" fill="#e3c86b" opacity=".8"/>
    <circle cx="620" cy="150" r="140" fill="#e3c86b" opacity=".35"/>
    <path d="M0 170 L180 90 L320 150 L470 70 L640 140 L800 95 L800 200 L0 200 Z" fill="#c9a227" opacity=".28"/>
    <path d="M0 190 L220 130 L420 180 L600 120 L800 165 L800 200 L0 200 Z" fill="#8a6d1d" opacity=".35"/>
    <g stroke="#b48f1f" stroke-width="1.4" opacity=".5">
      <path d="M120 60 l6 12 M200 40 l6 12 M300 55 l6 12 M430 35 l6 12"/>
    </g>
  </svg>`;
}

function svgManuscrit() {
  return `<svg class="illustration-couverture" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="800" height="200" fill="#efe4c9"/>
    <g opacity=".5" fill="#8a6d1d">
      <rect x="90" y="40" width="620" height="120" rx="6" fill="#faf5e6" stroke="#d4c8a8"/>
      <path d="M130 75 h260 M130 95 h300 M130 115 h240 M130 135 h280" stroke="#b49b58" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cx="620" cy="100" r="26" fill="none" stroke="#c9a227" stroke-width="2.5"/>
      <path d="M620 74 v52 M594 100 h52" stroke="#c9a227" stroke-width="1.6"/>
    </g>
  </svg>`;
}

function svgNuitEtoilee() {
  return `<svg class="illustration-couverture" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="800" height="200" fill="#1e2a4a"/>
    <g fill="#e8ecf6">
      <circle cx="80" cy="40" r="1.8"/><circle cx="180" cy="70" r="1.3"/>
      <circle cx="300" cy="30" r="2"/><circle cx="420" cy="60" r="1.4"/>
      <circle cx="520" cy="25" r="1.7"/><circle cx="640" cy="55" r="1.3"/>
      <circle cx="720" cy="35" r="2"/><circle cx="240" cy="95" r="1.2"/>
      <circle cx="580" cy="90" r="1.6"/><circle cx="680" cy="105" r="1.1"/>
    </g>
    <path d="M0 165 L160 110 L300 150 L460 95 L620 145 L800 100 L800 200 L0 200 Z" fill="#141d36"/>
    <path d="M400 28 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill="#e3c86b"/>
  </svg>`;
}

function svgOlivier() {
  return `<svg class="illustration-couverture" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="800" height="200" fill="#eef0e2"/>
    <path d="M0 160 Q200 120 400 155 T800 150 L800 200 L0 200 Z" fill="#c6cd9e"/>
    <g stroke="#6b7f3f" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85">
      <path d="M400 160 v-55 M400 118 q-34 -16 -48 -44 M400 112 q30 -20 40 -50"/>
    </g>
    <g fill="#8aa05a" opacity=".9">
      <ellipse cx="352" cy="70" rx="26" ry="15"/><ellipse cx="445" cy="58" rx="24" ry="14"/>
      <ellipse cx="402" cy="100" rx="30" ry="14"/>
    </g>
    <circle cx="680" cy="55" r="34" fill="#e3c86b" opacity=".9"/>
  </svg>`;
}

export const COUVERTURES = {
  aurore:    { libelle: 'Aurore dorée', svg: svgAurore },
  manuscrit: { libelle: 'Manuscrit ancien', svg: svgManuscrit },
  nuit:      { libelle: 'Nuit étoilée', svg: svgNuitEtoilee },
  olivier:   { libelle: 'Olivier', svg: svgOlivier },
};

export const LISTE_COUVERTURES = Object.keys(COUVERTURES);

/**
 * Rend l'illustration de couverture choisie (ou celle par défaut).
 * @param {string} cle
 * @returns {string} HTML
 */
export function couvertureSVG(cle) {
  const fabrique = COUVERTURES[cle]?.svg || svgAurore;
  return fabrique();
}

// ---------------------------------------------------------------------
// Niveaux spirituels évolutifs
// ---------------------------------------------------------------------
export const NIVEAUX = [
  { seuil: 0,   nom: 'Disciple',  icone: 'semis' },
  { seuil: 5,   nom: 'Serviteur', icone: 'lampe' },
  { seuil: 15,  nom: 'Pilier',    icone: 'colonne' },
  { seuil: 30,  nom: 'Érudit',    icone: 'rouleau' },
  { seuil: 60,  nom: 'Sagesse',   icone: 'couronne' },
];

/**
 * Détermine le niveau atteint pour un nombre de versets appris.
 * @param {number} versetsAppris
 * @returns {{nom: string, icone: string, suivant: string|null, reste: number}}
 */
export function niveauDe(versetsAppris) {
  let courant = NIVEAUX[0];
  for (const n of NIVEAUX) if (versetsAppris >= n.seuil) courant = n;
  const suivant = NIVEAUX.find((n) => n.seuil > versetsAppris) || null;
  return {
    nom: courant.nom,
    icone: courant.icone,
    suivant: suivant?.nom || null,
    reste: suivant ? suivant.seuil - versetsAppris : 0,
  };
}

// ---------------------------------------------------------------------
// Points : réussite validée = +10, échec assumé = +2 (l'effort compte)
// ---------------------------------------------------------------------
export const POINTS_REUSSITE = 10;
export const POINTS_EFFORT = 2;

// ---------------------------------------------------------------------
// Série de jours consécutifs (streak) — dates au format ISO "YYYY-MM-DD"
// ---------------------------------------------------------------------
function aujourdHuiISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hierISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Calcule la nouvelle série après une activité aujourd'hui.
 * - série déjà comptée aujourd'hui → inchangée ;
 * - activité hier → série +1 ;
 * - sinon → série repart à 1.
 * @param {{serieJours?: number, dernierJour?: string}} progression
 * @returns {{serieJours: number, dernierJour: string}}
 */
export function avancerSerie(progression = {}) {
  const aujourdhui = aujourdHuiISO();
  if (progression.dernierJour === aujourdhui) {
    return { serieJours: progression.serieJours || 0, dernierJour: aujourdhui };
  }
  const suite = progression.dernierJour === hierISO()
    ? (progression.serieJours || 0) + 1
    : 1;
  return { serieJours: suite, dernierJour: aujourdhui };
}
