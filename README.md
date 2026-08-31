# Commu_Parent

Application de liaison école-parents : chaque parent a un identifiant unique et un email pro,
avec messagerie interne temps réel, notifications in-app et emails automatiques.

## Stack
- Next.js 14 + TypeScript + Tailwind
- Firebase Realtime Database (données propres à ce projet, indépendantes du Firestore de ScolarHub)
- Firebase Auth (parents via ID unique, staff via email/mot de passe)
- Cloudinary (pièces jointes : justificatifs, bulletins, photos)
- Cloud Functions + Resend (emails automatiques sur nouvelle notification)
- Vercel (déploiement)

## Mise en route

1. **Firebase**
   - Utiliser le projet Firebase `scolar-hub` existant (ou en créer un dédié si préférence).
   - Activer Realtime Database (mode verrouillé) et importer `database.rules.json`.
   - Activer Authentication > Email/Password.
   - Custom claims requis sur chaque utilisateur Auth :
     - Parent : `{ parentId: "PAR-2026-0042" }`
     - Staff : `{ staff: true, role: "admin" | "professeur", ecoleId: "..." }`
     - À définir via une Cloud Function `beforeSignIn` ou un script admin (Admin SDK `setCustomUserClaims`).

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
```

## À faire ensuite
- Interface staff (admin/professeur) : création de parents, envoi de notifications, vue messagerie globale.
- Script d'attribution des custom claims Auth (Admin SDK).
- Génération automatique de l'ID unique + email pro à l'inscription d'un parent.
- Notifications push (FCM) côté client.
