import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import type { MatiereEnseignee, Staff } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { nom, professeurId } = await req.json();
  if (!nom || !professeurId) {
    return NextResponse.json({ error: "Nom de la matière et professeur sont requis." }, { status: 400 });
  }

  try {
    const adminDb = getAdminDb();
    const professeurSnap = await adminDb.ref(`staff/${professeurId}`).get();
    if (!professeurSnap.exists()) {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }
    const professeur = professeurSnap.val() as Staff;
    if (professeur.role !== "professeur") {
      return NextResponse.json({ error: "Ce membre du staff n'est pas un professeur." }, { status: 400 });
    }

    const ref = adminDb.ref("matieresEnseignees").push();
    const matiere: MatiereEnseignee = {
      id: ref.key!,
      nom,
      professeurId,
      ecoleId: professeur.ecoleId || null
    };
    await ref.set(matiere);

    return NextResponse.json({ matiere });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
