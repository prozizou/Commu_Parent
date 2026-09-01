import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import {
  distributionNiveaux,
  synthetiserEvaluation,
  type ItemEvalue
} from "@/lib/performance";
import type { Evaluation, Student } from "@/types";

export const runtime = "nodejs";

/**
 * KPI établissement pour la page d'accueil : agrège, pour chaque élève, sa DERNIÈRE
 * évaluation (toutes matières confondues dans ce document, cf. Evaluation.matieres),
 * puis moyenne/distribue/classe sur cet ensemble. Contrairement à
 * /api/staff/etablissement (qui filtre par matière+session), cette vue est volontairement
 * globale : c'est un coup d'oeil d'ensemble, pas une analyse fine par matière.
 */
export async function GET(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const studentsSnap = await adminDb.ref("students").get();
    const eleveIds: string[] = [];
    studentsSnap.forEach((child) => {
      const s = child.val() as Student;
      if (!staff.ecoleId || s.ecoleId === staff.ecoleId) eleveIds.push(child.key!);
      return false;
    });

    const dernieresParEleve: Evaluation[] = [];
    let totalEvaluations = 0;
    const parSession = new Map<string, { somme: number; compte: number }>();

    await Promise.all(
      eleveIds.map(async (id) => {
        const snap = await adminDb.ref(`evaluations/${id}`).get();
        const evaluations: Evaluation[] = [];
        snap.forEach((child) => {
          const ev = child.val() as Evaluation;
          evaluations.push(ev);
          totalEvaluations += 1;
          const entree = parSession.get(ev.session) ?? { somme: 0, compte: 0 };
          entree.somme += ev.scoreGlobal;
          entree.compte += 1;
          parSession.set(ev.session, entree);
          return false;
        });
        const derniere = evaluations.sort((a, b) => b.createdAt - a.createdAt)[0];
        if (derniere) dernieresParEleve.push(derniere);
      })
    );

    const evolution = Array.from(parSession.entries())
      .map(([session, { somme, compte }]) => ({ session, moyenne: Math.round((somme / compte) * 10) / 10 }))
      .sort((a, b) => a.session.localeCompare(b.session));

    if (dernieresParEleve.length === 0) {
      return NextResponse.json({
        studentCount: eleveIds.length,
        evaluationCount: 0,
        moyenne: null,
        distribution: null,
        domainesForts: [],
        domainesFaibles: [],
        evolution: []
      });
    }

    const moyenne =
      Math.round(
        (dernieresParEleve.reduce((s, e) => s + e.scoreGlobal, 0) / dernieresParEleve.length) * 10
      ) / 10;

    const distribution = distributionNiveaux(dernieresParEleve.map((e) => e.scoreGlobal));

    // Domaines forts/faibles toutes matières confondues, moyennés sur l'ensemble des élèves
    // (réutilise bilanDomainesToutesMatieres élève par élève, puis on agrège).
    const domaineTotaux = new Map<string, { somme: number; compte: number }>();
    for (const evaluation of dernieresParEleve) {
      const synthese = synthetiserEvaluation(evaluation);
      for (const matiere of synthese.matieres) {
        const items =
          matiere.domaines.length > 0
            ? matiere.domaines.map((d) => ({ nom: `${matiere.nom} — ${d.nom}`, pourcentage: d.pourcentage }))
            : [{ nom: matiere.nom, pourcentage: matiere.pourcentage }];
        for (const item of items) {
          const entree = domaineTotaux.get(item.nom) ?? { somme: 0, compte: 0 };
          entree.somme += item.pourcentage;
          entree.compte += 1;
          domaineTotaux.set(item.nom, entree);
        }
      }
    }
    const items: ItemEvalue[] = Array.from(domaineTotaux.entries()).map(([nom, { somme, compte }]) => ({
      id: nom,
      nom,
      pourcentage: Math.round((somme / compte) * 10) / 10
    }));
    const bilan = { forces: items.filter((i) => i.pourcentage >= 80), priorites: items.filter((i) => i.pourcentage < 70) };
    bilan.forces.sort((a, b) => b.pourcentage - a.pourcentage);
    bilan.priorites.sort((a, b) => a.pourcentage - b.pourcentage);

    return NextResponse.json({
      studentCount: eleveIds.length,
      evaluationCount: totalEvaluations,
      moyenne,
      distribution,
      domainesForts: bilan.forces.slice(0, 4),
      domainesFaibles: bilan.priorites.slice(0, 4),
      evolution
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
