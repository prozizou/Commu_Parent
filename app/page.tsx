"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ObjectifsPerformance } from "@/components/ObjectifsPerformance";
import type { Evaluation } from "@/types";

type StudentOption = { id: string; nom: string; classe: string };

const LIENS = [
  { href: "/admin/create-parent", label: "Créer un parent" },
  { href: "/admin/create-student", label: "Créer un élève" },
  { href: "/admin/create-staff", label: "Créer un professeur" },
  { href: "/admin/create-evaluation", label: "Créer une évaluation" }
];

export default function Home() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [chargement, setChargement] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/students")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStudents(data.students);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!studentId) {
      setEvaluations(null);
      return;
    }
    setEvaluations(null);
    fetch(`/api/admin/evaluations?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEvaluations(data.evaluations);
      })
      .catch((err) => setErreur(err.message));
  }, [studentId]);

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <p className="text-sm text-ink-400">Commu_Parent</p>
        <h1 className="font-display text-2xl text-ink-900">Accueil</h1>
        <p className="mt-2 rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-ink-800">
          ⚠️ Mode ouvert temporaire : l'authentification Super Admin est désactivée, cette page et les actions
          ci-dessous sont accessibles sans connexion.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-ink-600 mb-3">Actions rapides</h2>
        <div className="grid gap-2">
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md border border-ink-100 bg-white px-4 py-3 font-medium text-ink-800 hover:border-accent transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-ink-600 mb-3">Objectifs pédagogiques</h2>

        {chargement ? (
          <p className="text-sm text-ink-400">Chargement des élèves...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-ink-400">
            Aucun élève pour l'instant. Utilise "Créer un élève" ci-dessus pour commencer.
          </p>
        ) : (
          <>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full mb-4 rounded-md border border-ink-100 px-3 py-2 focus:border-accent bg-white"
            >
              <option value="">— Choisir un élève —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.classe})
                </option>
              ))}
            </select>

            {studentId && (evaluations === null ? (
              <p className="text-sm text-ink-400">Chargement des évaluations...</p>
            ) : (
              <ObjectifsPerformance evaluations={evaluations} />
            ))}
          </>
        )}

        {erreur && <p className="text-sm text-red-600 mt-3">{erreur}</p>}
      </section>
    </main>
  );
}
