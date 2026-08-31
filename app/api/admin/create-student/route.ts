import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { nom, classe, ecoleId, parentIds } = await req.json();
  if (!nom || !classe || !Array.isArray(parentIds) || parentIds.length === 0) {
    return NextResponse.json(
      { error: "Nom, classe et au moins un parent sont requis." },
      { status: 400 }
    );
  }

  try {
    const adminDb = getAdminDb();
    const studentRef = adminDb.ref("students").push();
    const studentId = studentRef.key!;

    const parentIdsMap: Record<string, true> = {};
    parentIds.forEach((id: string) => (parentIdsMap[id] = true));

    // Écriture atomique : la fiche élève + la mise à jour de chaque fiche parent
    // (ajout de l'élève dans enfants) en une seule transaction multi-path.
    const updates: Record<string, any> = {
      [`students/${studentId}`]: {
        id: studentId,
        nom,
        classe,
        ecoleId: ecoleId || null,
        parentIds: parentIdsMap
      }
    };
    parentIds.forEach((parentId: string) => {
      updates[`parents/${parentId}/enfants/${studentId}`] = true;
    });

    await adminDb.ref().update(updates);

    return NextResponse.json({ studentId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
