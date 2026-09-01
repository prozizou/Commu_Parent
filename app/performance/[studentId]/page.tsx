"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { auth, rtdb } from "@/lib/firebase";
import { analyserEvolution, bilanDomainesToutesMatieres, prioritePedagogique, synthetiserEvaluation } from "@/lib/performance";
import { genererRecommandation } from "@/lib/recommandations";
import { BarrePourcentage, NiveauBadge } from "@/components/PerformanceUI";
import type { Evaluation, Student } from "@/types";

export default function PerformanceEleve({ params }: { params: { studentId: string } }) {
  const { studentId } = params;
  const [authPret, setAuthPret] = useState(false);
  const [eleve, setEleve] = useState<Student | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluationSelectionneeId, setEvaluationSelectionneeId] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, () => setAuthPret(true)), []);

  useEffect(() => {
    if (!authPret) return;

    const unsubEleve = onValue(ref(rtdb, `students/${studentId}`), (snap) => {
      setEleve(snap.exists() ? snap.val() : null);
    });

    const evalQuery = query(ref(rtdb, `evaluations/${studentId}`), orderByChild("createdAt"));
    const unsubEvals = onValue(evalQuery, (snap) => {
      const list: Evaluation[] = [];
      snap.forEach((child) => {
        list.push(child.val());
      });
      setEvaluations(list);
    });

    return () => {
      unsubEleve();
      unsubEvals();
    };
  }, [authPret, studentId]);

  if (!authPret) {
    return (
      <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
        <p className="text-sm text-ink-400">Chargement...</p>
      </main>
    );
  }

  const derniere = evaluations[evaluations.length - 1];
  const evaluationAffichee = evaluationSelectionneeId
    ? evaluations.find((e) => e.id === evaluationSelectionneeId) ?? derniere
    : derniere;

  return (
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      <header className="mb-6">
        <Link href="/dashboard" className="text-sm text-accent underline">
          ← Tableau de bord
        </Link>
        <p className="text-sm text-ink-400 mt-2">Performance de l'élève</p>
        <h1 className="font-display text-2xl text-ink-900">{eleve?.nom ?? "..."}</h1>
      </header>

      {!derniere ? (
        <p className="text-sm text-ink-400">
          Aucune évaluation disponible pour l'instant. Les résultats apparaîtront ici dès que l'école les aura
          publiés.
        </p>
      ) : (
        <ContenuPerformance
          nomEleve={eleve?.nom ?? ""}
          evaluations={evaluations}
          evaluationAffichee={evaluationAffichee}
          estDerniere={evaluationAffichee.id === derniere.id}
          onSelectionnerEvaluation={setEvaluationSelectionneeId}
        />
      )}
    </main>
  );
}

function ContenuPerformance({
  nomEleve,
  evaluations,
  evaluationAffichee,
  estDerniere,
  onSelectionnerEvaluation
}: {
  nomEleve: string;
  evaluations: Evaluation[];
  evaluationAffichee: Evaluation;
  estDerniere: boolean;
  onSelectionnerEvaluation: (id: string | null) => void;
}) {
  const synthese = synthetiserEvaluation(evaluationAffichee);
  const bilanDomaines = bilanDomainesToutesMatieres(synthese);
  // La progression et le graphique d'évolution restent calculés sur l'historique complet,
  // indépendamment de l'évaluation consultée — ils répondent à "progresse-t-il dans le temps ?",
  // pas à "comment va cette évaluation-ci en particulier".
  const evolution = analyserEvolution(evaluations.map((e) => ({ session: e.session, score: e.scoreGlobal })));
  const historique = [...evaluations].reverse(); // plus récente en premier

  // Priorité pédagogique : la sous-compétence la plus faible, toutes matières confondues.
  const prioritesParMatiere = synthese.matieres
    .map((m) => ({ matiere: m.nom, priorite: prioritePedagogique(m) }))
    .filter((p): p is { matiere: string; priorite: NonNullable<ReturnType<typeof prioritePedagogique>> } => p.priorite !== null);
  const prioriteGlobale =
    prioritesParMatiere.length > 0
      ? prioritesParMatiere.reduce((pire, p) => (p.priorite.pourcentage < pire.priorite.pourcentage ? p : pire))
      : null;
  const recommandation = prioriteGlobale ? genererRecommandation(prioriteGlobale.priorite.nom) : null;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-ink-100 bg-white p-5 text-center">
        <p className="text-xs text-ink-400 mb-1">
          {evaluationAffichee.session}
          {!estDerniere && <span className="text-accent"> (évaluation passée)</span>}
        </p>
        <p className="font-display text-4xl text-ink-900">{synthese.scoreGlobal}</p>
        <p className="text-xs text-ink-400 mb-2">
          sur {evaluationAffichee.bareme.max} (barème {evaluationAffichee.bareme.min}–{evaluationAffichee.bareme.max})
        </p>
        <NiveauBadge niveau={synthese.niveau} />
        <div className="mt-4">
          <button
            type="button"
            onClick={() =>
              import("@/lib/bulletinPdf").then(({ genererBulletinPdf }) =>
                genererBulletinPdf({
                  nomEleve,
                  session: evaluationAffichee.session,
                  synthese,
                  evolution,
                  prioritePedagogique: prioriteGlobale
                    ? {
                        nom: prioriteGlobale.priorite.nom,
                        matiere: prioriteGlobale.matiere,
                        pourcentage: prioriteGlobale.priorite.pourcentage,
                        recommandation: recommandation!.texte
                      }
                    : null
                })
              )
            }
            className="text-xs text-accent underline"
          >
            Télécharger le bulletin (PDF)
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-ink-600 mb-3">Résultats par matière</h2>
        <div className="space-y-3">
          {synthese.matieres.map((m) => (
            <BarrePourcentage key={m.id} label={m.nom} pourcentage={m.pourcentage} />
          ))}
        </div>
      </section>

      {evolution && (
        <section className="rounded-lg border border-ink-100 bg-white p-4">
          <h2 className="text-sm font-medium text-ink-600 mb-1">📈 Progression</h2>
          <p className="text-sm text-ink-800">
            {evolution.delta > 0 ? "+" : ""}
            {evolution.delta} point{Math.abs(evolution.delta) > 1 ? "s" : ""} depuis la dernière évaluation
            {evolution.tendance === "progression" && " — belle progression !"}
            {evolution.tendance === "baisse" && " — en baisse, à surveiller."}
            {evolution.tendance === "stagnation" && " — résultat stable."}
          </p>
        </section>
      )}

      {bilanDomaines.forces.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-ink-600 mb-2">⭐ Points forts</h2>
          <ul className="space-y-1">
            {bilanDomaines.forces.slice(0, 4).map((f) => (
              <li key={f.id} className="text-sm text-ink-800">
                {f.nom}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(bilanDomaines.aRenforcer.length > 0 || bilanDomaines.priorites.length > 0) && (
        <section>
          <h2 className="text-sm font-medium text-ink-600 mb-2">🎯 À travailler</h2>
          <ul className="space-y-1">
            {[...bilanDomaines.priorites, ...bilanDomaines.aRenforcer].slice(0, 4).map((f) => (
              <li key={f.id} className="text-sm text-ink-800">
                {f.nom}
              </li>
            ))}
          </ul>
        </section>
      )}

      {prioriteGlobale && recommandation && (
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <h2 className="text-sm font-medium text-ink-600 mb-1">💡 Priorité pédagogique</h2>
          <p className="text-sm text-ink-900 font-medium mb-1">
            {prioriteGlobale.priorite.nom}{" "}
            <span className="text-ink-400 font-normal">
              ({prioriteGlobale.matiere} · {prioriteGlobale.priorite.pourcentage}%)
            </span>
          </p>
          <p className="text-sm text-ink-800 mb-3">{recommandation.texte}</p>
          <p className="text-xs text-ink-400 mb-1.5">Pistes d'exercices</p>
          <ul className="space-y-1">
            {recommandation.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-ink-800">
                • {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {historique.length > 1 && (
        <section>
          <h2 className="text-sm font-medium text-ink-600 mb-2">🕒 Historique des évaluations</h2>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white overflow-hidden">
            {historique.map((e) => {
              const active = e.id === evaluationAffichee.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onSelectionnerEvaluation(active ? null : e.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      active ? "bg-accent/10" : "hover:bg-ink-50"
                    }`}
                  >
                    <span className={`text-sm ${active ? "text-ink-900 font-medium" : "text-ink-800"}`}>
                      {e.session}
                    </span>
                    <span className="text-sm text-ink-400 tabular-nums">
                      {e.scoreGlobal} / {e.bareme.max}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!estDerniere && (
            <button
              type="button"
              onClick={() => onSelectionnerEvaluation(null)}
              className="text-xs text-accent underline mt-2"
            >
              Revenir à la dernière évaluation
            </button>
          )}
        </section>
      )}
    </div>
  );
}
