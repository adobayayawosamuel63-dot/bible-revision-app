// =====================================================================
//  app.js — Application principale (SPA, interface 100 % française)
//  Révision à double épreuve, entraînement libre, profil social,
//  classement. Firebase est importé dynamiquement (démarrage < 1 s).
// =====================================================================

import {
  avancerNiveau, estDue, compterDues, trierParEcheance,
  formaterDate, nouvelleDate, INTERVALLES_JOURS,
} from './spaced-repetition.js';
import { recupererVerset } from './bible-api.js';
import {
  comparerSaisie, initialesDe, melangerBlocs, graineDe,
  SEQUENCE_VALIDATION, EPREUVES,
} from './test-memorisation.js';
import {
  avatarSVG, couvertureSVG, LISTE_AVATARS, LISTE_COUVERTURES,
  COUVERTURES, niveauDe, avancerSerie, POINTS_REUSSITE,
} from './profil.js';
import { initTermine, ensureUserProfile, FONDATEUR_EMAIL } from './firebase-config.js';
import { banniereHTMLSync, activerBannieres, IMAGES } from './bannieres.js';

// =====================================================================
// ÉTAT GLOBAL
// =====================================================================
let db = null;
let auth = null;
const etatSession = { user: null, profil: null, ready: false };
const observateurs = new Set();

function notifier() { for (const cb of observateurs) cb({ ...etatSession }); }
function observerSession(cb) { observateurs.add(cb); cb({ ...etatSession }); return () => observateurs.delete(cb); }

function roleCourant() { return etatSession.profil?.role || (etatSession.user ? 'user' : null); }
function estAdmin() { return ['admin', 'super_admin'].includes(roleCourant()); }
function estSuperAdmin() { return roleCourant() === 'super_admin'; }

// ---------------------------------------------------------------------
// Icônes SVG sobres (trait fin)
// ---------------------------------------------------------------------
const icone = {
  livre: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  recherche: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  verrou: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  coche: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  alerte: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5h.01"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  refaire: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  refresh: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>`,
  spinner: `<svg class="spinner-btn" width="16" height="16" viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="20" stroke="currentColor" stroke-width="5" stroke-dasharray="90 40"/></svg>`,
  hamburger: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  croix: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  flamme: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-7 0-3-2-5.5-3.5-7C14 6 13 4 13 2c-3 2-4.5 4.5-4.5 7 0 1.5.5 2.5.5 2.5S7 10 6.5 8C5 9.8 5 12 5 13c0 4.2 3 7 7 9z"/></svg>`,
  trophée: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1"/></svg>`,
  étoile: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6.5 7 .8-5.2 4.7 1.4 6.9L12 17.5 5.8 20.9l1.4-6.9L2 9.3l7-.8L12 2z"/></svg>`,
  couronne: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.28-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.28 3.67a1 1 0 0 0 1.51-.3z"/><path d="M5 21h14"/></svg>`,
};

// ---------------------------------------------------------------------
// Helpers DOM
// ---------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

function echapper(t) {
  return String(t ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function toast(message, type = 'info') {
  const zone = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const svg = type === 'succes' ? icone.coche : type === 'erreur' ? icone.alerte : icone.info;
  el.innerHTML = `${svg}<span>${echapper(message)}</span>`;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function normaliser(t) {
  return String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// =====================================================================
// ROUTEUR + NAVIGATION (barre desktop / tiroir hamburger mobile)
// =====================================================================
let vueActive = 'revision';

const TITRES = {
  revision: ['Salle de révision', 'Deux épreuves réussies sont requises pour valider chaque verset.'],
  catalogue: ['Catalogue global', 'Ajoutez des versets partagés à votre carnet de mémorisation.'],
  entrainement: ['Entraînement libre', 'Refaites les épreuves de vos versets acquis, sans impact sur votre progression.'],
  profil: ['Mon profil', 'Personnalisez votre identité et suivez votre parcours.'],
  classement: ['Classement', 'Comparez versets appris, série de jours et points avec les autres membres.'],
  suivi: ['Suivi des membres', 'Tableau de bord de progression de toute la communauté.'],
  admin: ['Gestion des versets', 'Publiez ou retirez des versets du catalogue global.'],
  superadmin: ['Gestion des comptes', 'Attribuez les rôles des membres de la communauté.'],
};

function naviguer(vue) {
  vueActive = vue;
  document.querySelectorAll('.vue').forEach((v) => v.classList.add('hidden'));
  $(`#vue-${vue}`)?.classList.remove('hidden');
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.classList.toggle('onglet-actif', b.dataset.nav === vue);
  });
  fermerTiroir();
  document.querySelectorAll('.menu-deroulant.ouvert').forEach((m) => m.classList.remove('ouvert'));
  const rendus = {
    revision: rendreRevision, catalogue: rendreCatalogue,
    entrainement: rendreEntrainement, profil: rendreProfil,
    classement: rendreClassement, admin: rendreAdmin, superadmin: rendreSuperAdmin,
    suivi: rendreSuivi,
  };
  rendus[vue]?.();
}

function rendreCoquille() {
  const liensPrincipaux = [
    ['revision', 'Salle de révision'],
    ['catalogue', 'Catalogue'],
    ['entrainement', 'Entraînement libre'],
    ['profil', 'Mon profil'],
    ['classement', 'Classement'],
  ];
  const liensAdmin = [
    ...(estSuperAdmin() ? [['suivi', 'Suivi des membres']] : []),
    ...(estSuperAdmin() ? [['admin', 'Gestion des versets']] : []),
    ...(estSuperAdmin() ? [['superadmin', 'Gestion des comptes']] : []),
  ];

  $('#barre-nav').innerHTML = `
    <span class="marque">${icone.livre} Versets &amp; Mémoire</span>
    <div class="liens-nav">
      ${liensPrincipaux.map(([v, l]) => `<button data-nav="${v}" class="onglet">${l}</button>`).join('')}
      ${liensAdmin.length ? `
        <div class="menu-deroulant" id="menu-admin">
          <button class="menu-deroulant-bouton" id="btn-menu-admin" type="button"
                  aria-haspopup="true" aria-expanded="false">
            Administration ${icone.chevron}
          </button>
          <div class="menu-deroulant-liste">
            ${liensAdmin.map(([v, l]) => `<button data-nav="${v}" class="onglet">${l}</button>`).join('')}
          </div>
        </div>` : ''}
    </div>
    <div class="zone-actions-navbar">
      <span class="identite barre-seule">${echapper(etatSession.profil?.displayName || '')}</span>
      <button id="btn-deconnexion-barre" class="btn btn-secondaire btn-petit btn-deconnexion-barre">Déconnexion</button>
      <button id="btn-hamburger" class="btn-hamburger" aria-label="Ouvrir le menu">${icone.hamburger}</button>
    </div>`;

  // État actif : onglet courant + bouton Administration si vue admin
  document.querySelectorAll('.liens-nav [data-nav]').forEach((b) => {
    b.classList.toggle('onglet-actif', b.dataset.nav === vueActive);
    b.onclick = () => naviguer(b.dataset.nav);
  });
  const menu = $('#menu-admin');
  if (menu) {
    if (['suivi', 'admin', 'superadmin'].includes(vueActive)) menu.classList.add('ouvert');
    const bouton = $('#btn-menu-admin');
    bouton.onclick = (e) => {
      e.stopPropagation();
      const ouvert = menu.classList.toggle('ouvert');
      bouton.setAttribute('aria-expanded', String(ouvert));
    };
    // Fermeture au clic ailleurs sur la page
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('ouvert');
        bouton.setAttribute('aria-expanded', 'false');
      }
    }, { once: false });
  }

  $('#btn-deconnexion-barre').onclick = deconnexionUtilisateur;
  $('#btn-hamburger').onclick = ouvrirTiroir;
}

function ouvrirTiroir() {
  const liensPrincipaux = [
    ['revision', 'Salle de révision'], ['catalogue', 'Catalogue'],
    ['entrainement', 'Entraînement libre'], ['profil', 'Mon profil'],
    ['classement', 'Classement'],
  ];
  const liensAdmin = [
    ...(estSuperAdmin() ? [['suivi', 'Suivi des membres']] : []),
    ...(estSuperAdmin() ? [['admin', 'Gestion des versets']] : []),
    ...(estSuperAdmin() ? [['superadmin', 'Gestion des comptes']] : []),
  ];
  const tiroir = $('#tiroir-mobile');
  tiroir.innerHTML = `
    <div class="tiroir-panneau">
      <div class="tiroir-entete">
        <span class="marque">${icone.livre} Menu</span>
        <button class="tiroir-fermer" aria-label="Fermer le menu">${icone.croix}</button>
      </div>
      ${liensPrincipaux.map(([v, l]) => `<button data-nav="${v}" class="onglet ${vueActive === v ? 'onglet-actif' : ''}">${l}</button>`).join('')}
      ${liensAdmin.length ? `
        <p class="role-mention" style="padding:.7rem .4rem .2rem">Administration</p>
        ${liensAdmin.map(([v, l]) => `<button data-nav="${v}" class="onglet ${vueActive === v ? 'onglet-actif' : ''}">${l}</button>`).join('')}` : ''}
      <div class="tiroir-identite">
        <span class="identite">${echapper(etatSession.profil?.displayName || etatSession.user?.email || '')}</span>
        <button id="btn-deconnexion-tiroir" class="btn btn-secondaire">Déconnexion</button>
      </div>
    </div>`;
  tiroir.classList.add('ouvert');
  tiroir.querySelector('.tiroir-fermer').onclick = fermerTiroir;
  tiroir.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => naviguer(b.dataset.nav); });
  $('#btn-deconnexion-tiroir').onclick = deconnexionUtilisateur;
  tiroir.onclick = (e) => { if (e.target === tiroir) fermerTiroir(); };
}

function fermerTiroir() {
  const tiroir = $('#tiroir-mobile');
  if (tiroir) { tiroir.classList.remove('ouvert'); tiroir.innerHTML = ''; }
}

async function deconnexionUtilisateur() {
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
  fermerTiroir();
  toast('Vous êtes déconnecté. À bientôt.', 'info');
}

// =====================================================================
// VUE AUTHENTIFICATION
// =====================================================================
let modeAuth = 'connexion';

function rendreAuth() {
  $('#vue-auth').innerHTML = `
    <div class="page-auth">
      <div class="carte-auth">
        <div class="bandeau-auth">
          ${couvertureSVG('aurore')}
          <img class="banniere-photo" data-banniere="auth" src="${IMAGES.revision}" alt="" />
          <div class="banniere-voile"></div>
        </div>
        <div class="corps-auth">
          <div class="entete-auth">
            <span class="embleme">${icone.livre}</span>
            <h1 class="titre-app">Versets &amp; Mémoire</h1>
            <p class="sous-titre-app">Répétition espacée — Louis Segond 1910</p>
            <div class="filet-or"></div>
          </div>

          <div class="bascule-auth" role="tablist">
            <button id="btn-mode-connexion" class="${modeAuth === 'connexion' ? 'actif' : ''}" type="button">Connexion</button>
            <button id="btn-mode-inscription" class="${modeAuth === 'inscription' ? 'actif' : ''}" type="button">Inscription</button>
          </div>          <form id="form-auth" class="form-colonne" novalidate>
            ${modeAuth === 'inscription' ? `
              <label>Nom affiché
                <input id="champ-nom" class="champ" type="text" required minlength="2" placeholder="Votre nom" autocomplete="name" />
              </label>` : ''}
            <label>Adresse e-mail
              <input id="champ-email" class="champ" type="email" required autocomplete="email" placeholder="vous@exemple.fr" />
            </label>
            <label>Mot de passe
              <input id="champ-mdp" class="champ" type="password" required minlength="6" autocomplete="current-password" placeholder="Six caractères au minimum" />
            </label>
            <button type="submit" id="btn-soumettre" class="btn btn-primaire">
              ${modeAuth === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <div class="separateur-ou"><span>ou</span></div>

          <button id="btn-google" class="btn-google" type="button">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continuer avec Google</span>
          </button>

          <div class="zone-retour" id="zone-retour-auth"></div>
          <div class="pied-carte-auth">
            <button id="btn-oublie" class="btn-lien" type="button">Mot de passe oublié ?</button>
          </div>
        </div>
      </div>
    </div>`;

  $('#btn-mode-connexion').onclick = () => { modeAuth = 'connexion'; rendreAuth(); };
  $('#btn-mode-inscription').onclick = () => { modeAuth = 'inscription'; rendreAuth(); };

  activerBannieres();

  $('#form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#btn-soumettre');
    const retour = $('#zone-retour-auth');
    const email = $('#champ-email').value.trim();
    const mdp = $('#champ-mdp').value;

    retour.innerHTML = '';
    if (!email || mdp.length < 6) {
      afficherRetourAuth('Veuillez saisir une adresse e-mail valide et un mot de passe de six caractères minimum.', 'erreur');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `${icone.spinner}<span>${modeAuth === 'connexion' ? 'Connexion en cours…' : 'Création du compte…'}</span>`;
    $('#champ-email').disabled = true;
    $('#champ-mdp').disabled = true;

    const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    try {
      if (modeAuth === 'connexion') {
        await signInWithEmailAndPassword(auth, email, mdp);
        afficherRetourAuth('Connexion réussie. Ouverture du carnet…', 'succes');
      } else {
        const nom = $('#champ-nom')?.value.trim() || '';
        const cred = await createUserWithEmailAndPassword(auth, email, mdp);
        if (nom) { try { await updateProfile(cred.user, { displayName: nom }); } catch { /* non bloquant */ } }
        await ensureUserProfile({ ...cred.user, email: cred.user.email });
        afficherRetourAuth('Compte créé avec succès. Bienvenue !', 'succes');
      }
    } catch (err) {
      afficherRetourAuth(traduireErreurAuth(err), 'erreur');
      btn.disabled = false;
      btn.textContent = modeAuth === 'connexion' ? 'Se connecter' : 'Créer mon compte';
      $('#champ-email').disabled = false;
      $('#champ-mdp').disabled = false;
    }
  };

  $('#btn-oublie').onclick = async () => {
    const email = $('#champ-email').value.trim();
    if (!email) { afficherRetourAuth('Saisissez d\'abord votre adresse e-mail, puis recliquez.', 'erreur'); return; }
    const btn = $('#btn-oublie');
    btn.disabled = true;
    const { sendPasswordResetEmail } = await import('firebase/auth');
    try {
      await sendPasswordResetEmail(auth, email);
      afficherRetourAuth('Un e-mail de réinitialisation vous a été envoyé.', 'succes');
    } catch (err) {
      afficherRetourAuth(traduireErreurAuth(err), 'erreur');
    } finally {
      btn.disabled = false;
    }
  };

  // ---------------------------------------------------------------
  // Connexion / inscription via Google (popup)
  // Le profil Firestore est créé par ensureUserProfile() si absent,
  // sans jamais écraser les données existantes (getDoc d'abord).
  // ---------------------------------------------------------------
  $('#btn-google').onclick = async () => {
    const btn = $('#btn-google');
    const retour = $('#zone-retour-auth');
    btn.disabled = true;
    btn.dataset.libelle = 'Continuer avec Google';
    btn.innerHTML = `${icone.spinner}<span>Ouverture de Google…</span>`;
    retour.innerHTML = '';

    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const fournisseur = new GoogleAuthProvider();
    try {
      const resultat = await signInWithPopup(auth, fournisseur);
      const u = resultat.user;
      // Création du profil si première connexion (sinon conservé tel quel)
      await ensureUserProfile({
        uid: u.uid, email: u.email,
        displayName: u.displayName, photoURL: u.photoURL,
      });
      afficherRetourAuth('Connexion Google réussie. Ouverture du carnet…', 'succes');
    } catch (err) {
      let message = traduireErreurAuth(err);
      if (err?.code === 'auth/popup-closed-by-user') message = 'Fenêtre Google fermée avant la fin de la connexion.';
      if (err?.code === 'auth/popup-blocked') message = 'Votre navigateur a bloqué la fenêtre Google. Autorisez les fenêtres surgissantes puis réessayez.';
      if (err?.code === 'auth/account-exists-with-different-credential') message = 'Un compte existe déjà avec cet e-mail via un autre mode de connexion.';
      if (err?.code === 'auth/unauthorized-domain') message = 'Ce domaine n\'est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés).';
      afficherRetourAuth(message, 'erreur');
      btn.disabled = false;
      btn.innerHTML = boutonGoogleHTML();
    }
  };
}

function afficherRetourAuth(message, type) {
  const zone = $('#zone-retour-auth');
  const svg = type === 'erreur' ? icone.alerte : type === 'succes' ? icone.coche : icone.info;
  zone.innerHTML = `<div class="retour retour-${type}" role="alert">${svg}<span>${echapper(message)}</span></div>`;
}

/** HTML du bouton Google (réutilisé après un échec de connexion). */
function boutonGoogleHTML() {
  return `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    <span>Continuer avec Google</span>`;
}

function traduireErreurAuth(err) {
  const c = err?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
    return 'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.';
  if (c.includes('email-already-in-use')) return 'Cette adresse e-mail est déjà utilisée.';
  if (c.includes('weak-password')) return 'Mot de passe trop faible : six caractères au minimum.';
  if (c.includes('invalid-email')) return 'Adresse e-mail invalide.';
  if (c.includes('too-many-requests')) return 'Trop de tentatives. Veuillez réessayer dans quelques instants.';
  if (c.includes('network')) return 'Erreur réseau. Vérifiez votre connexion internet.';
  if (c.includes('operation-not-allowed')) return 'La connexion par e-mail n\'est pas activée sur ce projet Firebase.';
  if (c.includes('popup-closed-by-user')) return 'Fenêtre Google fermée avant la fin de la connexion.';
  if (c.includes('popup-blocked')) return 'Fenêtre Google bloquée par le navigateur. Autorisez les fenêtres surgissantes.';
  if (c.includes('account-exists-with-different-credential')) return 'Un compte existe déjà avec cet e-mail via un autre mode de connexion.';
  if (c.includes('unauthorized-domain')) return 'Ce domaine n\'est pas autorisé dans Firebase (Authentication → Domaines autorisés).';
  return 'Une erreur est survenue. Veuillez réessayer.';
}

// =====================================================================
// OUTILS DE PROGRESSION (partagés révision / entraînement)
// =====================================================================

// ---------------------------------------------------------------------
// Garde-fous d'accès aux données :
//  - AUCUNE requête Firestore ne part avant que onAuthStateChanged ait
//    confirmé la session (sinon permission-denied côté règles) ;
//  - chaque lecture est plafonnée dans le temps (jamais de loader infini
//    si IndexedDB ou le réseau se figent).
// ---------------------------------------------------------------------
const DELAI_REQUETE_MS = 5000;

/**
 * Attend la résolution de onAuthStateChanged.
 * @param {number} [ms=8000] délai maximal d'attente
 * @returns {Promise<object|null>} l'utilisateur connecté (ou null)
 */
function attendreSession(ms = 8000) {
  if (etatSession.ready) return Promise.resolve(etatSession.user);
  return new Promise((resoudre, rejeter) => {
    let stopper = () => {};
    const chrono = setTimeout(() => { stopper(); rejeter(new Error('auth-timeout')); }, ms);
    stopper = observerSession((etat) => {
      if (etat.ready) { clearTimeout(chrono); resoudre(etat.user); }
    });
  });
}

/**
 * Garde obligatoire au début de chaque fonction qui lit Firestore :
 * attend une session confirmée ou lève une erreur claire.
 */
async function sessionRequise() {
  const utilisateur = await attendreSession();
  if (!utilisateur) throw new Error('non-connecte');
  return utilisateur;
}

/**
 * Impose une durée maximale à une promesse Firestore (anti-blocage).
 * @param {Promise} promesse
 * @param {number} [ms=DELAI_REQUETE_MS]
 * @param {string} [code='delai-depasse']
 */
function avecDelaiSecurite(promesse, ms = DELAI_REQUETE_MS, code = 'delai-depasse') {
  return Promise.race([
    promesse,
    new Promise((_, rejeter) =>
      setTimeout(() => rejeter(new Error(code)), ms)),
  ]);
}

async function chargerProgression() {
  await sessionRequise();
  const { collection, getDocs } = await import('firebase/firestore');
  const snap = await avecDelaiSecurite(
    getDocs(collection(db, 'users', etatSession.user.uid, 'progression')),
    DELAI_REQUETE_MS, 'delai-carnet',
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function referenceDe(c) {
  return c.referenceComplete || `${c.livre} ${c.chapitre}:${c.verset}`;
}

function prochaineEcheance(progression) {
  const futures = progression
    .filter((c) => !estDue(c))
    .sort((a, b) => nouvelleDate(a.prochaineRevision) - nouvelleDate(b.prochaineRevision));
  return futures[0]?.prochaineRevision || null;
}

async function ecrireRevision(carte, succes) {
  const { doc, setDoc, Timestamp } = await import('firebase/firestore');
  const maj = avancerNiveau(carte, succes);
  const points = succes ? POINTS_REUSSITE : 0;
  const serie = succes ? avancerSerie(etatSession.profil?.progression || {}) : null;

  await setDoc(doc(db, 'users', etatSession.user.uid, 'progression', carte.id), {
    ...maj,
    prochaineRevision: Timestamp.fromDate(maj.prochaineRevision),
    derniereRevision: Timestamp.fromDate(maj.derniereRevision),
  }, { merge: true });

  // Points, série, compteurs de réussite/échec et dernière activité
  // dans le profil — utilisés par le classement et le suivi admin.
  const { doc: d2, setDoc: s2, serverTimestamp } = await import('firebase/firestore');
  const refProfil = d2(db, 'users', etatSession.user.uid);
  const prog = { ...(etatSession.profil?.progression || {}) };
  prog.points = (prog.points || 0) + points;
  if (serie) { prog.serieJours = Math.max(prog.serieJours || 0, serie.serieJours); prog.dernierJour = serie.dernierJour; }
  prog.versetsAppris = Math.max(prog.versetsAppris || 0, carte.niveau + (succes ? 1 : 0));
  if (succes) { prog.reussites = (prog.reussites || 0) + 1; }
  else { prog.echecs = (prog.echecs || 0) + 1; }
  prog.derniereActivite = serverTimestamp();
  await s2(refProfil, { progression: prog }, { merge: true });
  etatSession.profil = { ...etatSession.profil, progression: prog };
}

/**
 * Valide la révision d'une carte : enregistre le succès uniquement
 * après la réussite des deux épreuves de mémorisation, passe à la
 * carte suivante et rafraîchit l'affichage.
 * @param {object} carte — carte de progression à valider
 */
async function validerRevision(carte) {
  const reussies = epreuvesReussies.get(carte.id) || new Set();
  if (!SEQUENCE_VALIDATION.every((e) => reussies.has(e))) {
    toast('Réussissez d\'abord les deux épreuves de mémorisation.', 'erreur');
    return;
  }
  try {
    await ecrireRevision(carte, true);
    const prochainIntervalle = INTERVALLES_JOURS[carte.niveau + 1] || INTERVALLES_JOURS[5];
    toast(`Révision validée : niveau ${carte.niveau + 1}, prochaine échéance dans ${prochainIntervalle} jour(s).`, 'succes');
  } catch (err) {
    toast('Enregistrement impossible : ' + err.code, 'erreur');
    return;
  }
  epreuvesReussies.delete(carte.id);
  progression = progression.filter((x) => x.id !== carte.id);
  carteCourante = trierParEcheance(progression.filter((x) => estDue(x)))[0] || null;
  rafraichirCarteRevision();
}

// =====================================================================
// RENDU D'UNE CARTE D'ÉPREUVES (révisé + entraînement)
// =====================================================================
let progression = [];
let carteCourante = null;
let carteEntrainement = null;
const epreuvesReussies = new Map(); // versetId -> Set<'saisie'|'blocs'>

function enteteEpreuves(c, reussies) {
  const prochaine = SEQUENCE_VALIDATION.find((e) => !reussies.has(e));
  return `
    <div class="compte-epreuves" aria-live="polite">
      <span>Épreuves :</span>
      ${SEQUENCE_VALIDATION.map((e, i) => `
        <span class="pastille-epreuve ${reussies.has(e) ? 'reussie' : e === prochaine ? 'encours' : ''}"
              title="${EPREUVES[e]}">${reussies.has(e)
                ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
                : i + 1}</span>
        <span>${EPREUVES[e]}</span>`).join(' · ')}
    </div>`;
}

function carteEpreuvesHTML(c, { modeEntrainement = false } = {}) {
  const id = c.id;
  const reussies = epreuvesReussies.get(id) || new Set();
  const prochaineEpreuve = SEQUENCE_VALIDATION.find((e) => !reussies.has(e));
  const toutesReussies = SEQUENCE_VALIDATION.every((e) => reussies.has(e));

  const entete = `
    <div class="entete-revision">
      <h3 class="reference-verset">${echapper(referenceDe(c))}</h3>
      <span class="niveau-mention">Niveau ${c.niveau ?? 0} · révision due le ${formaterDate(c.prochaineRevision)}</span>
    </div>
    <hr class="filet-separation" />
    ${enteteEpreuves(c, reussies)}`;

  let corps = '';
  if (prochaineEpreuve === 'saisie') {
    corps = `
      <div class="zone-epreuve">
        <p class="texte-doux">Recopiez le verset de mémoire, mot pour mot :</p>
        <textarea id="champ-saisie" class="champ" rows="4" placeholder="Écrivez ici le verset que vous avez mémorisé…"></textarea>
        <div class="actions-epreuve">
          <button id="btn-initiales" class="btn btn-secondaire btn-petit" type="button">Afficher les initiales</button>
          <button id="btn-verifier-saisie" class="btn btn-or" type="button">Vérifier ma saisie</button>
        </div>
        <p id="initiales-affichees" class="initiales-affichees hidden">${echapper(initialesDe(c.texte || ''))}</p>
        <div id="zone-verdict"></div>
      </div>`;
  } else if (prochaineEpreuve === 'blocs') {
    const blocs = melangerBlocs(c.texte || '', graineDe(referenceDe(c)));
    corps = `
      <div class="zone-epreuve">
        <p class="texte-doux">Reconstituez le verset en touchant les mots dans le bon ordre :</p>
        <div id="zone-deposee" class="zone-blocs vide"></div>
        <div id="banc-blocs" class="banc-blocs">
          ${blocs.map((b) => `<button type="button" class="bloc-mot" data-id="${b.id}">${echapper(b.mot)}</button>`).join('')}
        </div>
        <div class="actions-epreuve">
          <button id="btn-verifier-blocs" class="btn btn-or" type="button" disabled>Vérifier l'ordre</button>
          <button id="btn-recommencer-blocs" class="btn btn-secondaire btn-petit" type="button">Recommencer</button>
        </div>
        <div id="zone-verdict"></div>
      </div>`;
  } else {
    corps = `
      <div class="verdict verdict-succes">${icone.coche}
        <span>Les deux épreuves sont réussies.${modeEntrainement ? ' Entraînement terminé — votre progression reste inchangée.' : ' Vous pouvez valider la révision.'}</span>
      </div>
      <div class="boutons-revision">
        ${modeEntrainement ? '' : '<button id="btn-valider-revision" class="btn btn-or">Valider la révision</button>'}
        <button id="btn-entrainer-encore" class="btn btn-secondaire">${icone.refaire} S'entraîner à nouveau</button>
      </div>`;
  }

  const pied = modeEntrainement ? `
    <div class="bloc-verrou">${icone.info}
      <span>Entraînement libre : ces épreuves n'affectent ni vos niveaux, ni vos points, ni vos échéances.</span>
    </div>` : `
    <div class="bloc-verrou">${icone.verrou}
      <span>La validation reste verrouillée jusqu'à la réussite des deux épreuves (saisie exacte, puis reconstitution dans l'ordre).</span>
    </div>`;

  // Bandeau illustré (bible ouverte) au-dessus de chaque carte d'épreuve
  const bandeau = `<div class="bandeau-carte">${couvertureSVG('manuscrit')}<img class="banniere-photo" data-banniere="epreuve" src="${IMAGES.entrainement}" alt="" /><div class="banniere-voile"></div></div>`;

  return `<div class="salle-revision">${bandeau}${entete}${corps}${pied}</div>`;
}

function afficherVerdict(html) {
  const z = $('#zone-verdict');
  if (z) z.innerHTML = html;
}

/**
 * Lie les épreuves d'une carte.
 * @param {object} c — carte (progression)
 * @param {{surEpreuveReussie: (string) => void,
 *          surEntrainementEncore?: () => void,
 *          surValidation?: () => void}} callbacks
 */
function lierEpreuves(c, callbacks) {
  const { surEpreuveReussie, surEntrainementEncore } = callbacks;
  const id = c.id;

  const btnInitiales = $('#btn-initiales');
  if (btnInitiales) btnInitiales.onclick = () => $('#initiales-affichees').classList.toggle('hidden');

  // --- Épreuve : saisie mot à mot ---
  const champ = $('#champ-saisie');
  const btnSaisie = $('#btn-verifier-saisie');
  if (btnSaisie) {
    btnSaisie.onclick = () => {
      const saisi = champ.value;
      if (!saisi.trim()) {
        afficherVerdict(`<div class="verdict verdict-info">${icone.info}<span>Écrivez d'abord le verset dans le champ ci-dessus.</span></div>`);
        return;
      }
      const r = comparerSaisie(saisi, c.texte || '');
      if (r.exact) { surEpreuveReussie('saisie'); return; }
      const motsAttendus = (c.texte || '').split(/\s+/);
      const motsSaisis = saisi.trim().split(/\s+/);
      const detail = motsAttendus.map((mot, i) => {
        const okMot = normaliser(motsSaisis[i]) === normaliser(mot);
        return `<span class="${okMot ? 'mot-juste' : 'mot-faux'}">${echapper(mot)}</span>`;
      }).join(' ');
      afficherVerdict(`
        <div class="verdict verdict-echec">${icone.alerte}
          <span>Ce n'est pas encore exact (correspondance : ${r.pct} %). Les mots justes sont en vert :
            <p class="verdict-details">${detail}</p>
          </span>
        </div>`);
    };

    // Effacement dynamique : toute frappe fait disparaître la correction
    champ?.addEventListener('input', () => afficherVerdict(''));
  }

  // --- Épreuve : reconstitution dans l'ordre ---
  const deposee = $('#zone-deposee');
  if (deposee) {
    const banc = $('#banc-blocs');
    const btnVerif = $('#btn-verifier-blocs');
    const btnReset = $('#btn-recommencer-blocs');

    function majEtatVerif() {
      if (btnVerif) btnVerif.disabled = deposee.querySelectorAll('.bloc-mot').length === 0;
    }

    banc?.querySelectorAll('.bloc-mot').forEach((btn) => {
      btn.onclick = () => {
        const span = document.createElement('button');
        span.type = 'button';
        span.className = 'bloc-mot';
        span.textContent = btn.textContent;
        span.onclick = () => {
          span.remove();
          btn.disabled = false; btn.style.opacity = '';
          deposee.classList.toggle('vide', deposee.children.length === 0);
          majEtatVerif();
        };
        deposee.appendChild(span);
        btn.disabled = true; btn.style.opacity = '.3';
        deposee.classList.remove('vide');
        majEtatVerif();
      };
    });

    btnReset?.addEventListener('click', () => {
      deposee.innerHTML = '';
      deposee.classList.add('vide');
      banc.querySelectorAll('.bloc-mot').forEach((b) => { b.disabled = false; b.style.opacity = ''; });
      afficherVerdict('');
      majEtatVerif();
    });

    btnVerif?.addEventListener('click', () => {
      const proposition = [...deposee.querySelectorAll('.bloc-mot')].map((b) => b.textContent).join(' ');
      const r = comparerSaisie(proposition, c.texte || '');
      if (r.exact) { surEpreuveReussie('blocs'); return; }
      afficherVerdict(`
        <div class="verdict verdict-echec">${icone.alerte}
          <span>L'ordre n'est pas correct (correspondance : ${r.pct} %). Touchez « Recommencer » pour replacer les mots.</span>
        </div>`);
    });
  }

  // --- Boutons de fin ---
  const btnValider = $('#btn-valider-revision');
  if (btnValider) btnValider.onclick = () => callbacks.surValidation?.();
  const btnEncore = $('#btn-entrainer-encore');
  if (btnEncore) btnEncore.onclick = () => surEntrainementEncore?.();
}

// =====================================================================
// VUE RÉVISION QUOTIDIENNE
// =====================================================================
async function rendreRevision() {
  $('#vue-revision').innerHTML = `
    ${banniereHTMLSync('revision', TITRES.revision[0], TITRES.revision[1])}
    <div class="chargement-vue">
      <svg class="ficelle" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20"/></svg>
      <p>Préparation de la salle de révision…</p>
    </div>`;
  progression = await chargerProgression();

  const dues = compterDues(progression);
  const file = trierParEcheance(progression.filter((c) => estDue(c)));
  carteCourante = file[0] || null;

  const distribution = INTERVALLES_JOURS.map((_, n) =>
    progression.filter((c) => (c.niveau || 0) === n).length);

  $('#vue-revision').innerHTML = `
    ${banniereHTMLSync('revision', TITRES.revision[0], TITRES.revision[1])}
    <div class="stats-grille">
      <div class="stat-carte"><span class="stat-valeur">${dues}</span><span class="stat-libelle">À réviser aujourd'hui</span></div>
      <div class="stat-carte"><span class="stat-valeur">${progression.length}</span><span class="stat-libelle">Versets appris</span></div>
      <div class="stat-carte"><span class="stat-valeur">${progression.filter((c) => (c.niveau || 0) >= 5).length}</span><span class="stat-libelle">Acquis</span></div>
    </div>
    <div class="niveaux-barre">
      ${INTERVALLES_JOURS.map((j, n) => `
        <span class="niveau-pastille" title="Niveau ${n} : prochaine révision dans ${j} jours"><strong>N${n}</strong> ${distribution[n]}</span>`).join('')}
    </div>
    <div id="zone-carte">${rendreCarteRevisionHTML()}</div>`;

  activerBannieres();
  lierCarteRevision();
}

function rendreCarteRevisionHTML() {
  if (!progression.length) {
    return `<div class="sans-carte">
      <p class="citation-vide">« Je cache ta parole dans mon cœur, afin de ne pas pécher contre toi. » — Psaume 119:11</p>
      <p>Aucun verset dans votre carnet pour l'instant.</p>
      <button class="btn btn-primaire" data-nav="catalogue">Parcourir le catalogue</button>
    </div>`;
  }
  if (!carteCourante) {
    return `<div class="sans-carte">
      <p class="citation-vide">Tout est révisé pour aujourd'hui.</p>
      <p class="texte-doux">Prochaine échéance : ${formaterDate(prochaineEcheance(progression))}</p>
      <button class="btn btn-secondaire" data-nav="entrainement">S'entraîner librement</button>
    </div>`;
  }
  return carteEpreuvesHTML(carteCourante, { modeEntrainement: false });
}

function rafraichirCarteRevision() {
  $('#zone-carte').innerHTML = rendreCarteRevisionHTML();
  activerBannieres();
  lierCarteRevision();
}

function lierCarteRevision() {
  document.querySelectorAll('#zone-carte [data-nav]').forEach((b) => { b.onclick = () => naviguer(b.dataset.nav); });
  if (!carteCourante) return;

  const c = carteCourante;
  lierEpreuves(c, {
    surEpreuveReussie: (epreuve) => {
      if (!epreuvesReussies.has(c.id)) epreuvesReussies.set(c.id, new Set());
      epreuvesReussies.get(c.id).add(epreuve);
      toast(`Épreuve « ${EPREUVES[epreuve]} » réussie.`, 'succes');
      rafraichirCarteRevision();
    },
    surEntrainementEncore: () => {
      epreuvesReussies.set(c.id, new Set());
      rafraichirCarteRevision();
      toast('Nouvelle session d\'entraînement lancée.', 'info');
    },
    surValidation: () => validerRevision(c),
  });
}

// =====================================================================
// VUE ENTRAÎNEMENT LIBRE (versets acquis, sans impact progression)
// =====================================================================
async function rendreEntrainement() {
  $('#vue-entrainement').innerHTML = `
    ${banniereHTMLSync('entrainement', TITRES.entrainement[0], TITRES.entrainement[1])}
    <div class="chargement-vue">
      <svg class="ficelle" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20"/></svg>
      <p>Chargement de votre carnet…</p>
    </div>`;
  activerBannieres();

  let cartes = [];
  try {
    cartes = await avecDelaiSecurite(chargerProgression(), DELAI_REQUETE_MS, 'delai-carnet');
  } catch (err) {
    // Timeout de sécurité (5 s) ou session introuvable : couper le loader
    // avec un message clair au lieu d'un spinner éternel.
    $('#vue-entrainement').innerHTML = `
      ${banniereHTMLSync('entrainement', TITRES.entrainement[0], TITRES.entrainement[1])}
      <div class="verdict verdict-echec">${icone.alerte}<span>Le carnet n'a pas pu être chargé (${echapper(err.message || 'erreur')}). Vérifiez votre connexion puis réessayez.</span></div>
      <div style="text-align:center;margin-top:1rem"><button class="btn btn-secondaire" id="btn-reessayer-entrainement">Réessayer</button></div>`;
    activerBannieres();
    $('#btn-reessayer-entrainement').onclick = rendreEntrainement;
    return;
  }

  if (!cartes.length) {
    $('#vue-entrainement').innerHTML = `
      ${banniereHTMLSync('entrainement', TITRES.entrainement[0], TITRES.entrainement[1])}
      <div class="sans-carte">
        <p>Vous n'avez pas encore de verset à réentraîner. Validez vos premiers versets dans la salle de révision.</p>
        <button class="btn btn-primaire" data-nav="catalogue">Parcourir le catalogue</button>
      </div>`;
    activerBannieres();
    document.querySelectorAll('#vue-entrainement [data-nav]').forEach((b) => { b.onclick = () => naviguer(b.dataset.nav); });
    return;
  }

  const liste = trierParEcheance(cartes);
  let index = 0;
  carteEntrainement = liste[0];

  $('#vue-entrainement').innerHTML = `
    ${banniereHTMLSync('entrainement', TITRES.entrainement[0], TITRES.entrainement[1])}
    <div id="zone-entrainement"></div>
    <div class="actions-epreuve" style="margin-top:.9rem">
      <button id="btn-verset-precedent" class="btn btn-secondaire btn-petit" type="button">Verset précédent</button>
      <button id="btn-verset-suivant" class="btn btn-secondaire btn-petit" type="button">Verset suivant</button>
    </div>`;

  function afficher() {
    carteEntrainement = liste[index];
    epreuvesReussies.set(carteEntrainement.id, new Set());
    $('#zone-entrainement').innerHTML = carteEpreuvesHTML(carteEntrainement, { modeEntrainement: true });
    lierEpreuves(carteEntrainement, {
      surEpreuveReussie: (epreuve) => {
        epreuvesReussies.get(carteEntrainement.id)?.add(epreuve);
        toast(`Épreuve « ${EPREUVES[epreuve]} » réussie en mode entraînement.`, 'succes');
        afficher();
      },
      surEntrainementEncore: () => { afficher(); toast('Épreuves réinitialisées pour ce verset.', 'info'); },
    });
    $('#btn-verset-precedent').disabled = index === 0;
    $('#btn-verset-suivant').disabled = index === liste.length - 1;
  }

  $('#btn-verset-precedent').onclick = () => { if (index > 0) { index--; afficher(); } };
  $('#btn-verset-suivant').onclick = () => { if (index < liste.length - 1) { index++; afficher(); } };
  afficher();

  activerBannieres();
  document.querySelectorAll('#vue-entrainement [data-nav]').forEach((b) => { b.onclick = () => naviguer(b.dataset.nav); });
}

// =====================================================================
// VUE PROFIL
// =====================================================================
async function rendreProfil() {
  $('#vue-profil').innerHTML = `
    <h2 class="titre-vue">${TITRES.profil[0]}</h2>
    <div class="chargement-vue">
      <svg class="ficelle" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20"/></svg>
      <p>Chargement du profil…</p>
    </div>`;

  // Fraîchir le profil depuis Firestore
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', etatSession.user.uid));
  if (snap.exists()) etatSession.profil = { ...etatSession.profil, ...snap.data() };
  const profil = etatSession.profil || {};
  const prog = profil.progression || {};
  const niveau = niveauDe(prog.versetsAppris || 0);

  $('#vue-profil').innerHTML = `
    <h2 class="titre-vue">${TITRES.profil[0]}</h2>
    <p class="mention-vue">${TITRES.profil[1]}</p>

    <div class="carte-profil">
      <div class="couverture-profil">${couvertureSVG(profil.couleurCouverture)}</div>
      <div class="entete-profil">
        <span class="anneau-avatar">${avatarSVG(profil, 76)}</span>
        <div class="identite-profil">
          <h2>${echapper(profil.displayName || 'Sans nom')}</h2>
          <span class="courriel">${echapper(profil.email || etatSession.user.email)}</span>
          <span class="badge-niveau">${icone.étoile} ${niveau.nom}${niveau.suivant ? ` — encore ${niveau.reste} verset(s) avant ${niveau.suivant}` : ' — niveau maximal'}</span>
        </div>
      </div>
      <div class="ligne-mesures">
        <div class="mesure"><span class="valeur">${prog.versetsAppris || 0}</span><span class="libelle">Versets appris</span></div>
        <div class="mesure"><span class="valeur">${prog.points || 0}</span><span class="libelle">Points</span></div>
        <div class="mesure"><span class="valeur">${prog.serieJours || 0}</span><span class="libelle">Jours de suite</span></div>
      </div>
    </div>

    <form id="form-profil" class="carte-form">
      <h3 class="titre-section">Personnaliser mon profil</h3>
      <div class="form-colonne">
        <label>Nom affiché
          <input id="profil-nom" class="champ" type="text" required minlength="2" maxlength="40" value="${echapper(profil.displayName || '')}" />
        </label>
        <label>Mon verset favori (facultatif)
          <textarea id="profil-verset" class="champ" rows="2" maxlength="220" placeholder="Exemple : « Ta parole est une lampe à mes pieds. » — Psaume 119:105">${echapper(profil.versetFavori || '')}</textarea>
        </label>
        <label>Avatar (initiale colorée)
          <div id="choix-avatars" class="choix-avatars">
            ${LISTE_AVATARS.map((cle) => `
              <button type="button" class="choix-avatar ${profil.avatar === cle && !profil.photoURL ? 'selectionne' : ''}" data-avatar="${cle}" title="${cle}">
                ${avatarSVG({ displayName: profil.displayName, avatar: cle }, 48)}
              </button>`).join('')}
          </div>
        </label>
        <label>Photo de profil (URL d'image — prioritaire sur l'avatar coloré)
          <input id="profil-photo-url" class="champ" type="url" placeholder="https://exemple.com/photo.jpg" value="${echapper(profil.photoURL || '')}" />
          <span class="texte-doux">Laissez vide pour utiliser l'avatar coloré ci-dessus.</span>
        </label>
        <label>Image de couverture
          <div id="choix-couvertures" class="grille-couvertures">
            ${LISTE_COUVERTURES.map((cle) => `
              <button type="button" class="choix-couverture ${profil.couleurCouverture === cle ? 'selectionne' : ''}" data-couverture="${cle}" title="${COUVERTURES[cle].libelle}">
                ${couvertureSVG(cle)}
              </button>`).join('')}
          </div>
        </label>
        <button type="submit" id="btn-enregistrer-profil" class="btn btn-or">Enregistrer les modifications</button>
      </div>
    </form>`;

  let avatarChoisi = profil.avatar || 'aurore';
  let couvertureChoisie = profil.couleurCouverture || 'aurore';

  // Choisir un avatar coloré efface l'URL photo (et inversement)
  document.querySelectorAll('.choix-avatar').forEach((b) => {
    b.addEventListener('click', () => { const champ = $('#profil-photo-url'); if (champ) champ.value = ''; });
  });
  $('#profil-photo-url')?.addEventListener('input', () => {
    document.querySelectorAll('.choix-avatar').forEach((x) => x.classList.remove('selectionne'));
  });

  document.querySelectorAll('.choix-avatar').forEach((b) => {
    b.onclick = () => {
      avatarChoisi = b.dataset.avatar;
      document.querySelectorAll('.choix-avatar').forEach((x) => x.classList.remove('selectionne'));
      b.classList.add('selectionne');
    };
  });
  document.querySelectorAll('.choix-couverture').forEach((b) => {
    b.onclick = () => {
      couvertureChoisie = b.dataset.couverture;
      document.querySelectorAll('.choix-couverture').forEach((x) => x.classList.remove('selectionne'));
      b.classList.add('selectionne');
    };
  });

  $('#form-profil').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#btn-enregistrer-profil');
    btn.disabled = true;
    btn.innerHTML = `${icone.spinner} Enregistrement…`;
    const { doc: d, updateDoc } = await import('firebase/firestore');
    try {
      const photoURL = $('#profil-photo-url').value.trim();
      await updateDoc(d(db, 'users', etatSession.user.uid), {
        displayName: $('#profil-nom').value.trim(),
        versetFavori: $('#profil-verset').value.trim(),
        avatar: avatarChoisi,
        couleurCouverture: couvertureChoisie,
        photoURL,
      });
      etatSession.profil = { ...etatSession.profil, displayName: $('#profil-nom').value.trim(), versetFavori: $('#profil-verset').value.trim(), avatar: avatarChoisi, couleurCouverture: couvertureChoisie, photoURL };
      toast('Profil enregistré.', 'succes');
      rendreCoquille();
      rendreProfil();
    } catch (err) {
      toast('Enregistrement refusé : ' + err.code, 'erreur');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enregistrer les modifications';
    }
  };
}

// =====================================================================
// VUE CLASSEMENT (leaderboard public)
// =====================================================================
async function rendreClassement() {
  $('#vue-classement').innerHTML = `
    <h2 class="titre-vue">${TITRES.classement[0]}</h2>
    <div class="chargement-vue">
      <svg class="ficelle" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20"/></svg>
      <p>Lecture du classement…</p>
    </div>`;

  await sessionRequise();
  const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
  let membres = [];
  try {
    const q = query(collection(db, 'users'), orderBy('progression.points', 'desc'), limit(50));
    const snap = await avecDelaiSecurite(getDocs(q), DELAI_REQUETE_MS * 2, 'delai-classement');
    membres = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // Repli sans tri (index composite éventuellement absent ou délai dépassé)
    try {
      const snap = await avecDelaiSecurite(
        getDocs(collection(db, 'users')), DELAI_REQUETE_MS * 2, 'delai-classement');
      membres = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.progression?.points || 0) - (a.progression?.points || 0))
        .slice(0, 50);
    } catch (err) {
      $('#vue-classement').innerHTML = `
        ${banniereHTMLSync('classement', TITRES.classement[0], TITRES.classement[1])}
        <div class="verdict verdict-echec">${icone.alerte}<span>Classement inaccessible (${echapper(err.message || 'erreur')}).</span></div>
        <div style="text-align:center;margin-top:1rem"><button class="btn btn-secondaire" id="btn-reessayer-classement">Réessayer</button></div>`;
      activerBannieres();
      $('#btn-reessayer-classement').onclick = rendreClassement;
      return;
    }
  }

  const pointeur = (uid) => membres.findIndex((m) => m.id === uid);
  const monRang = pointeur(etatSession.user.uid);

  /**
   * Carte horizontale du classement :
   * badge de rang (or/argent/bronze) — membre — stats en colonnes.
   */
  const ligne = (m, rang) => {
    const p = m.progression || {};
    const couronne = rang <= 3 ? icone.couronne : '';
    const titreRang = rang === 1 ? 'Première place'
      : rang === 2 ? 'Deuxième place'
      : rang === 3 ? 'Troisième place' : `${rang}e place`;
    return `
    <div class="ligne-classement ${m.id === etatSession.user.uid ? 'ligne-soi' : ''}" data-profil="${m.id}" title="Voir le profil public">
      <span class="rang-badge ${rang <= 3 ? `rang-${rang}` : ''}" title="${titreRang}">${couronne}${rang}</span>
      ${avatarSVG(m, 44)}
      <span class="qui">
        <strong>${echapper(m.displayName || 'Membre')}</strong>
        <span class="courriel">${echapper(m.email || '')}</span>
      </span>
      <span class="stats-colonnes">
        <span class="stat-colonne versets">
          <span class="valeur">${p.versetsAppris || 0}</span>
          <span class="libelle">${icone.livre} appris</span>
        </span>
        <span class="stat-colonne serie">
          <span class="valeur">${p.serieJours || 0}</span>
          <span class="libelle">${icone.flamme} jours</span>
        </span>
        <span class="stat-colonne score">
          <span class="valeur">${p.points || 0}</span>
          <span class="libelle">${icone.étoile} pts</span>
        </span>
      </span>
      <span class="badge-niveau">${niveauDe(p.versetsAppris || 0).nom}</span>
    </div>`;
  };

  $('#vue-classement').innerHTML = `
    ${banniereHTMLSync('classement', TITRES.classement[0], TITRES.classement[1])}
    <div class="liste-classement">
      ${membres.map((m, i) => ligne(m, i + 1)).join('') || '<p class="etagere-vide">Aucun membre classé pour l\'instant.</p>'}
    </div>
    ${monRang > 50 ? `<p class="texte-doux" style="margin-top:1rem">Votre position : ${monRang + 1}.</p>` : ''}`;

  activerBannieres();

  document.querySelectorAll('[data-profil]').forEach((el) => {
    el.onclick = () => afficherProfilPublic(el.dataset.profil);
  });
}

/** Fiche profil public (modal simple via la vue classement). */
async function afficherProfilPublic(uid) {
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) { toast('Profil introuvable.', 'erreur'); return; }
  const m = snap.data();
  const niveau = niveauDe(m.progression?.versetsAppris || 0);
  const zone = $('#vue-classement');
  zone.innerHTML = `
    <button id="btn-retour-classement" class="btn btn-secondaire btn-petit" type="button">Retour au classement</button>
    <div class="carte-profil" style="margin-top:1rem">
      <div class="couverture-profil">${couvertureSVG(m.couleurCouverture)}</div>
      <div class="entete-profil">
        <span class="anneau-avatar">${avatarSVG(m, 76)}</span>
        <div class="identite-profil">
          <h2>${echapper(m.displayName || 'Membre')}</h2>
          <span class="badge-niveau">${icone.étoile} ${niveau.nom}</span>
        </div>
      </div>
      <div class="ligne-mesures">
        <div class="mesure"><span class="valeur">${m.progression?.versetsAppris || 0}</span><span class="libelle">Versets appris</span></div>
        <div class="mesure"><span class="valeur">${m.progression?.points || 0}</span><span class="libelle">Points</span></div>
        <div class="mesure"><span class="valeur">${m.progression?.serieJours || 0}</span><span class="libelle">Jours de suite</span></div>
      </div>
      ${m.versetFavori ? `<div style="padding:0 1.2rem 1.2rem"><p class="citation-vide" style="max-width:none">${echapper(m.versetFavori)}</p></div>` : ''}
    </div>`;
  $('#btn-retour-classement').onclick = rendreClassement;
}

// =====================================================================
// SUIVI DES MEMBRES (admin / super admin) — back-office de progression
// =====================================================================
async function rendreSuivi() {
  $('#vue-suivi').innerHTML = `
    ${banniereHTMLSync('classement', TITRES.suivi[0], TITRES.suivi[1])}
    <div class="chargement-vue">
      <svg class="ficelle" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20"/></svg>
      <p>Lecture des membres et de leur progression…</p>
    </div>`;
  activerBannieres();

  const { collection, getDocs } = await import('firebase/firestore');
  let membres = [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    membres = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    $('#vue-suivi').innerHTML = `
      ${banniereHTMLSync('classement', TITRES.suivi[0], TITRES.suivi[1])}
      <div class="verdict verdict-echec">${icone.alerte}<span>Lecture impossible (${echapper(err.code || 'erreur')}).</span></div>`;
    activerBannieres();
    return;
  }

  const progressionParMembre = await Promise.all(membres.map(async (m) => {
    try {
      const snap = await getDocs(collection(db, 'users', m.id, 'progression'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      return null; // sous-collection protégée — stats du profil sans privilège
    }
  }));
  const stats = membres.map((m, i) => {
    const cartes = progressionParMembre[i];
    const totalCartes = cartes ? cartes.length : (m.progression?.versetsAppris || 0);
    const maitrises = cartes ? cartes.filter((c) => (c.niveau || 0) >= 5).length : 0;
    const reussites = cartes
      ? cartes.reduce((t, c) => t + (c.nombreSucces || 0), 0)
      : (m.progression?.reussites || 0);
    const echecs = cartes
      ? cartes.reduce((t, c) => t + (c.nombreEchecs || 0), 0)
      : (m.progression?.echecs || 0);
    const totalReponses = reussites + echecs;
    const taux = totalReponses ? Math.round((reussites / totalReponses) * 100) : null;
    const derniereActivite = cartes
      ? cartes.map((c) => nouvelleDate(c.derniereRevision).getTime()).reduce((a, b) => Math.max(a, b), 0)
      : nouvelleDate(m.progression?.derniereActivite).getTime();
    return { membre: m, totalCartes, maitrises, reussites, echecs, taux, derniereActivite };
  });

  let filtre = '';

  function tableau(filtreTexte) {
    const q = normaliser(filtreTexte);
    const lignes = stats
      .filter((s) => !q || normaliser(s.membre.displayName || '').includes(q) || normaliser(s.membre.email || '').includes(q))
      .map((s, i) => {
        const p = s.membre.progression || {};
        const libelleRole = { user: 'Utilisateur', admin: 'Gestionnaire', super_admin: 'Administrateur général' }[s.membre.role || 'user'];
        return `
        <tr>
          <td>
            <div class="cell-membre">
              ${avatarSVG(s.membre, 36)}
              <div class="cell-identite">
                <strong>${echapper(s.membre.displayName || 'Membre')}</strong>
                <span>${echapper(s.membre.email || '')}</span>
              </div>
            </div>
          </td>
          <td>${echapper(libelleRole)}</td>
          <td><strong class="chiffre-or">${p.points || 0}</strong></td>
          <td><strong class="chiffre-or">${s.totalCartes}</strong></td>
          <td>${s.maitrises}</td>
          <td>${s.taux === null ? '<span class="texte-doux">—</span>' : s.taux + ' %'}</td>
          <td>${formaterDate(s.derniereActivite || null)}</td>
          <td>${formaterDate(s.membre.derniereConnexion || null)}</td>
          <td><span class="badge-niveau">${niveauDe(p.versetsAppris || 0).nom}</span></td>
        </tr>`;
      }).join('');

    $('#corps-tableau-suivi').innerHTML = lignes ||
      '<tr><td colspan="9" class="etagere-vide">Aucun membre ne correspond à cette recherche.</td></tr>';
  }

  $('#vue-suivi').innerHTML = `
    ${banniereHTMLSync('classement', TITRES.suivi[0], TITRES.suivi[1])}
    <p class="mention-vue">${membres.length} membre(s) inscrit(s) — versets appris, score, taux de réussite et dernière activité.</p>
    <div class="barre-recherche">
      ${icone.recherche}
      <input id="recherche-suivi" class="champ" type="search" placeholder="Rechercher un membre par son nom ou son e-mail…" />
    </div>
    <div class="tableau-defilant">
      <table class="tableau-suivi">
        <thead>
          <tr><th>Membre</th><th>Rôle</th><th>Score</th><th>Versets appris</th><th>Acquis (N5)</th><th>Taux de réussite</th><th>Dernière activité</th><th>Dernière connexion</th><th>Niveau</th></tr>
        </thead>
        <tbody id="corps-tableau-suivi"></tbody>
      </table>
    </div>`;

  activerBannieres();
  tableau('');
  $('#recherche-suivi').oninput = (e) => tableau(e.target.value);
}

// =====================================================================
// GESTION DES VERSETS (admin)
// =====================================================================
let versetsGlobaux = [];
let apercuVerset = null;

async function chargerCatalogue() {
  const { collection, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(db, 'versets_globaux'));
  versetsGlobaux = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function rendreCatalogue() {
  $('#vue-catalogue').innerHTML = `
    ${banniereHTMLSync('revision', TITRES.catalogue[0], TITRES.catalogue[1])}
    <div class="chargement-vue">
      <svg class="ficelle" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20"/></svg>
      <p>Ouverture de la bibliothèque…</p>
    </div>`;
  activerBannieres();

  const charger = async () => {
    await sessionRequise();
    await chargerCatalogue();
  };

  let dernierErreur = null;
  try {
    await avecDelaiSecurite(charger(), DELAI_REQUETE_MS * 2, 'delai-catalogue');
  } catch (err) {
    dernierErreur = err;
    // Réessai unique après 1 seconde si l'utilisateur est bien connecté :
    // couvre une requête partie juste avant la confirmation de session.
    const utilisateur = await attendreSession(2000).catch(() => null);
    if (utilisateur) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        await avecDelaiSecurite(chargerCatalogue(), DELAI_REQUETE_MS * 2, 'delai-catalogue');
        dernierErreur = null;
      } catch (err2) { dernierErreur = err2; }
    }
  }

  if (dernierErreur) {
    const code = dernierErreur.code || dernierErreur.message || 'erreur';
    const explication = String(code).includes('permission')
      ? 'Les règles de sécurité bloquent la lecture : publiez des règles contenant « match /versets_globaux/{id} { allow read: if request.auth != null; } ».'
      : 'Vérifiez votre connexion internet puis réessayez.';
    $('#vue-catalogue').innerHTML = `
      ${banniereHTMLSync('revision', TITRES.catalogue[0], TITRES.catalogue[1])}
      <div class="verdict verdict-echec">${icone.alerte}<span>Le catalogue est inaccessible pour le moment (${echapper(code)}). ${explication}</span></div>
      <div style="text-align:center;margin-top:1rem"><button class="btn btn-secondaire" id="btn-reessayer-catalogue">Réessayer</button></div>`;
    activerBannieres();
    $('#btn-reessayer-catalogue').onclick = rendreCatalogue;
    return;
  }

  $('#vue-catalogue').innerHTML = `
    ${banniereHTMLSync('revision', TITRES.catalogue[0], `${versetsGlobaux.length} verset(s) partagé(s) — ajoutez-les à votre carnet.`)}
    <div class="barre-recherche">
      ${icone.recherche}
      <input id="recherche-catalogue" class="champ" type="search" placeholder="Rechercher un livre, une référence ou un mot-clé…" />
    </div>
    <div id="liste-catalogue" class="liste-versets"></div>`;
  activerBannieres();
  $('#recherche-catalogue').oninput = filtrerCatalogue;
  filtrerCatalogue();
}

function filtrerCatalogue() {
  const q = normaliser($('#recherche-catalogue').value);
  const resultats = versetsGlobaux.filter((v) =>
    !q || normaliser(v.texte).includes(q) ||
    normaliser(v.livre).includes(q) || normaliser(v.referenceComplete).includes(q));

  $('#liste-catalogue').innerHTML = resultats.length ? resultats.map((v) => {
    const dejaAjoute = progression.some((p) => p.id === v.id || p.versetRef === v.id);
    return `
      <article class="carte-verset">
        <header>
          <span class="reference">${echapper(v.referenceComplete)}</span>
          <span class="livre-mention">${echapper(v.livre)} ${v.chapitre}:${v.verset}</span>
        </header>
        <p class="texte-apercu">${echapper(v.texte)}</p>
        <footer>
          ${dejaAjoute
            ? `<span class="badge-ajoute">${icone.coche} Dans mon carnet</span>`
            : `<button data-ajouter="${v.id}" class="btn btn-primaire btn-petit">Ajouter à mon carnet</button>`}
          ${estAdmin() ? `<button data-supprimer="${v.id}" class="btn btn-danger btn-petit">Retirer</button>` : ''}
        </footer>
      </article>`;
  }).join('') : '<p class="etagere-vide">Aucun verset ne correspond à cette recherche.</p>';

  document.querySelectorAll('[data-ajouter]').forEach((b) => { b.onclick = () => ajouterAProgression(b.dataset.ajouter); });
  document.querySelectorAll('[data-supprimer]').forEach((b) => { b.onclick = () => supprimerVersetGlobal(b.dataset.supprimer, () => rendreCatalogue()); });
}

async function ajouterAProgression(versetId) {
  const { doc, setDoc, Timestamp } = await import('firebase/firestore');
  const v = versetsGlobaux.find((x) => x.id === versetId);
  if (!v) return;
  try {
    await setDoc(doc(db, 'users', etatSession.user.uid, 'progression', versetId), {
      versetRef: versetId,
      livre: v.livre, chapitre: v.chapitre, verset: v.verset, texte: v.texte,
      referenceComplete: v.referenceComplete,
      niveau: 0,
      prochaineRevision: Timestamp.fromDate(new Date()),
      derniereRevision: null,
      nombreSucces: 0, nombreEchecs: 0,
    });
    toast(`« ${v.referenceComplete} » ajouté à votre carnet.`, 'succes');
    progression = await chargerProgression();
    filtrerCatalogue();
  } catch (err) {
    toast('Ajout impossible : ' + err.code, 'erreur');
  }
}

async function supprimerVersetGlobal(versetId, rafraichir) {
  if (!confirm('Retirer définitivement ce verset du catalogue global ?')) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, 'versets_globaux', versetId));
    toast('Verset retiré du catalogue.', 'succes');
    versetsGlobaux = versetsGlobaux.filter((v) => v.id !== versetId);
    rafraichir?.();
  } catch (err) {
    toast('Suppression refusée : ' + err.code, 'erreur');
  }
}

async function rendreAdmin() {
  if (!versetsGlobaux.length) { try { await chargerCatalogue(); } catch { /* le panneau reste utilisable */ } }

  $('#vue-admin').innerHTML = `
    <h2 class="titre-vue">${TITRES.admin[0]}</h2>
    <p class="mention-vue">${TITRES.admin[1]}</p>
    <form id="form-verset" class="carte-form" onsubmit="return false">
      <div class="form-colonne">
        <label>Référence biblique (exemple : Romains 12:2)
          <div class="ligne-reference">
            <input id="champ-reference" class="champ" type="text" placeholder="Romains 12:2" />
            <button type="button" id="btn-resoudre" class="btn btn-secondaire">Récupérer le texte</button>
          </div>
        </label>
        <div id="apercu-verset"></div>
      </div>
    </form>
    <h3 class="titre-section">Versets publiés (${versetsGlobaux.length})</h3>
    <div class="liste-versets">
      ${versetsGlobaux.map((v) => `
        <article class="carte-verset">
          <header><span class="reference">${echapper(v.referenceComplete)}</span></header>
          <p class="texte-apercu">${echapper(v.texte)}</p>
          <footer><button data-supprimer="${v.id}" class="btn btn-danger btn-petit">Retirer</button></footer>
        </article>`).join('') || '<p class="etagere-vide">Le catalogue est vide pour l\'instant.</p>'}
    </div>`;

  $('#btn-resoudre').onclick = async () => {
    const refBrute = $('#champ-reference').value.trim();
    const zone = $('#apercu-verset');
    const btn = $('#btn-resoudre');
    if (!refBrute) {
      zone.innerHTML = `<div class="verdict verdict-info">${icone.info}<span>Saisissez d'abord une référence (exemple : Jean 3:16).</span></div>`;
      return;
    }
    btn.disabled = true;
    btn.innerHTML = `${icone.spinner} Récupération…`;
    zone.innerHTML = `<div class="verdict verdict-info">${icone.info}<span>Consultation de la source Louis Segond…</span></div>`;
    try {
      apercuVerset = await recupererVerset(refBrute);
      zone.innerHTML = `
        <div class="apercu-verset">
          <p class="reference">${echapper(apercuVerset.referenceComplete)}</p>
          <p class="texte">${echapper(apercuVerset.texte)}</p>
          <button id="btn-publier" class="btn btn-or">Publier dans le catalogue</button>
        </div>`;
      $('#btn-publier').onclick = publierVerset;
    } catch (err) {
      apercuVerset = null;
      zone.innerHTML = `<div class="verdict verdict-echec">${icone.alerte}<span>${echapper(err.message)}</span></div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Récupérer le texte';
    }
  };

  document.querySelectorAll('#vue-admin [data-supprimer]').forEach((b) => {
    b.onclick = () => supprimerVersetGlobal(b.dataset.supprimer, () => rendreAdmin());
  });
}

async function publierVerset() {
  if (!apercuVerset) return;
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'versets_globaux'), {
      livre: apercuVerset.livre, chapitre: apercuVerset.chapitre, verset: apercuVerset.verset,
      texte: apercuVerset.texte, referenceComplete: apercuVerset.referenceComplete,
      creePar: etatSession.user.uid, dateCreation: serverTimestamp(),
    });
    toast(`« ${apercuVerset.referenceComplete} » publié dans le catalogue.`, 'succes');
    apercuVerset = null;
    $('#apercu-verset').innerHTML = '';
    $('#champ-reference').value = '';
    await chargerCatalogue();
    rendreAdmin();
  } catch (err) {
    toast('Publication refusée : ' + err.code, 'erreur');
  }
}

// =====================================================================
// GESTION DES COMPTES (super admin)
// =====================================================================
async function rendreSuperAdmin() {
  $('#vue-superadmin').innerHTML = `
    <h2 class="titre-vue">${TITRES.superadmin[0]}</h2>
    <div class="chargement-vue">
      <svg class="ficelle" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20"/></svg>
      <p>Lecture de l'annuaire…</p>
    </div>`;

  const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
  let utilisateurs = [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    utilisateurs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    $('#vue-superadmin').innerHTML = `
      <h2 class="titre-vue">${TITRES.superadmin[0]}</h2>
      <div class="verdict verdict-echec">${icone.alerte}<span>Lecture impossible (${echapper(err.code || 'erreur')}).</span></div>`;
    return;
  }

  const uidCourant = etatSession.user.uid;
  $('#vue-superadmin').innerHTML = `
    <h2 class="titre-vue">${TITRES.superadmin[0]}</h2>
    <p class="mention-vue">${TITRES.superadmin[1]}</p>
    <div class="annuaire">
      ${utilisateurs.map((u) => {
        const soiMeme = u.id === uidCourant;
        return `
        <div class="ligne-utilisateur ${soiMeme ? 'ligne-soi' : ''}">
          <div class="qui">
            <strong>${echapper(u.displayName || u.email)}</strong>
            <span class="texte-doux">${echapper(u.email)}${soiMeme ? ' — votre compte' : ''}</span>
            <span class="role-mention">Rôle actuel : ${echapper(u.role || 'user')}</span>
          </div>
          <select data-role="${u.id}" ${soiMeme ? 'disabled' : ''}>
            ${['user', 'admin', 'super_admin'].map((r) =>
              `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r === 'user' ? 'Utilisateur' : r === 'admin' ? 'Gestionnaire' : 'Administrateur général'}</option>`).join('')}
          </select>
        </div>`;
      }).join('')}
    </div>`;

  document.querySelectorAll('[data-role]').forEach((sel) => {
    sel.onchange = async () => {
      if (sel.dataset.role === uidCourant) return;
      try {
        await updateDoc(doc(db, 'users', sel.dataset.role), { role: sel.value });
        toast('Rôle mis à jour.', 'succes');
        rendreSuperAdmin();
      } catch (err) {
        toast('Modification refusée : ' + err.code, 'erreur');
        rendreSuperAdmin();
      }
    };
  });
}

// =====================================================================
// ORCHESTRATION — attendre Firebase, puis réagir à la session
// =====================================================================

// L'écran de chargement ne s'affiche qu'après 300 ms : évite un flash
// lors des rechargements où la session est restaurée presque instantanément.
const temporisationEcran = setTimeout(() => {
  if (!etatSession.ready) $('#ecran-chargement').classList.remove('hidden');
}, 300);

initTermine.then(async ({ auth: authentification, db: base }) => {
  auth = authentification;
  db = base;

  // Unique source de vérité de la session : onAuthStateChanged.
  // Au rechargement (F5), Firebase restaure la session locale
  // (browserLocalPersistence) et rappelle ce gestionnaire avec l'utilisateur
  // — l'utilisateur n'est déconnecté QUE par un clic sur « Déconnexion ».
  const { onAuthStateChanged } = await import('firebase/auth');
  onAuthStateChanged(authentification, async (user) => {
    etatSession.user = user;
    etatSession.profil = null;
    if (user) {
      try { etatSession.profil = await ensureUserProfile(user); }
      catch (err) { console.error('[Session] Profil :', err); }
    }
    etatSession.ready = true;
    clearTimeout(temporisationEcran);
    peindreSession();
  });
}).catch(() => {});

// Échec d'initialisation : message clair au lieu d'un spinner éternel.
document.addEventListener('firebase:echec-init', () => {
  clearTimeout(temporisationEcran);
  $('#ecran-chargement').innerHTML = `
    <div class="verdict verdict-echec" style="max-width:420px">${icone.alerte}
      <span>Impossible de joindre le service de données.<br />
      Vérifiez votre connexion internet puis rechargez la page.</span>
    </div>
    <button class="btn btn-or" onclick="window.location.reload()">Recharger la page</button>`;
});

function peindreSession() {
  $('#ecran-chargement').classList.toggle('hidden', etatSession.ready);
  $('#pied-page').classList.toggle('hidden', !etatSession.ready);
  if (!etatSession.ready) return;

  if (!etatSession.user) {
    $('#zone-app').classList.add('hidden');
    $('#vue-auth').classList.remove('hidden');
    rendreAuth();
    return;
  }

  $('#vue-auth').classList.add('hidden');
  $('#zone-app').classList.remove('hidden');
  rendreCoquille();
  naviguer('revision');
}

document.addEventListener('firebase:error', (e) => toast(e.detail, 'erreur'));
document.addEventListener('firebase:reconnected', () => toast('Connexion rétablie.', 'succes'));

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-nav]');
  if (b && !b.classList.contains('onglet')) naviguer(b.dataset.nav);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
