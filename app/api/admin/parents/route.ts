import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_API_SECRET) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const snap = await getAdminDb().ref("parents").get();
    if (!snap.exists()) return NextResponse.json({ parents: [] });

    const parents = Object.values(snap.val() as Record<string, any>).map((p: any) => ({
      idUnique: p.idUnique,
      nom: p.nom
    }));

    return NextResponse.json({ parents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
