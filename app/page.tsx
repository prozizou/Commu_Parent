"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EleveApercu } from "@/components/EleveApercu";
import { ListeDomaines } from "@/components/PerformanceUI";
import { DonutNiveaux, MiniCourbeEvolution } from "@/components/Charts";
import type { Evaluation } from "@/types";

type StudentOption = { id: string; nom: string; classe: string };

type Dashboard = {
  studentCount: number;
  evaluationCount: number;
  moyenne: number | null;
  distribution: Record<string, number> | null;
  domainesForts: { id: string; nom: string; pourcentage: number }[];
  domainesFaibles: { id: string; nom: string; pourcentage: number }[];
  evolution: { session: string; moyenne: number }[];
};

const LIENS = [
  { href: "/admin/create-parent", label: "Créer un parent" },
  { href: "/admin/create-student", label: "Créer un élève" },
  { href: "/admin/create-staff", label: "Créer un professeur" },
  { href: "/admin/create-matiere", label: "Assigner une matière" },
  { href: "/admin/create-evaluation", label: "Créer une évaluation" },
  { href: "/prof/noter", label: "Noter un élève" }
];

const LIBELLES_NIVEAU: Record<string, string> = {
  unclassified: "Non classifié",
  basic: "Basic",
  aspiring: "Aspiring",
  good: "Good",
  high: "High",
  outstanding: "Outstanding"
};

const COULEUR_NIVEAU: Record<string, string> = {
  unclassified: "#8a97a6",
  basic: "#c14f4f",
  aspiring: "#c96a4d",
  good: "#4a6a8a",
  high: "#2c4a68",
  outstanding: "#101d2c"
};

export default function Home() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [chargement, setChargement] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard").then((res) => res.json()),
      fetch("/api/admin/students").then((res) => res.json())
    ])
      .then(([d, s]) => {
        if (d.error) throw new Error(d.error);
        if (s.error) throw new Error(s.error);
        setDashboard(d);
        setStudents(s.students);
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
      <header className="mb-8">
        <p className="text-sm text-ink-400">Commu_Parent</p>
        <h1 className="font-display text-2xl text-ink-900">Accueil</h1>
        <p className="mt-2 rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-ink-800">
          ⚠️ Mode ouvert temporaire : l'authentification Super Admin est désactivée, cette page et les actions
          ci-dessous sont accessibles sans connexion.
        </p>
      </header>

      {erreur && <p className="text-sm text-red-600 mb-6">{erreur}</p>}

      {/* Vue d'ensemble établissement */}
      {chargement ? (
        <p className="text-sm text-ink-400 mb-8">Chargement des statistiques...</p>
      ) : dashboard && dashboard.moyenne !== null ? (
        <section className="mb-10">
          <div className="flex items-end justify-between gap-6 mb-6">
            <div>
              <p className="font-display text-[56px] leading-none text-ink-900">{dashboard.moyenne}</p>
              <p className="text-xs text-ink-400 mt-1">Moyenne établissement</p>
            </div>
            <div className="flex gap-6 pb-1.5">
              <div className="text-right">
                <p className="font-display text-xl text-ink-900">{dashboard.studentCount}</p>
                <p className="text-xs text-ink-400">Élèves</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl text-ink-900">{dashboard.evaluationCount}</p>
                <p className="text-xs text-ink-400">Évaluations</p>
              </div>
            </div>
          </div>

          {dashboard.evolution.length > 1 && (
            <div className="mb-6">
              <MiniCourbeEvolution points={dashboard.evolution} largeur={480} hauteur={64} />
            </div>
          )}

          {dashboard.distribution && (
            <div className="flex items-center gap-5 mb-6 rounded-lg border border-ink-100 bg-white p-4">
              <DonutNiveaux distribution={dashboard.distribution} taille={100} />
              <div className="flex flex-col gap-1.5">
                {Object.entries(dashboard.distribution)
                  .filter(([, v]) => v > 0)
                  .map(([niveau, valeur]) => (
                    <div key={niveau} className="flex items-center gap-2 text-xs">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COULEUR_NIVEAU[niveau] }} />
                      <span className="text-ink-800">{LIBELLES_NIVEAU[niveau] ?? niveau}</span>
                      <span className="text-ink-400 tabular-nums">{valeur}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {(dashboard.domainesForts.length > 0 || dashboard.domainesFaibles.length > 0) && (
            <div className="grid grid-cols-2 gap-6">
              <ListeDomaines titre="Domaines forts" items={dashboard.domainesForts} tonalite="force" />
              <ListeDomaines titre="Domaines faibles" items={dashboard.domainesFaibles} tonalite="priorite" />
            </div>
          )}
        </section>
      ) : (
        !erreur && (
          <p className="text-sm text-ink-400 mb-8">
            Pas encore d'évaluations enregistrées : les statistiques apparaîtront ici dès la première évaluation.
          </p>
        )
      )}

      {/* Actions rapides */}
      <section className="mb-10">
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

      {/* Aperçu par élève */}
      <section>
        <h2 className="text-sm font-medium text-ink-600 mb-3">Aperçu par élève</h2>

        {!chargement && students.length === 0 ? (
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

            {studentId &&
              (evaluations === null ? (
                <p className="text-sm text-ink-400">Chargement des évaluations...</p>
              ) : (
                <EleveApercu studentId={studentId} evaluations={evaluations} />
              ))}
          </>
        )}
      </section>
    </main>
  );
}
