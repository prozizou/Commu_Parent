import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import { niveauPerformance } from "@/lib/performance";
import type { Evaluation, Student } from "@/types";

export const runtime = "nodejs";

/**
 * Résultats d'une classe pour une session donnée : liste des élèves avec leur score
 * global, niveau et écart à la moyenne de la classe.
 *
 * Note : sans index RTDB dédié sur `classe`/`ecoleId`, on lit tout le noeud `students`
 * et on filtre en mémoire — acceptable pour la taille d'un établissement, à revoir
 * avec `.indexOn` si le nombre d'élèves devient important.
 */
export async function GET(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(req, "any");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const classe = req.nextUrl.searchParams.get("classe");
  const session = req.nextUrl.searchParams.get("session");
  if (!classe) return NextResponse.json({ error: "Paramètre classe requis." }, { status: 400 });

  try {
    const adminDb = getAdminDb();
    const studentsSnap = await adminDb.ref("students").get();
    const eleves: (Student & { id: string })[] = [];
    studentsSnap.forEach((child) => {
      const s = child.val() as Student;
      if (s.classe === classe && (!staff.ecoleId || s.ecoleId === staff.ecoleId)) {
        eleves.push({ ...s, id: child.key! });
      }
      return false;
    });

    // Sessions disponibles pour cette classe (toutes évaluations confondues), pour peupler
    // le dropdown côté client si aucune session n'est encore choisie.
    const sessionsDisponibles = new Set<string>();

    const resultats = await Promise.all(
      eleves.map(async (eleve) => {
        const evalsSnap = await adminDb.ref(`evaluations/${eleve.id}`).get();
        let evaluations: Evaluation[] = [];
        evalsSnap.forEach((child) => {
          const ev = child.val() as Evaluation;
          evaluations.push(ev);
          sessionsDisponibles.add(ev.session);
          return false;
        });

        const evaluation = session
          ? evaluations.filter((e) => e.session === session).sort((a, b) => b.createdAt - a.createdAt)[0]
          : evaluations.sort((a, b) => b.createdAt - a.createdAt)[0];

        return {
          studentId: eleve.id,
          nom: eleve.nom,
          scoreGlobal: evaluation?.scoreGlobal ?? null,
          niveau: evaluation ? niveauPerformance(evaluation.scoreGlobal) : null,
          session: evaluation?.session ?? null
        };
      })
    );

    const avecScore = resultats.filter((r) => r.scoreGlobal !== null) as (typeof resultats[number] & {
      scoreGlobal: number;
    })[];
    const moyenneClasse =
      avecScore.length > 0
        ? Math.round((avecScore.reduce((s, r) => s + r.scoreGlobal, 0) / avecScore.length) * 10) / 10
        : null;

    const eleveResultats = resultats
      .map((r) => ({
        ...r,
        ecartMoyenne:
          r.scoreGlobal !== null && moyenneClasse !== null
            ? Math.round((r.scoreGlobal - moyenneClasse) * 10) / 10
            : null
      }))
      .sort((a, b) => (b.scoreGlobal ?? -1) - (a.scoreGlobal ?? -1));

    return NextResponse.json({
      classe,
      session: session ?? null,
      moyenneClasse,
      sessionsDisponibles: Array.from(sessionsDisponibles).sort().reverse(),
      eleves: eleveResultats
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
