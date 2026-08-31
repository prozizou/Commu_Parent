import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";

const INTERNAL_AUTH_DOMAIN = "commu-parent.internal";

function genererMotDePasseProvisoire() {
  return Math.random().toString(36).slice(-10) + "A1!";
}

async function genererIdUnique() {
  const annee = new Date().getFullYear();
  const snap = await getAdminDb().ref("parents").get();
  const compteur = snap.exists() ? Object.keys(snap.val()).length + 1 : 1;
  return `PAR-${annee}-${String(compteur).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  // Réservé au Super Admin (compte staff Firebase Auth, claim role="admin").
  try {
    await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { nom, telephone, emailReel } = await req.json();
  if (!nom || !telephone) {
    return NextResponse.json({ error: "Nom et téléphone requis." }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const idUnique = await genererIdUnique();
    const motDePasse = genererMotDePasseProvisoire();
    const internalEmail = `${idUnique.toLowerCase()}@${INTERNAL_AUTH_DOMAIN}`;

    const userRecord = await adminAuth.createUser({
      email: internalEmail,
      password: motDePasse,
      displayName: nom
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { parentId: idUnique });

    const slug = nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // retire les accents
      .replace(/[^a-z0-9]+/g, "."); // ne garde que lettres/chiffres, "." comme séparateur
    const compteurMatch = idUnique.match(/(\d{4})$/);
    const compteurStr = compteurMatch ? compteurMatch[1] : "0000";

    await adminDb.ref(`parents/${idUnique}`).set({
      idUnique,
      nom,
      telephone,
      emailPro: `${slug}.${compteurStr}@commu-parent.app`,
      emailReel: emailReel || null,
      enfants: {},
      notifPrefs: { email: !!emailReel, push: true, absence: true, notes: true, devoirs: true },
      createdAt: Date.now()
    });

    return NextResponse.json({ idUnique, motDePasse });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
