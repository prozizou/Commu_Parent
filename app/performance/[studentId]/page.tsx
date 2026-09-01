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
        <ContenuPerformance nomEleve={eleve?.nom ?? ""} evaluations={evaluations} derniere={derniere} />
      )}
    </main>
  );
}

function ContenuPerformance({
  nomEleve,
  evaluations,
  derniere
}: {
  nomEleve: string;
  evaluations: Evaluation[];
  derniere: Evaluation;
}) {
  const synthese = synthetiserEvaluation(derniere);
  const bilanDomaines = bilanDomainesToutesMatieres(synthese);
  const evolution = analyserEvolution(evaluations.map((e) => ({ session: e.session, score: e.scoreGlobal })));

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
        <p className="text-xs text-ink-400 mb-1">{derniere.session}</p>
        <p className="font-display text-4xl text-ink-900">{synthese.scoreGlobal}</p>
        <p className="text-xs text-ink-400 mb-2">
          sur {derniere.bareme.max} (barème {derniere.bareme.min}–{derniere.bareme.max})
        </p>
        <NiveauBadge niveau={synthese.niveau} />
        <div className="mt-4">
          <button
            type="button"
            onClick={() =>
              import("@/lib/bulletinPdf").then(({ genererBulletinPdf }) =>
                genererBulletinPdf({
                  nomEleve,
                  session: derniere.session,
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
    </div>
  );
}
