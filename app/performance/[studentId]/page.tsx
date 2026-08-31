"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { auth, rtdb } from "@/lib/firebase";
import { analyserEvolution, bilanDomainesToutesMatieres, synthetiserEvaluation } from "@/lib/performance";
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
        <ContenuPerformance evaluations={evaluations} derniere={derniere} />
      )}
    </main>
  );
}

function ContenuPerformance({ evaluations, derniere }: { evaluations: Evaluation[]; derniere: Evaluation }) {
  const synthese = synthetiserEvaluation(derniere);
  const bilanDomaines = bilanDomainesToutesMatieres(synthese);
  const evolution = analyserEvolution(evaluations.map((e) => ({ session: e.session, score: e.scoreGlobal })));

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-ink-100 bg-white p-5 text-center">
        <p className="text-xs text-ink-400 mb-1">{derniere.session}</p>
        <p className="font-display text-4xl text-ink-900">{synthese.scoreGlobal}</p>
        <p className="text-xs text-ink-400 mb-2">
          sur {derniere.bareme.max} (barème {derniere.bareme.min}–{derniere.bareme.max})
        </p>
        <NiveauBadge niveau={synthese.niveau} />
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
    </div>
  );
}
