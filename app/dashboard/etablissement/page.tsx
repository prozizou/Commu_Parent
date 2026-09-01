"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GardeStaff } from "@/components/GardeStaff";
import { BarreDistribution, EvolutionBarres, ListeDomaines } from "@/components/PerformanceUI";
import type { ItemEvalue } from "@/lib/performance";
import type { NiveauPerformance } from "@/types";

type ReponseEtablissement = {
  session: string | null;
  sessionsDisponibles: string[];
  studentCount: number;
  moyenne: number | null;
  distribution: Record<NiveauPerformance, number> | null;
  domainesForts: ItemEvalue[];
  domainesFaibles: ItemEvalue[];
  evolution: { session: string; moyenne: number }[];
};

export default function EtablissementPage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      <header className="mb-6">
        <Link href="/admin" className="text-sm text-accent underline">
          ← Tableau de bord
        </Link>
        <p className="text-sm text-ink-400 mt-2">Vue d'ensemble</p>
        <h1 className="font-display text-2xl text-ink-900">Établissement</h1>
      </header>

      <GardeStaff roleRequis="admin">
        {(getToken) => <ContenuEtablissement getToken={getToken} />}
      </GardeStaff>
    </main>
  );
}

function ContenuEtablissement({ getToken }: { getToken: () => Promise<string> }) {
  const [data, setData] = useState<ReponseEtablissement | null>(null);
  const [session, setSession] = useState<string | undefined>(undefined);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      setErreur(null);
      try {
        const token = await getToken();
        const params = new URLSearchParams();
        if (session) params.set("session", session);
        const res = await fetch(`/api/staff/etablissement?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur inconnue.");
        if (!annule) setData(json);
      } catch (err: any) {
        if (!annule) setErreur(err.message ?? "Erreur inconnue.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => {
      annule = true;
    };
  }, [session, getToken]);

  if (chargement && !data) return <p className="text-sm text-ink-400">Chargement...</p>;
  if (erreur) return <p className="text-sm text-red-600">{erreur}</p>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      {data.sessionsDisponibles.length > 0 && (
        <select
          value={session ?? data.session ?? ""}
          onChange={(e) => setSession(e.target.value)}
          className="border border-ink-100 rounded-md px-3 py-2 text-sm bg-white"
        >
          {data.sessionsDisponibles.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {data.moyenne === null ? (
        <p className="text-sm text-ink-400">Aucune évaluation pour cette session.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              import("@/lib/exportExcel").then(({ exporterEtablissementExcel }) =>
                exporterEtablissementExcel({
                  session: data.session,
                  studentCount: data.studentCount,
                  moyenne: data.moyenne,
                  distribution: data.distribution,
                  domainesForts: data.domainesForts.map((d) => ({ nom: d.nom, pourcentage: d.pourcentage })),
                  domainesFaibles: data.domainesFaibles.map((d) => ({ nom: d.nom, pourcentage: d.pourcentage })),
                  evolution: data.evolution
                })
              )
            }
            className="text-xs text-accent underline"
          >
            Exporter en Excel
          </button>

          <section className="flex gap-8 rounded-lg border border-ink-100 bg-white p-5">
            <div>
              <p className="font-display text-3xl text-ink-900">{data.moyenne}</p>
              <p className="text-xs text-ink-400 mt-1">Performance moyenne</p>
            </div>
            <div>
              <p className="font-display text-3xl text-ink-900">{data.studentCount}</p>
              <p className="text-xs text-ink-400 mt-1">Élèves évalués</p>
            </div>
          </section>

          {data.distribution && (
            <section>
              <h2 className="text-sm font-medium text-ink-600 mb-3">Répartition des niveaux</h2>
              <BarreDistribution distribution={data.distribution} />
            </section>
          )}

          <section className="grid grid-cols-2 gap-6">
            <ListeDomaines titre="Domaines forts" items={data.domainesForts} tonalite="force" />
            <ListeDomaines titre="Domaines faibles" items={data.domainesFaibles} tonalite="priorite" />
          </section>

          {data.evolution.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-ink-600 mb-3">Évolution</h2>
              <EvolutionBarres points={data.evolution} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
