import * as functions from "firebase-functions/v2/database";
import { getDatabase } from "firebase-admin/database";
import { initializeApp } from "firebase-admin/app";
import { Resend } from "resend";

initializeApp();

// Clé stockée en secret Firebase Functions : firebase functions:secrets:set RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Déclenchée à chaque nouvelle notification écrite dans /notifications/{parentId}/{notifId}.
 * Envoie un email au parent (si notifPrefs.email est activé) et laisse la notif
 * disponible pour l'affichage in-app / push côté client.
 */
export const onNewNotification = functions.onValueCreated(
  "/notifications/{parentId}/{notifId}",
  async (event) => {
    const { parentId } = event.params;
    const notif = event.data.val();

    const db = getDatabase();
    const parentSnap = await db.ref(`parents/${parentId}`).get();
    if (!parentSnap.exists()) return;

    const parent = parentSnap.val();
    if (!parent.notifPrefs?.email || !parent.emailReel) return;

    await resend.emails.send({
      from: "Commu_Parent <notifications@commu-parent.app>",
      to: parent.emailReel,
      subject: `[Commu_Parent] ${notif.type} — ${parent.nom}`,
      text: notif.contenu
    });
  }
);
