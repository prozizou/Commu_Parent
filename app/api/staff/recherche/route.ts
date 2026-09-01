import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import type { Evaluation, Student } from "@/types";

export const runtime = "nodejs";

export type ResultatEleve = { studentId: string; nom: string; classe: string };
export type ResultatCompetence = {
  studentId: string;
  nomEleve: string;
  matiere: string;
  domaine: string;
  sousCompetence?: string;
  pourcentage: number;
  session: string;
};

/**
 * Recherche unifiée réservée au staff :
 * - par nom d'élève (substring, insensible à la casse)
 * - par nom de domaine/sous-compétence : renvoie les élèves dont la DERNIÈRE évaluation
 *   montre une faiblesse (<70%) sur une compétence dont le nom correspond — utile pour
 *   repérer rapidement "qui a du mal avec X" (section 22, "recherche par élève ou
 *   compétence" du cahier des charges).
 *
 * Comme pour /api/staff/etablissement, pas d'index de recherche dédié : on scanne les
 * élèves et leur dernière évaluation de l'école, acceptable à l'échelle d'un établissement.
 */
export async function GET(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(req, "any");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ eleves: [], competences: [] });
  }
  const qLower = q.toLowerCase();

  try {
    const adminDb = getAdminDb();
    const studentsSnap = await adminDb.ref("students").get();
    const eleves: (Student & { id: string })[] = [];
    studentsSnap.forEach((child) => {
      const s = child.val() as Student;
      if (!staff.ecoleId || s.ecoleId === staff.ecoleId) eleves.push({ ...s, id: child.key! });
      return false;
    });

    // 1. Correspondances par nom d'élève
    const resultatsEleves: ResultatEleve[] = eleves
      .filter((e) => e.nom.toLowerCase().includes(qLower))
      .map((e) => ({ studentId: e.id, nom: e.nom, classe: e.classe }));

    // 2. Correspondances par compétence, sur la dernière évaluation de chaque élève
    const resultatsCompetences: ResultatCompetence[] = [];
    await Promise.all(
      eleves.map(async (eleve) => {
        const evalsSnap = await adminDb.ref(`evaluations/${eleve.id}`).get();
        const evaluations: Evaluation[] = [];
        evalsSnap.forEach((child) => {
          evaluations.push(child.val() as Evaluation);
          return false;
        });
        const derniere = evaluations.sort((a, b) => b.createdAt - a.createdAt)[0];
        if (!derniere) return;

        for (const matiere of derniere.matieres) {
          for (const domaine of matiere.domaines) {
            const domaineMatch = domaine.nom.toLowerCase().includes(qLower);
            const sousCompetences = domaine.sousCompetences ?? [];
            const pourcentageDomaine =
              domaine.score !== undefined
                ? Math.round((domaine.score / derniere.bareme.max) * 1000) / 10
                : sousCompetences.length > 0
                ? Math.round(
                    (sousCompetences.reduce((s, sc) => s + sc.pointsObtenus, 0) /
                      sousCompetences.reduce((s, sc) => s + sc.pointsPossibles, 0)) *
                      1000
                  ) / 10
                : 0;

            if (domaineMatch && pourcentageDomaine < 70) {
              resultatsCompetences.push({
                studentId: eleve.id,
                nomEleve: eleve.nom,
                matiere: matiere.nom,
                domaine: domaine.nom,
                pourcentage: pourcentageDomaine,
                session: derniere.session
              });
            }

            for (const sc of sousCompetences) {
              const scMatch = sc.nom.toLowerCase().includes(qLower);
              const pourcentageSc = Math.round((sc.pointsObtenus / sc.pointsPossibles) * 1000) / 10;
              if (scMatch && pourcentageSc < 70) {
                resultatsCompetences.push({
                  studentId: eleve.id,
                  nomEleve: eleve.nom,
                  matiere: matiere.nom,
                  domaine: domaine.nom,
                  sousCompetence: sc.nom,
                  pourcentage: pourcentageSc,
                  session: derniere.session
                });
              }
            }
          }
        }
      })
    );

    resultatsCompetences.sort((a, b) => a.pourcentage - b.pourcentage);

    return NextResponse.json({ eleves: resultatsEleves, competences: resultatsCompetences });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
