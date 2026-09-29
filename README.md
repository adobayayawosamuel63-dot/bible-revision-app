# 📖 Versets & Mémoire — Répétition espacée (Louis Segond 1910)

PWA d'apprentissage et de révision de versets bibliques (LSG 1910) avec
répétition espacée, catalogue global et contrôle d'accès par rôles.

## Stack

- **Frontend** : HTML + Tailwind (CDN) + JavaScript ES6 modules — hébergeable sur GitHub Pages
- **Backend** : Firebase Authentication (Email/Mot de passe) + Cloud Firestore
- **API Bible** : [getBible.net](https://getbible.net) — traduction `ls1910`, CORS ouvert, **sans clé API**
  - Résolution automatique des références françaises : `Jean 3:16`, `1 Co 13:4`, `Ps 23:1`…

## Structure

```
├── index.html               # Coquille SPA + styles
├── firestore.rules          # Règles de sécurité Firestore (à déployer)
├── manifest.webmanifest     # Manifeste PWA
├── sw.js                    # Service Worker
└── src/
    ├── firebase-config.js   # Init Firebase + persistance + profil utilisateur
    ├── auth.js              # Connexion / inscription / reset / session
    ├── spaced-repetition.js # Algorithme Leitner (helper isolé)
    ├── bible-api.js         # Résolution de références via getBible
    └── app.js               # Routeur + vues + logique UI
```

## 1. Créer le projet Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → **Ajouter un projet**.
2. **Authentication** → Sign-in method → activer **Email/Password** **et** **Google**.
3. **Firestore Database** → Créer (mode production).
4. **Authentication → Settings → Authorized domains** → ajouter votre domaine
   (ex. `votre-pseudo.github.io`) — indispensable pour la connexion Google.
5. **Paramètres du projet** → Vos applications → **Web** → copier la config.

> Le premier login Google crée automatiquement le profil dans `users`
> (rôle `user`, photo Google reprise) sans jamais écraser une progression
> existante lors des connexions suivantes.

## 2. Configurer l'application

Dans `src/firebase-config.js`, remplacez :

```js
const firebaseConfig = {
  apiKey: 'VOTRE_API_KEY',
  authDomain: 'VOTRE_PROJECT.firebaseapp.com',
  projectId: 'VOTRE_PROJECT_ID',
  // …
};
```

## 3. Déployer les règles de sécurité

Copiez le contenu de `firestore.rules` dans
**Console Firebase → Firestore → Règles → Publier**
(ou `firebase deploy --only firestore:rules` avec la CLI).

Les règles garantissent :

| Ressource | user | admin | super_admin |
|---|---|---|---|
| Lire `/versets_globaux` | ✅ | ✅ | ✅ |
| Écrire `/versets_globaux` | ❌ | ✅ | ✅ |
| Lire tous les `/users` | ❌ | ✅ | ✅ |
| Modifier un `role` | ❌ | ❌ | ✅ (sauf le sien) |
| Lire/écrire sa `/progression` | ✅ (soi-même) | ✅ (soi-même) | ✅ (soi-même) |

## 4. Compte fondateur (Super Admin)

L'email déclaré dans `firestore.rules` (`isFounderEmail()`) et
`src/firebase-config.js` (`FONDATEUR_EMAIL`) est **grandmaitrecontact@proton.me**.

Au premier login de cet email, l'application crée automatiquement le profil
avec `role: "super_admin"`. Tout autre compte est créé simple `user`.

> Pour changer d'email fondateur : modifiez-le **aux deux endroits**,
> puis publiez les règles.

## 5. Héberger sur GitHub Pages

1. Pousser le dépôt sur GitHub.
2. **Settings → Pages → Source : `main` / racine**.
3. L'app est servie sur `https://<utilisateur>.github.io/<repo>/`.

Aucun build n'est nécessaire (Tailwind via CDN, SDK Firebase via import CDN —
les imports nus `firebase/app` fonctionnent car les navigateurs modernes
résolvent les modules via l'import map déclarée dans `index.html`).

> ⚠️ Si votre navigateur cible ne supporte pas les import maps, ajoutez
> Firebase via l'import map gmaps ou convertissez le projet avec Vite.

## Algorithme de répétition espacée

| Niveau | Intervalle |
|---|---|
| N0 | +1 jour |
| N1 | +3 jours |
| N2 | +7 jours |
| N3 | +14 jours |
| N4 | +30 jours |
| N5 | +90 jours (maîtrisé) |

- **Réussi** → niveau +1 (max N5), `prochaineRevision` = nouvel intervalle
- **À revoir** → retour N0, `prochaineRevision` = demain

La logique est isolée dans `src/spaced-repetition.js` (aucune dépendance
Firebase, testable unitairement).

## Modes d'apprentissage — double validation obligatoire

Un verset n'est validé qu'après la réussite de **deux épreuves différentes**,
toutes les deux à 100 % :

1. **Saisie mot à mot** — recopier le verset de mémoire (correction surlignée
   mot par mot, initiales disponibles en aide) ;
2. **Reconstitution dans l'ordre** — remettre les mots mélangés dans le bon
   ordre en les touchant.

Tant que les deux épreuves ne sont pas réussies, le bouton **« Valider la
révision »** reste verrouillé. Le test d'initiales reste disponible comme
aide/entraînement supplémentaire.

Le bouton **« S'entraîner à nouveau »** permet de refaire les épreuves autant
de fois que souhaité, sans impact sur l'historique ni sur les niveaux.

## Design

Charte « Bleu Nuit & Or » premium : fond profond (#0F172A), cartes (#1E293B)
bordées d'un filet ambré translucide, accents or chaud (#D97706 → #F59E0B),
titres ivoire (#F8FAFC), sous-titres gris (#94A3B8). Typographies : Playfair
Display pour les versets et titres, Inter pour l'interface. Icônes SVG sobres,
aucun emoji. Aucun framework CSS — styles purs, sans CDN Tailwind.

Navigation : barre unique de 64 px, jamais de retour à la ligne — les liens
d'administration (Gestion des versets, Gestion des comptes) sont regroupés
dans un menu déroulant « Administration », et le menu hamburger prend le
relais dès que l'écran fait moins de 1280 px.

## Images des bannières

Trois photos locales (crédits Unsplash) habillent les sections, en fond avec
un voile dégradé sombre garantissant la lisibilité du texte ivoire :

| Fichier (à la racine du projet) | Sections |
|---|---|
| `jannis-nobauer-qls4Edt9UbE-unsplash.jpg` | Salle de révision + Catalogue |
| `nik-shuliahin-AXos3O7fRGk-unsplash.jpg` | Entraînement libre + cartes d'épreuve |
| `nate-steele-FPdkDrq9X-4-unsplash.jpg` | Classement (bandeau communautaire) |

Si un fichier est absent, une illustration SVG de repli s'affiche
automatiquement : la page reste impeccable en toutes circonstances.

## Performance

- Firebase est chargé **dynamiquement** (`import()`) : le premier rendu de la
  page n'attend aucun SDK ;
- le cache persistant Firestore dispose d'une **garde de 500 ms** : au-delà,
  bascule immédiate sur le cache mémoire (jamais de page figée) ;
- typographies Google Fonts avec `display=swap` ;
- illustrations 100 % SVG inline (zéro image distante).

## Profil & classement

- **Profil** : nom affiché, avatar coloré (6 palettes), couverture illustrée
  (4 paysages SVG : aurore dorée, manuscrit, nuit étoilée, olivier), verset
  favori ;
- **Niveaux** : Disciple (0) → Serviteur (5) → Pilier (15) → Érudit (30) →
  Sagesse (60 versets appris) ;
- **Points** : +10 par révision validée ; **série** de jours consécutifs ;
- **Classement public** : podium + top 50 trié par points (profils publics
  consultables en touchant une ligne). Les règles Firestore ouvrent la lecture
  des profils aux membres connectés — l'email y figure : retirez-le de
  l'affichage si vous souhaitez le rendre privé.
