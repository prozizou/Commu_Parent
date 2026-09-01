import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStaff, AuthError } from "@/lib/adminAuth";
import {
  distributionNiveaux,
  identifierForcesEtDifficultes,
  synthetiserEvaluation,
  type ItemEvalue
} from "@/lib/performance";
import type { Evaluation, Student } from "@/types";

export const runtime = "nodejs";

/**
 * Vue d'ensemble établissement pour une session : nombre d'élèves évalués, moyenne,
 * distribution des niveaux, domaines forts/faibles (toutes matières confondues), et
 * évolution de la moyenne établissement session par session.
 *
 * Comme il n'existe pas d'agrégat pré-calculé (les moyennes de groupe/établissement sont
 * saisies manuellement par le staff à la création d'une évaluation, voir
 * create-evaluation/route.ts), ce endpoint recalcule à la volée à partir de toutes les
 * évaluations de l'école. À revisiter avec un job d'agrégation si le volume grossit.
 */
export async function GET(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(req, "admin");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const session = req.nextUrl.searchParams.get("session");

  try {
    const adminDb = getAdminDb();
    const studentsSnap = await adminDb.ref("students").get();
    const eleveIds: string[] = [];
    studentsSnap.forEach((child) => {
      const s = child.val() as Student;
      if (!staff.ecoleId || s.ecoleId === staff.ecoleId) eleveIds.push(child.key!);
      return false;
    });

    const toutesEvaluations: Evaluation[] = [];
    await Promise.all(
      eleveIds.map(async (id) => {
        const snap = await adminDb.ref(`evaluations/${id}`).get();
        snap.forEach((child) => {
          toutesEvaluations.push(child.val() as Evaluation);
          return false;
        });
      })
    );

    const sessionsDisponibles = Array.from(new Set(toutesEvaluations.map((e) => e.session))).sort().reverse();

    // Session par défaut = la plus récente rencontrée (par date de création), si non précisée.
    const sessionCible =
      session ??
      toutesEvaluations.slice().sort((a, b) => b.createdAt - a.createdAt)[0]?.session ??
      null;

    const evaluationsSession = toutesEvaluations.filter((e) => e.session === sessionCible);

    if (evaluationsSession.length === 0) {
      return NextResponse.json({
        session: sessionCible,
        sessionsDisponibles,
        studentCount: 0,
        moyenne: null,
        distribution: null,
        domainesForts: [],
        domainesFaibles: [],
        evolution: []
      });
    }

    const moyenne =
      Math.round(
        (evaluationsSession.reduce((s, e) => s + e.scoreGlobal, 0) / evaluationsSession.length) * 10
      ) / 10;

    const distribution = distributionNiveaux(evaluationsSession.map((e) => e.scoreGlobal));

    // Domaines forts/faibles, toutes matières confondues, moyennés sur l'ensemble des élèves.
    const domaineTotaux = new Map<string, { nom: string; somme: number; compte: number }>();
    for (const evaluation of evaluationsSession) {
      const synthese = synthetiserEvaluation(evaluation);
      for (const matiere of synthese.matieres) {
        for (const domaine of matiere.domaines) {
          const cle = `${matiere.id}:${domaine.id}`;
          const entree = domaineTotaux.get(cle) ?? { nom: `${matiere.nom} — ${domaine.nom}`, somme: 0, compte: 0 };
          entree.somme += domaine.pourcentage;
          entree.compte += 1;
          domaineTotaux.set(cle, entree);
        }
      }
    }
    const items: ItemEvalue[] = Array.from(domaineTotaux.entries()).map(([id, { nom, somme, compte }]) => ({
      id,
      nom,
      pourcentage: Math.round((somme / compte) * 10) / 10
    }));
    const bilan = identifierForcesEtDifficultes(items);

    // Évolution : moyenne établissement par session (toutes sessions confondues, pas seulement la cible).
    const parSession = new Map<string, { somme: number; compte: number }>();
    for (const evaluation of toutesEvaluations) {
      const entree = parSession.get(evaluation.session) ?? { somme: 0, compte: 0 };
      entree.somme += evaluation.scoreGlobal;
      entree.compte += 1;
      parSession.set(evaluation.session, entree);
    }
    const evolution = Array.from(parSession.entries())
      .map(([sessionLabel, { somme, compte }]) => ({
        session: sessionLabel,
        moyenne: Math.round((somme / compte) * 10) / 10
      }))
      .sort((a, b) => a.session.localeCompare(b.session));

    return NextResponse.json({
      session: sessionCible,
      sessionsDisponibles,
      studentCount: evaluationsSession.length,
      moyenne,
      distribution,
      domainesForts: bilan.forces.slice(0, 3),
      domainesFaibles: bilan.priorites.slice(0, 3),
      evolution
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue." }, { status: 500 });
  }
}
