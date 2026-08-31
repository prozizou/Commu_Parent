/**
 * Script admin : crée un compte parent complet.
 * - Compte Firebase Auth (login = ID unique, via le pseudo-email interne)
 * - Custom claim { parentId } pour les règles de sécurité RTDB
 * - Fiche /parents/{idUnique} dans la Realtime Database
 *
 * Utilisation :
 *   node scripts/create-parent.js "Fatou Diop" "+221771234567" "fatou.diop@gmail.com"
 *
 * Prérequis :
 *   1. npm install firebase-admin --save-dev (à la racine du projet)
 *   2. Télécharger la clé de service : Firebase Console > Paramètres du projet
 *      > Comptes de service > Générer une nouvelle clé privée
 *   3. Sauvegarder le fichier téléchargé en tant que serviceAccountKey.json
 *      à la racine du projet (déjà ignoré par .gitignore — NE JAMAIS committer ce fichier)
 */

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://scolar-hub-default-rtdb.firebaseio.com"
});

const INTERNAL_AUTH_DOMAIN = "commu-parent.internal";

function genererMotDePasseProvisoire() {
  return Math.random().toString(36).slice(-10) + "A1!";
}

function genererIdUnique(compteur) {
  const annee = new Date().getFullYear();
  return `PAR-${annee}-${String(compteur).padStart(4, "0")}`;
}

async function prochainCompteur() {
  const snap = await admin.database().ref("parents").get();
  return snap.exists() ? Object.keys(snap.val()).length + 1 : 1;
}

async function creerParent(nom, telephone, emailReel) {
  const compteur = await prochainCompteur();
  const idUnique = genererIdUnique(compteur);
  const motDePasse = genererMotDePasseProvisoire();
  const internalEmail = `${idUnique.toLowerCase()}@${INTERNAL_AUTH_DOMAIN}`;

  // 1. Compte Auth
  const userRecord = await admin.auth().createUser({
    email: internalEmail,
    password: motDePasse,
    displayName: nom
  });

  // 2. Custom claim (permet aux règles RTDB de vérifier auth.token.parentId)
  await admin.auth().setCustomUserClaims(userRecord.uid, { parentId: idUnique });

  // 3. Fiche dans /parents
  const slug = nom.toLowerCase().replace(/\s+/g, ".");
  await admin.database().ref(`parents/${idUnique}`).set({
    idUnique,
    nom,
    telephone,
    emailPro: `${slug}.${String(compteur).padStart(4, "0")}@commu-parent.app`,
    emailReel: emailReel || null,
    enfants: {},
    notifPrefs: { email: !!emailReel, push: true, absence: true, notes: true, devoirs: true },
    createdAt: Date.now()
  });

  console.log("Compte parent créé avec succès :");
  console.log(`  ID de connexion : ${idUnique}`);
  console.log(`  Mot de passe provisoire : ${motDePasse}`);
  console.log(`  (à transmettre au parent, à faire changer dès la première connexion)`);
}

const [, , nom, telephone, emailReel] = process.argv;
if (!nom || !telephone) {
  console.error('Usage : node scripts/create-parent.js "Nom Prénom" "+221..." "email@optionnel.com"');
  process.exit(1);
}

creerParent(nom, telephone, emailReel)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erreur :", err.message);
    process.exit(1);
  });
