import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { synthetiserEvaluation } from "@/lib/performance";
import type { ComparaisonScores, Evaluation, MatiereResult } from "@/types";

export const runtime = "nodejs";

const BAREME_PAR_DEFAUT = { min: 0, max: 50 };

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_API_SECRET) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json();
  const { studentId, ecoleId, groupeId, session, bareme, matieres, comparaisons } = body as {
    studentId: string;
    ecoleId?: string;
    groupeId?: string;
    session: string;
    bareme?: { min: number; max: number };
    matieres: MatiereResult[];
    comparaisons?: Record<string, ComparaisonScores>;
  };

  if (!studentId || !session || !Array.isArray(matieres) || matieres.length === 0) {
    return NextResponse.json(
      { error: "Élève, session et au moins une matière sont requis." },
      { status: 400 }
    );
  }

  try {
    const adminDb = getAdminDb();
    const studentSnap = await adminDb.ref(`students/${studentId}`).get();
    if (!studentSnap.exists()) {
      return NextResponse.json({ error: "Élève introuvable." }, { status: 404 });
    }

    const baremeEval = bareme && Number.isFinite(bareme.min) && Number.isFinite(bareme.max) ? bareme : BAREME_PAR_DEFAUT;

    // Score global = moyenne (pondération égale) des scores de matière, sauf indication contraire du staff.
    const scoreGlobal =
      Math.round((matieres.reduce((somme, m) => somme + m.scoreGlobal, 0) / matieres.length) * 10) / 10;

    const evalRef = adminDb.ref(`evaluations/${studentId}`).push();
    const evaluationId = evalRef.key!;

    // Le score de l'élève ("eleve") n'est pas ressaisi par le staff dans le formulaire de
    // comparaison : on le complète ici avec le score déjà calculé (global, ou par matière
    // quand la clé de comparaison correspond à l'id d'une matière).
    const comparaisonsCompletees = comparaisons
      ? Object.fromEntries(
          Object.entries(comparaisons).map(([cle, valeurs]) => [
            cle,
            { ...valeurs, eleve: cle === "global" ? scoreGlobal : matieres.find((m) => m.id === cle)?.scoreGlobal ?? valeurs.eleve }
          ])
        )
      : undefined;

    const evaluation: Evaluation = {
      id: evaluationId,
      studentId,
      ecoleId: ecoleId || studentSnap.val().ecoleId || "",
      groupeId: groupeId || undefined,
      session,
      bareme: baremeEval,
      scoreGlobal,
      matieres,
      comparaisons: comparaisonsCompletees,
      createdAt: Date.now()
    };

    // JSON.stringify supprime les clés `undefined` (groupeId, comparaisons) : la RTDB
    // refuse d'écrire une valeur `undefined` explicite, elle veut l'absence de la clé.
    await evalRef.set(JSON.parse(JSON.stringify(evaluation)));

    return NextResponse.json({ evaluationId, synthese: synthetiserEvaluation(evaluation) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
