// =====================================================================
//  firebase-config.js — Initialisation Firebase ultra-rapide (< 1 s)
//  Stratégie anti-blocage :
//   1. Firebase est importé DYNAMIQUEMENT (les modules ne ralentissent
//      jamais le premier rendu de la page) ;
//   2. le cache persistant (IndexedDB) dispose d'un garde de 500 ms :
//      au-delà, bascule immédiate sur le cache mémoire ;
//   3. la persistance de session (browserLocalPersistence) est ATTENDUE
//      avant de résoudre l'initialisation : la session survit à F5.
// =====================================================================

// ---------------------------------------------------------------------
// CONFIGURATION — Vos identifiants Firebase
// ---------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCQ_C8YhvsKK2sjEhxtTN2B_I-TDB3o1UA",
  authDomain: "bible-revision-app.firebaseapp.com",
  projectId: "bible-revision-app",
  storageBucket: "bible-revision-app.firebasestorage.app",
  messagingSenderId: "445219533266",
  appId: "1:445219533266:web:46b9bf6cccf30bdaf6d80b",
  measurementId: "G-X9GDVTZ4LV"
};

// Email du compte fondateur : doit correspondre exactement à la valeur
// autorisée dans firestore.rules (function isFounderEmail()).
export const FONDATEUR_EMAIL = 'grandmaitrecontact@proton.me';

// ---------------------------------------------------------------------
// État exporté : les modules consomment ces références APRES initTermine()
// ---------------------------------------------------------------------
export let app = null;
export let auth = null;
export let db = null;

/**
 * Promesse d'initialisation — résolue dès que Firebase est prêt ET que la
 * persistance de session locale est active.
 */
export let initTermine = null;

/**
 * Course entre une promesse et un chronomètre : rejette si `ms` dépassé.
 */
function avecDelaiMax(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rejeter) =>
      setTimeout(() => rejeter(new Error(`délai dépassé (${ms} ms)`)), ms)),
  ]);
}

/**
 * Choisit le cache Firestore le plus rapide disponible.
 * - IndexedDB absent (navigation privée…) → mémoire immédiatement.
 * - persistentLocalCache() > 500 ms ou erreur → mémoire.
 */
async function creerCache(firestoreMod) {
  const { persistentLocalCache, memoryLocalCache } = firestoreMod;
  const indexedDBDisponible =
    typeof indexedDB !== 'undefined' && indexedDB !== null;

  if (!indexedDBDisponible) {
    console.info('[Firestore] IndexedDB indisponible — cache mémoire.');
    return memoryLocalCache();
  }
  try {
    const cache = await avecDelaiMax(
      Promise.resolve(persistentLocalCache()),
      500,
    );
    console.info('[Firestore] Cache persistant actif.');
    return cache;
  } catch (err) {
    console.warn('[Firestore] Cache persistant abandonné — cache mémoire :', err.message);
    return memoryLocalCache();
  }
}

/**
 * Active la persistance de session locale (cookie IndexedDB de Firebase
 * Auth) et ATTEND le résultat : la session survit au rechargement (F5)
 * et à la fermeture du navigateur. La déconnexion ne se produit QUE sur
 * un clic explicite sur « Déconnexion » (signOut dans app.js).
 */
async function activerPersistanceSession(authMod, authentification) {
  const { setPersistence, browserLocalPersistence } = authMod;
  try {
    await setPersistence(authentification, browserLocalPersistence);
    console.info('[Auth] Session locale persistante active.');
  } catch (err) {
    // Navigation privée stricte ou stockage bloqué : la session ne
    // survivra pas au rechargement — on prévient l'utilisateur.
    console.error('[Auth] Persistance de session refusée :', err);
    document.dispatchEvent(new CustomEvent('firebase:error', {
      detail: 'Votre navigateur bloque la conservation de session : ' +
        'vous devrez vous reconnecter à chaque rechargement. ' +
        'Autorisez les cookies et le stockage local pour éviter cela.',
    }));
  }
}

/**
 * Initialise Firebase en arrière-plan.
 * @returns {Promise<{app, auth, db}>}
 */
async function initialiser() {
  const t0 = performance.now();

  // Import dynamique : le navigateur charge ces modules en parallèle
  // du rendu, sans bloquer l'affichage initial.
  const [appMod, authMod, firestoreMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);

  const { initializeApp } = appMod;
  const { getAuth } = authMod;
  const { initializeFirestore } = firestoreMod;

  const application = initializeApp(firebaseConfig);
  const cache = await creerCache(firestoreMod);
  const base = initializeFirestore(application, { localCache: cache });
  const authentification = getAuth(application);

  // La persistance doit être active AVANT le premier onAuthStateChanged :
  // sinon un rechargement restaurerait une session volatille.
  await activerPersistanceSession(authMod, authentification);

  // Diagnostic réseau
  window.addEventListener('offline', () => document.dispatchEvent(
    new CustomEvent('firebase:error', {
      detail: 'Vous êtes hors ligne — certaines données peuvent être obsolètes.',
    })));
  window.addEventListener('online', () => document.dispatchEvent(
    new CustomEvent('firebase:reconnected')));

  app = application;
  auth = authentification;
  db = base;

  console.info(`[Firebase] Prêt en ${(performance.now() - t0).toFixed(0)} ms.`);
  document.dispatchEvent(new CustomEvent('firebase:pret'));
  return { app, auth, db };
}

initTermine = initialiser().catch((err) => {
  console.error('[Firebase] Échec d\'initialisation :', err);
  document.dispatchEvent(new CustomEvent('firebase:error', {
    detail: 'Impossible de joindre le service de données. ' +
      'Vérifiez votre connexion puis rechargez la page.',
  }));
  // Signaler l'échec à l'écran de chargement (voir app.js)
  document.dispatchEvent(new CustomEvent('firebase:echec-init'));
  throw err;
});

// ---------------------------------------------------------------------
// Profil /users/{uid} — création à la première connexion.
// Les règles Firestore garantissent : role "user" pour tous, sauf
// l'email fondateur (super_admin).
// ---------------------------------------------------------------------
export async function ensureUserProfile(user) {
  const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import(
    'firebase/firestore'
  );
  const isFondateur =
    (user.email || '').toLowerCase() === FONDATEUR_EMAIL.toLowerCase();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const donnees = snap.data();

    // -------------------------------------------------------------
    // RESTAURATION FORCÉE DES DROITS DU FONDATEUR :
    // à chaque connexion, si l'email correspond à FONDATEUR_EMAIL, le
    // rôle super_admin est réattribué dans Firestore — le compte
    // fondateur ne peut plus jamais perdre ses privilèges.
    // -------------------------------------------------------------
    if (isFondateur && donnees.role !== 'super_admin') {
      try {
        await updateDoc(ref, { role: 'super_admin' });
        console.info('[Firebase] Privilèges du fondateur restaurés (super_admin).');
      } catch (err) {
        console.warn('[Firebase] Restauration du rôle refusée :', err.code);
      }
      return { ...donnees, role: 'super_admin' };
    }

    // Connexion récurrente : aucune donnée de progression n'est écrasée,
    // on se contente d'horodater la dernière connexion.
    try {
      await updateDoc(ref, { derniereConnexion: serverTimestamp() });
    } catch { /* champ non listé dans d'anciennes règles : non bloquant */ }
    return donnees;
  }

  const profil = {
    uid: user.uid,
    email: user.email || '',
    displayName:
      user.displayName || (user.email || '').split('@')[0] || 'Utilisateur',
    role: isFondateur ? 'super_admin' : 'user',
    // Champs sociaux / de suivi
    avatar: 'aurore',
    couleurCouverture: 'aurore',
    versetFavori: '',
    photoURL: user.photoURL || '',
    progression: {
      versetsAppris: 0,
      points: 0,
      serieJours: 0,
      dernierJour: '',
      reussites: 0,          // total d'épreuves de validation réussies
      echecs: 0,             // total d'échecs assumés (à revoir)
      derniereActivite: null // horodatage de la dernière révision validée
    },
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, profil);
    return profil;
  } catch (err) {
    console.warn('[Firebase] Création du profil refusée :', err.code);
    return { ...profil, role: 'user' };
  }
}
