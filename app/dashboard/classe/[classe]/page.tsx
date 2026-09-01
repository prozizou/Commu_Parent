"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GardeStaff } from "@/components/GardeStaff";
import { NiveauBadge } from "@/components/PerformanceUI";
import type { NiveauPerformance } from "@/types";

type EleveResultat = {
  studentId: string;
  nom: string;
  scoreGlobal: number | null;
  niveau: NiveauPerformance | null;
  session: string | null;
  ecartMoyenne: number | null;
};

type ReponseClasse = {
  classe: string;
  session: string | null;
  moyenneClasse: number | null;
  sessionsDisponibles: string[];
  eleves: EleveResultat[];
};

export default function ClassePage({ params }: { params: { classe: string } }) {
  const classe = decodeURIComponent(params.classe);

  return (
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      <header className="mb-6">
        <Link href="/admin" className="text-sm text-accent underline">
          ← Tableau de bord
        </Link>
        <p className="text-sm text-ink-400 mt-2">Résultats de classe</p>
        <h1 className="font-display text-2xl text-ink-900">{classe}</h1>
      </header>

      <GardeStaff>
        {(getToken) => <ContenuClasse classe={classe} getToken={getToken} />}
      </GardeStaff>
    </main>
  );
}

function ContenuClasse({ classe, getToken }: { classe: string; getToken: () => Promise<string> }) {
  const [data, setData] = useState<ReponseClasse | null>(null);
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
        const params = new URLSearchParams({ classe });
        if (session) params.set("session", session);
        const res = await fetch(`/api/staff/classe?${params.toString()}`, {
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
  }, [classe, session, getToken]);

  if (chargement && !data) return <p className="text-sm text-ink-400">Chargement...</p>;
  if (erreur) return <p className="text-sm text-red-600">{erreur}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
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

      {data.moyenneClasse !== null && (
        <p className="text-sm text-ink-600">
          Moyenne de la classe : <span className="font-medium text-ink-900">{data.moyenneClasse}</span>
        </p>
      )}

      {data.eleves.length > 0 && (
        <button
          type="button"
          onClick={() =>
            import("@/lib/exportExcel").then(({ exporterClasseExcel }) =>
              exporterClasseExcel({
                classe: data.classe,
                session: data.session,
                moyenneClasse: data.moyenneClasse,
                eleves: data.eleves
              })
            )
          }
          className="text-xs text-accent underline"
        >
          Exporter en Excel
        </button>
      )}

      {data.eleves.length === 0 ? (
        <p className="text-sm text-ink-400">Aucun élève trouvé pour cette classe.</p>
      ) : (
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white overflow-hidden">
          {data.eleves.map((eleve) => (
            <li key={eleve.studentId}>
              <Link
                href={`/performance/${eleve.studentId}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-ink-50 transition-colors"
              >
                <div>
                  <p className="text-sm text-ink-900">{eleve.nom}</p>
                  {eleve.niveau && (
                    <div className="mt-1">
                      <NiveauBadge niveau={eleve.niveau} />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {eleve.scoreGlobal !== null ? (
                    <>
                      <p className="font-display text-lg text-ink-900 tabular-nums">{eleve.scoreGlobal}</p>
                      {eleve.ecartMoyenne !== null && (
                        <p
                          className={`text-xs tabular-nums ${
                            eleve.ecartMoyenne > 0
                              ? "text-ink-800"
                              : eleve.ecartMoyenne < 0
                              ? "text-red-600"
                              : "text-ink-400"
                          }`}
                        >
                          {eleve.ecartMoyenne > 0 ? "+" : ""}
                          {eleve.ecartMoyenne} vs classe
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-ink-400">Pas encore évalué</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
