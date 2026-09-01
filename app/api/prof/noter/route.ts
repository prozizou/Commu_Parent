import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import { AUTH_DISABLED } from "@/lib/authConfig";
import { parseMatiereTexte, EvaluationParseError } from "@/lib/evaluationParser";
import { synthetiserEvaluation } from "@/lib/performance";
import type { Evaluation, MatiereEnseignee, Staff, Student } from "@/types";

export const runtime = "nodejs";

const BAREME_PAR_DEFAUT = { min: 0, max: 50 };

export async function POST(req: NextRequest) {
  let staffContext;
  try {
    staffContext = await requireStaff(req, "any");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json();
  const { professeurId: professeurIdBody, matiereId, studentId, session, texteResultats, bareme } = body as {
    professeurId?: string;
    matiereId: string;
    studentId: string;
    session: string;
    texteResultats: string;
    bareme?: { min: number; max: number };
  };

  // Hors mode ouvert, l'identité du professeur vient du token, pas du corps de la requête
  // (on ne fait pas confiance à un professeurId fourni par le client). En mode ouvert
  // temporaire (voir lib/authConfig.ts), il n'y a pas de session réelle : le professeur
  // se sélectionne lui-même dans l'interface, d'où le repli sur le corps de la requête.
  const professeurId = AUTH_DISABLED ? professeurIdBody : staffContext.uid;

  if (!professeurId || !matiereId || !studentId || !session?.trim() || !texteResultats?.trim()) {
    return NextResponse.json(
      { error: "Professeur, matière, élève, session et résultats sont requis." },
      { status: 400 }
    );
  }

  try {
    const adminDb = getAdminDb();

    const [professeurSnap, matiereSnap, studentSnap] = await Promise.all([
      adminDb.ref(`staff/${professeurId}`).get(),
      adminDb.ref(`matieresEnseignees/${matiereId}`).get(),
      adminDb.ref(`students/${studentId}`).get()
    ]);

    if (!professeurSnap.exists()) return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    const professeur = professeurSnap.val() as Staff;
    if (professeur.role !== "professeur") {
      return NextResponse.json({ error: "Ce compte n'est pas un professeur." }, { status: 403 });
    }

    if (!matiereSnap.exists()) return NextResponse.json({ error: "Matière introuvable." }, { status: 404 });
    const matiere = matiereSnap.val() as MatiereEnseignee;
    if (matiere.professeurId !== professeurId) {
      return NextResponse.json({ error: "Cette matière n'est pas assignée à ce professeur." }, { status: 403 });
    }

    if (!studentSnap.exists()) return NextResponse.json({ error: "Élève introuvable." }, { status: 404 });
    const student = studentSnap.val() as Student;
    // Classes encadrées vides/non renseignées = pas de restriction (cohérent avec le
    // reste du code : un champ absent ne bloque pas, voir app/api/staff/classe).
    if (professeur.classes && professeur.classes.length > 0 && !professeur.classes.includes(student.classe)) {
      return NextResponse.json(
        { error: `${student.nom} n'est pas dans une classe encadrée par ce professeur.` },
        { status: 403 }
      );
    }

    // Le nom de la matière vient du catalogue (matieresEnseignees), pas de la saisie libre
    // du professeur : on préfixe le texte avec la ligne "Matiere:" attendue par le parseur,
    // pour que le professeur n'ait à saisir que Score/Domaine/Sous.
    let matiereResult;
    try {
      matiereResult = parseMatiereTexte(`Matiere: ${matiere.nom}\n${texteResultats}`);
    } catch (err) {
      const message = err instanceof EvaluationParseError ? err.message : "Format invalide.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const baremeEval =
      bareme && Number.isFinite(bareme.min) && Number.isFinite(bareme.max) ? bareme : BAREME_PAR_DEFAUT;

    const evalRef = adminDb.ref(`evaluations/${studentId}`).push();
    const evaluation: Evaluation = {
      id: evalRef.key!,
      studentId,
      ecoleId: student.ecoleId || professeur.ecoleId || "",
      session: session.trim(),
      bareme: baremeEval,
      scoreGlobal: matiereResult.scoreGlobal,
      matieres: [matiereResult],
      createdAt: Date.now(),
      createdBy: professeurId
    };

    await evalRef.set(JSON.parse(JSON.stringify(evaluation)));

    return NextResponse.json({ evaluationId: evaluation.id, synthese: synthetiserEvaluation(evaluation) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
