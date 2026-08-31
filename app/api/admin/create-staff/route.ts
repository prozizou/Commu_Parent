import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import type { StaffRole } from "@/types";

export const runtime = "nodejs";

function genererMotDePasseProvisoire() {
  return Math.random().toString(36).slice(-10) + "A1!";
}

export async function POST(req: NextRequest) {
  // Deux façons d'autoriser la création d'un compte staff :
  //  1. ADMIN_API_SECRET (en-tête x-admin-secret) — uniquement pour créer le tout premier
  //     compte Super Admin, avant qu'aucun compte staff n'existe (bootstrap).
  //  2. Un Super Admin déjà connecté (Authorization: Bearer <idToken>, rôle "admin") — voie
  //     normale pour créer les comptes suivants (professeurs, autres admins).
  const secret = req.headers.get("x-admin-secret");
  const bootstrap = !!secret && secret === process.env.ADMIN_API_SECRET;

  if (!bootstrap) {
    try {
      await requireStaff(req, "admin");
    } catch (err) {
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
  }

  const { nom, email, role, ecoleId } = await req.json();
  if (!nom || !email || !role) {
    return NextResponse.json({ error: "Nom, email et rôle sont requis." }, { status: 400 });
  }
  if (role !== "admin" && role !== "professeur") {
    return NextResponse.json({ error: 'Rôle invalide (attendu "admin" ou "professeur").' }, { status: 400 });
  }
  const roleStaff = role as StaffRole;

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const motDePasse = genererMotDePasseProvisoire();

    let userRecord;
    let creePourLaPremiereFois = true;
    try {
      userRecord = await adminAuth.createUser({ email, password: motDePasse, displayName: nom });
    } catch (err: any) {
      // Compte Auth déjà existant (ex: on ne fait que changer son rôle) : on ne touche pas
      // à son mot de passe, on met juste à jour ses claims et sa fiche /staff.
      if (err.code === "auth/email-already-exists") {
        userRecord = await adminAuth.getUserByEmail(email);
        creePourLaPremiereFois = false;
      } else {
        throw err;
      }
    }

    await adminAuth.setCustomUserClaims(userRecord.uid, { staff: true, role: roleStaff, ecoleId: ecoleId || null });

    await adminDb.ref(`staff/${userRecord.uid}`).set({
      uid: userRecord.uid,
      nom,
      email,
      role: roleStaff,
      ecoleId: ecoleId || null
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      motDePasse: creePourLaPremiereFois ? motDePasse : null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
