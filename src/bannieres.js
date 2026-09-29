// =====================================================================
//  bannieres.js — Images locales du projet en bannières de sections
//  Chaque bannière associe l'image photo (fond, overlay dégradé sombre)
//  et une illustration SVG de repli si le fichier est absent.
//  Crédits : photos Unsplash (jannis-nobauer, nik-shuliahin, nate-steele).
// =====================================================================

// Illustrations SVG de repli (proviennent de profil.js)
import { couvertureSVG } from './profil.js';

/**
 * Fichiers images du dossier du projet (racine, à côté d'index.html).
 * Si vous renommez les fichiers, mettez à jour ces chemins.
 */
export const IMAGES = {
  revision: './jannis-nobauer-qls4Edt9UbE-unsplash.jpg',   // lumière dans les nuages
  entrainement: './nik-shuliahin-AXos3O7fRGk-unsplash.jpg', // bible ouverte
  classement: './nate-steele-FPdkDrq9X-4-unsplash.jpg',     // assemblée
};

// Illustration SVG associée à chaque section (repli élégant)
const REPLI_SVG = {
  revision: 'aurore',
  entrainement: 'manuscrit',
  classement: 'nuit',
};

/**
 * Vérifie qu'un fichier image existe (promesse résolue : true/false).
 */
function imageDisponible(url) {
  return new Promise((resoudre) => {
    const img = new Image();
    img.onload = () => resoudre(true);
    img.onerror = () => resoudre(false);
    img.src = url;
  });
}

// Cache des vérifications (une seule requête par image, par session)
const disponibilite = new Map();

/**
 * Construit une bannière complète : photo en fond + overlay dégradé,
 * repli SVG si l'image est absente, contenu (titre + mention) par-dessus.
 *
 * @param {string} section   'revision' | 'entrainement' | 'classement'
 * @param {string} titre     Titre affiché (texte ivoire sur l'overlay)
 * @param {string} [mention] Sous-titre affiché
 * @param {{compacte?: boolean}} [options]
 * @returns {Promise<string>} HTML de la bannière
 */
export async function banniereHTML(section, titre, mention = '', options = {}) {
  const url = IMAGES[section];
  const dispo = url
    ? await (disponibilite.has(url) ? disponibilite.get(url) : (() => {
        const p = imageDisponible(url);
        disponibilite.set(url, p);
        return p;
      })())
    : false;

  const repli = couvertureSVG(REPLI_SVG[section] || 'aurore');
  const photo = dispo ? `<img class="banniere-photo chargee" src="${url}" alt="" />` : '';
  const voile = dispo ? '<div class="banniere-voile"></div>' : '';

  return `
    <header class="banniere ${options.compacte ? 'banniere-compacte' : ''}">
      ${repli}
      ${photo}
      ${voile}
      <div class="banniere-contenu">
        <h2 class="titre-vue">${titre}</h2>
        ${mention ? `<p class="mention-vue">${mention}</p>` : ''}
      </div>
    </header>`;
}

/**
 * Version synchrone : la photo est insérée avec opacité 0 puis fondue
 * dès qu'elle est vérifiée — utile pour les contenus déjà rendus.
 *
 * @param {string} section
 * @param {string} titre
 * @param {string} [mention]
 * @returns {string} HTML (la photo apparaît en fondu si présente)
 */
export function banniereHTMLSync(section, titre, mention = '') {
  const url = IMAGES[section];
  const repli = couvertureSVG(REPLI_SVG[section] || 'aurore');
  const photo = url
    ? `<img class="banniere-photo" src="${url}" alt="" data-banniere="${section}" />`
    : '';
  return `
    <header class="banniere">
      ${repli}
      ${photo}
      <div class="banniere-voile"></div>
      <div class="banniere-contenu">
        <h2 class="titre-vue">${titre}</h2>
        ${mention ? `<p class="mention-vue">${mention}</p>` : ''}
      </div>
    </header>`;
}

/**
 * À appeler après insertion du HTML synchrone : vérifie chaque image
 * et déclenche le fondu (ou laisse le repli SVG si absente).
 */
export function activerBannieres() {
  document.querySelectorAll('img[data-banniere]').forEach((img) => {
    const url = img.src;
    if (!disponibilite.has(url)) {
      disponibilite.set(url, imageDisponible(url));
    }
    disponibilite.get(url).then((dispo) => {
      if (dispo) img.classList.add('chargee');
      else img.remove(); // le repli SVG reste visible
    });
  });
}
