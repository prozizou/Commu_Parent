"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GardeStaff } from "@/components/GardeStaff";
import type { ResultatCompetence, ResultatEleve } from "@/app/api/staff/recherche/route";

export default function RecherchePage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      <header className="mb-6">
        <Link href="/admin" className="text-sm text-accent underline">
          ← Tableau de bord
        </Link>
        <p className="text-sm text-ink-400 mt-2">Recherche</p>
        <h1 className="font-display text-2xl text-ink-900">Élève ou compétence</h1>
      </header>

      <GardeStaff>{(getToken) => <ContenuRecherche getToken={getToken} />}</GardeStaff>
    </main>
  );
}

function ContenuRecherche({ getToken }: { getToken: () => Promise<string> }) {
  const [q, setQ] = useState("");
  const [eleves, setEleves] = useState<ResultatEleve[]>([]);
  const [competences, setCompetences] = useState<ResultatCompetence[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const q2 = q.trim();
    if (q2.length < 2) {
      setEleves([]);
      setCompetences([]);
      return;
    }

    let annule = false;
    const timeout = setTimeout(async () => {
      setChargement(true);
      setErreur(null);
      try {
        const token = await getToken();
        const res = await fetch(`/api/staff/recherche?q=${encodeURIComponent(q2)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur inconnue.");
        if (!annule) {
          setEleves(json.eleves);
          setCompetences(json.competences);
        }
      } catch (err: any) {
        if (!annule) setErreur(err.message ?? "Erreur inconnue.");
      } finally {
        if (!annule) setChargement(false);
      }
    }, 350); // debounce : évite un appel réseau à chaque frappe

    return () => {
      annule = true;
      clearTimeout(timeout);
    };
  }, [q, getToken]);

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nom d'élève, ou domaine/compétence (ex: Reading, Number...)"
        className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm bg-white focus:border-accent"
        autoFocus
      />

      {chargement && <p className="text-sm text-ink-400">Recherche...</p>}
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      {q.trim().length >= 2 && !chargement && eleves.length === 0 && competences.length === 0 && !erreur && (
        <p className="text-sm text-ink-400">Aucun résultat.</p>
      )}

      {eleves.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-ink-600 mb-2">Élèves</h2>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white overflow-hidden">
            {eleves.map((e) => (
              <li key={e.studentId}>
                <Link
                  href={`/performance/${e.studentId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-ink-50 transition-colors"
                >
                  <span className="text-sm text-ink-900">{e.nom}</span>
                  <span className="text-xs text-ink-400">{e.classe}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {competences.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-ink-600 mb-1">Compétences à renforcer</h2>
          <p className="text-xs text-ink-400 mb-2">
            Élèves dont la dernière évaluation montre une faiblesse (&lt;70%) correspondant à la recherche.
          </p>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white overflow-hidden">
            {competences.map((c, i) => (
              <li key={`${c.studentId}-${i}`}>
                <Link
                  href={`/performance/${c.studentId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-ink-50 transition-colors"
                >
                  <div>
                    <p className="text-sm text-ink-900">{c.nomEleve}</p>
                    <p className="text-xs text-ink-400">
                      {c.matiere} · {c.domaine}
                      {c.sousCompetence ? ` · ${c.sousCompetence}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-red-600 tabular-nums">{c.pourcentage}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
