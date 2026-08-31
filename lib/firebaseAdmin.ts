import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getDatabase, Database } from "firebase-admin/database";

// Ce module ne doit JAMAIS être importé depuis un composant client.
// Initialisation paresseuse : ne s'exécute qu'à la première requête réelle,
// jamais pendant `next build` (évite les erreurs de credentials au build-time).
let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  // Message clair au lieu de l'erreur cryptique de firebase-admin ("Service account
  // object must contain a string project_id property") quand une variable manque —
  // voir README > "Mise en route" > 3. Variables d'environnement.
  const manquantes = [
    !projectId && "FIREBASE_ADMIN_PROJECT_ID",
    !clientEmail && "FIREBASE_ADMIN_CLIENT_EMAIL",
    !privateKey && "FIREBASE_ADMIN_PRIVATE_KEY",
    !databaseURL && "NEXT_PUBLIC_FIREBASE_DATABASE_URL"
  ].filter(Boolean);
  if (manquantes.length > 0) {
    throw new Error(
      `Configuration Firebase Admin incomplète : variable(s) d'environnement manquante(s) : ${manquantes.join(", ")}. ` +
        "À définir dans .env.local (dev) ou dans les Environment Variables du projet Vercel (prod/preview), " +
        "voir README > Mise en route."
    );
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL
  });
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Database {
  return getDatabase(getAdminApp());
}
