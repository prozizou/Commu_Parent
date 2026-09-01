import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import type { Staff } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const snap = await adminDb.ref("staff").get();
    const staff: Staff[] = [];
    snap.forEach((child) => {
      staff.push(child.val() as Staff);
      return false;
    });
    return NextResponse.json({ staff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
