import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const snap = await getAdminDb().ref("students").get();
    if (!snap.exists()) return NextResponse.json({ students: [] });

    const students = Object.values(snap.val() as Record<string, any>).map((s: any) => ({
      id: s.id,
      nom: s.nom,
      classe: s.classe,
      ecoleId: s.ecoleId ?? null
    }));

    return NextResponse.json({ students });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
