# Commu_Parent

Application de liaison école-parents : chaque parent a un identifiant unique et un email pro,
avec messagerie interne temps réel, notifications in-app et emails automatiques.

## Stack
- Next.js 14 + TypeScript + Tailwind
- Firebase Realtime Database (données propres à ce projet, indépendantes du Firestore de ScolarHub)
- Firebase Auth (parents via ID unique, staff via email/mot de passe)
- Cloudinary (pièces jointes : justificatifs, bulletins, photos)
- Cloud Functions + Resend (emails automatiques sur nouvelle notification)
- Service worker (PWA installable + page hors-ligne), voir section dédiée plus bas
- Vercel (déploiement)

## Mise en route

1. **Firebase**
   - Utiliser le projet Firebase `scolar-hub` existant (ou en créer un dédié si préférence).
   - Activer Realtime Database (mode verrouillé) et importer `database.rules.json`.
   - Activer Authentication > Email/Password.
   - Custom claims requis sur chaque utilisateur Auth :
     - Parent : `{ parentId: "PAR-2026-0042" }` — posé automatiquement par `/admin/create-parent`.
     - Staff : `{ staff: true, role: "admin" | "professeur", ecoleId: "..." }` — posé
       automatiquement par `/admin/create-staff` (voir section « Super Admin » plus bas
       pour le bootstrap du tout premier compte).

2. **Cloudinary**
   - Créer un upload preset **unsigned** (Settings > Upload > Upload presets).
   - Renseigner `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` et `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

3. **Variables d'environnement**
   - Copier `.env.example` vers `.env.local` et remplir les valeurs Firebase/Cloudinary.
   - Sur Vercel : importer les variables manuellement dans le dashboard du projet
     (pas d'import automatique possible), penser à `NEXT_PUBLIC_FIREBASE_DATABASE_URL` séparément.

4. **Cloud Functions (emails automatiques)**
   ```bash
   cd functions
   npm install
   firebase functions:secrets:set RESEND_API_KEY
   firebase deploy --only functions
   ```

5. **Développement local**
   ```bash
   npm install
   npm run dev
   ```

## Génération de l'ID unique et de l'email pro (côté admin, à implémenter)

Recommandation : `PAR-{année}-{compteur sur 4 chiffres}`, ex. `PAR-2026-0042`.
L'email pro peut être un simple alias d'affichage (`prenom.nom.042@commu-parent.app`)
utilisé comme expéditeur visible dans les emails Resend — il ne nécessite pas de vraie
boîte mail entrante tant que toute la communication remonte passe par la messagerie in-app.

## Structure des données (RTDB)

```
parents/{parentId}
students/{studentId}
messages/{studentId}_{parentId}/{messageId}
notifications/{parentId}/{notifId}
schools/{schoolId}
evaluations/{studentId}/{evaluationId}
groups/{groupId}
staff/{uid}
```

## ⚠️ Mode ouvert temporaire (authentification désactivée)

`lib/authConfig.ts` exporte `AUTH_DISABLED = true` : tant que ce flag vaut `true`,
**aucune connexion n'est requise** pour créer des parents, élèves, professeurs ou
évaluations, ni pour consulter les performances de n'importe quel élève — la page
d'accueil (`/`) donne un accès direct à tout ça. `lib/adminAuth.ts` (`requireStaff`)
et `components/GardeSuperAdmin.tsx` court-circuitent leurs vérifications tant que ce
flag est actif.

C'est une décision assumée pour le moment (démo/tests), mais **dangereuse en
production réelle** : n'importe qui connaissant l'URL peut lire et écrire toutes les
données de l'app via les routes `/api/admin/*`. Les règles RTDB
(`database.rules.json`) restent, elles, inchangées et continuent d'exiger une
authentification pour les accès **directs** côté client (elles ne protègent pas les
routes `/api/admin/*`, qui passent par l'Admin SDK).

**Pour réactiver l'authentification Super Admin** : repasser `AUTH_DISABLED` à
`false` dans `lib/authConfig.ts`. Tout le système Super Admin décrit ci-dessous reste
en place et redevient actif immédiatement (aucune autre modification nécessaire).

## Super Admin

`prozizou298@gmail.com` est le Super Admin de l'établissement. Un compte Super Admin
est un compte staff (Firebase Auth email + mot de passe) avec les custom claims
`{ staff: true, role: "admin" }`. Il peut créer des comptes parents, élèves et
personnel (professeurs et autres Super Admin) depuis `/admin`.

**Bootstrap du tout premier compte Super Admin :**
1. Définir `ADMIN_API_SECRET` dans les variables d'environnement (Vercel ou `.env.local`).
2. Aller sur `/admin/create-staff`, saisir ce code admin + le nom, l'email
   (`prozizou298@gmail.com`) et le rôle "Super Admin".
3. Un mot de passe provisoire est généré et affiché une seule fois : le transmettre à la
   personne concernée pour sa première connexion sur `/admin/login`, puis lui faire
   changer ce mot de passe (Firebase Auth > réinitialisation) dès que possible.

**Une fois un Super Admin connecté**, `ADMIN_API_SECRET` n'est plus utilisé : toutes les
pages `/admin/*` (créer un parent, un élève, un membre du personnel, une évaluation)
authentifient leurs appels avec le token de session Super Admin
(`Authorization: Bearer <idToken>`), vérifié côté serveur par `lib/adminAuth.ts`. Un
Super Admin peut créer d'autres comptes staff (professeurs ou Super Admin
supplémentaires) depuis `/admin/create-staff` sans code admin.

Les règles RTDB (`database.rules.json`, noeud `staff/{uid}`) n'autorisent l'écriture
de fiches staff qu'aux comptes portant déjà le rôle `"admin"` — cohérent avec le fait
que la création passe de toute façon par l'API serveur (Admin SDK), qui applique la
même règle via `requireStaff(req, "admin")`.

## Analyse des performances scolaires

Méthodologie d'analyse pédagogique inspirée du rapport *Cambridge Primary Checkpoint*
(échelle de score 0–50, niveaux Basic/Aspiring/Good/High/Outstanding, décomposition
Matière → Domaine → Sous-compétence → points obtenus/possibles, comparaisons
groupe/établissement/référence externe, évolution dans le temps).

- **`lib/performance.ts`** — moteur de calcul pur (pourcentages, niveau de performance,
  forces/difficultés, comparaisons, distribution des niveaux dans un groupe, tendance
  d'évolution). Point d'entrée : `synthetiserEvaluation(evaluation)`.
- **`lib/evaluationParser.ts`** — parseur du format texte utilisé par le staff pour
  saisir une matière (`Matiere: / Score: / Domaine: / Sous:`), voir
  `/admin/create-evaluation`.
- **`types/index.ts`** — modèle de données (`Evaluation`, `MatiereResult`,
  `DomaineResult`, `SousCompetenceResult`, `ComparaisonScores`).
- **`/admin/create-evaluation`** — saisie staff d'une évaluation pour un élève
  (réservée au Super Admin, voir section « Super Admin » ci-dessus).
- **`/performance/{studentId}`** — vue parent simplifiée : score global, niveau,
  pourcentage par matière, points forts, points à travailler, progression depuis la
  dernière évaluation. Respecte les mêmes règles RTDB que `students/{studentId}` : un
  parent ne voit que les évaluations de ses propres enfants.
- **`components/ObjectifsPerformance.tsx`** — répond directement aux cinq questions
  fondamentales de la méthodologie (niveau, comparaison groupe, comparaison
  établissement/référence externe, compétences maîtrisées/à renforcer, évolution dans
  le temps) à partir de l'historique d'évaluations d'un élève. Utilisé sur la page
  d'accueil (`/`, voir section « Mode ouvert temporaire » ci-dessus).
- **`/api/admin/evaluations?studentId=...`** — lit les évaluations d'un élève (Admin
  SDK), utilisé par la page d'accueil pour alimenter `ObjectifsPerformance`.

Une vue détaillée côté enseignant/direction (domaines, sous-compétences, comparaisons
complètes, distribution de classe) reste à construire au-delà de la saisie admin
actuelle (cf. « À faire ensuite » ci-dessous). `lib/performance.ts` fournit déjà tout
le calcul nécessaire pour l'alimenter.

## Service worker (PWA)

- **`public/sw.js`** — cache uniquement les assets vraiment statiques (icône, manifest,
  fichiers `_next/static` content-hashés) et sert `public/offline.html` en secours quand
  la navigation échoue faute de réseau. Ne met **jamais** en cache les pages HTML ni les
  appels Firebase/Cloudinary : l'app est trop dynamique (temps réel) pour ça.
- **`public/manifest.json`** + **`public/icons/icon.svg`** — installabilité PWA (icône
  provisoire "CP" en SVG, à remplacer par le vrai logo si besoin).
- **`public/icons/apple-touch-icon.png`** (180×180, généré depuis
  `public/icons/icon-apple.svg`) — icône "Ajouter à l'écran d'accueil" sur iOS, qui
  ignore les icônes SVG et le manifest. Fond plein, sans coins arrondis ni transparence
  (iOS applique lui-même le masque). Si l'icône "CP" provisoire est remplacée par le
  vrai logo, régénérer ce PNG à partir du nouveau design.
- **`components/ServiceWorkerRegistration.tsx`** — enregistre le service worker
  uniquement en production (jamais en `next dev`, pour ne pas gêner le hot-reload).
- **Bump de version** : après un déploiement qui change les assets mis en cache,
  incrémenter `CACHE_VERSION` dans `public/sw.js` (`"v1"` → `"v2"`, etc.). Au prochain
  `activate`, le service worker supprime tous les caches de l'ancienne version.

## À faire ensuite
- **Repasser `AUTH_DISABLED` à `false`** (`lib/authConfig.ts`) avant tout déploiement
  destiné à de vraies données — voir « Mode ouvert temporaire » ci-dessus.
- Vue staff détaillée des performances (domaines/sous-compétences, comparaisons,
  distribution de classe, évolution pluriannuelle de l'établissement) — accessible aux
  professeurs, pas seulement au Super Admin.
- Accès `/admin/*` différencié par rôle : aujourd'hui toutes les routes exigent
  `role === "admin"` ; un rôle "professeur" pourrait par exemple saisir des évaluations
  sans avoir le droit de créer des comptes.
- Envoi de notifications, vue messagerie globale côté staff.
- Génération automatique de l'ID unique + email pro à l'inscription d'un parent.
- Notifications push (FCM) côté client.
