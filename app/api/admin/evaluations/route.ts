import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import type { Evaluation } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "Paramètre studentId requis." }, { status: 400 });
  }

  try {
    const adminDb = getAdminDb();
    const [studentSnap, evalsSnap] = await Promise.all([
      adminDb.ref(`students/${studentId}`).get(),
      adminDb.ref(`evaluations/${studentId}`).orderByChild("createdAt").get()
    ]);

    if (!studentSnap.exists()) {
      return NextResponse.json({ error: "Élève introuvable." }, { status: 404 });
    }

    const evaluations: Evaluation[] = [];
    evalsSnap.forEach((child) => {
      evaluations.push(child.val());
      return false;
    });

    return NextResponse.json({ student: studentSnap.val(), evaluations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
