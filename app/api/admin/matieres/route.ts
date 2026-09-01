import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import type { MatiereEnseignee } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "any");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const professeurId = req.nextUrl.searchParams.get("professeurId");

  try {
    const adminDb = getAdminDb();
    const snap = await adminDb.ref("matieresEnseignees").get();
    const matieres: MatiereEnseignee[] = [];
    snap.forEach((child) => {
      const m = child.val() as MatiereEnseignee;
      if (!professeurId || m.professeurId === professeurId) matieres.push(m);
      return false;
    });
    return NextResponse.json({ matieres });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
