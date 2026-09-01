"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSuperAdmin } from "@/lib/useSuperAdmin";
import { AUTH_DISABLED } from "@/lib/authConfig";
import type { MatiereEnseignee, Staff } from "@/types";

export default function CreateMatierePage() {
  const etat = useSuperAdmin();
  const [professeurs, setProfesseurs] = useState<Staff[]>([]);
  const [matieres, setMatieres] = useState<MatiereEnseignee[]>([]);
  const [chargement, setChargement] = useState(false);
  const [professeurId, setProfesseurId] = useState("");
  const [nom, setNom] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function getHeaders(): Promise<Record<string, string>> {
    if (AUTH_DISABLED) return { "Content-Type": "application/json" };
    if (!etat.loading && etat.connecte && etat.autorise) {
      return { "Content-Type": "application/json", authorization: `Bearer ${await etat.getToken()}` };
    }
    return { "Content-Type": "application/json" };
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const headers = await getHeaders();
      const [staffRes, matieresRes] = await Promise.all([
        fetch("/api/admin/staff", { headers }),
        fetch("/api/admin/matieres", { headers })
      ]);
      const staffData = await staffRes.json();
      const matieresData = await matieresRes.json();
      if (staffData.error) throw new Error(staffData.error);
      if (matieresData.error) throw new Error(matieresData.error);
      setProfesseurs((staffData.staff as Staff[]).filter((s) => s.role === "professeur"));
      setMatieres(matieresData.matieres);
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    if (AUTH_DISABLED || (!etat.loading && etat.connecte && etat.autorise)) {
      charger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!professeurId) return setErreur("Choisis un professeur.");
    if (!nom.trim()) return setErreur("Nom de la matière requis.");

    setEnvoi(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/admin/create-matiere", {
        method: "POST",
        headers,
        body: JSON.stringify({ nom: nom.trim(), professeurId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création.");
      setNom("");
      await charger();
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  const professeurParId = new Map(professeurs.map((p) => [p.uid, p]));

  return (
    <main className="min-h-screen px-4 py-8 max-w-sm mx-auto">
      <header className="mb-6">
        <p className="text-sm text-ink-400">Commu_Parent — Admin</p>
        <h1 className="font-display text-2xl text-ink-900">Matières par professeur</h1>
        <Link href="/admin" className="text-sm text-accent underline">
          ← Accueil admin
        </Link>
      </header>

      {chargement && professeurs.length === 0 ? (
        <p className="text-sm text-ink-400">Chargement...</p>
      ) : professeurs.length === 0 ? (
        <p className="text-sm text-ink-400">
          Aucun professeur pour l'instant.{" "}
          <Link href="/admin/create-staff" className="text-accent underline">
            En créer un
          </Link>
          .
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-ink-100 rounded-lg p-5">
            <div>
              <label className="block text-sm text-ink-600 mb-1">Professeur</label>
              <select
                value={professeurId}
                onChange={(e) => setProfesseurId(e.target.value)}
                className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent bg-white"
              >
                <option value="">— Choisir —</option>
                {professeurs.map((p) => (
                  <option key={p.uid} value={p.uid}>
                    {p.nom}
                    {p.classes && p.classes.length > 0 ? ` (${p.classes.join(", ")})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-ink-600 mb-1">Nom de la matière</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: Mathématiques"
                className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
              />
            </div>

            {erreur && <p className="text-sm text-red-600">{erreur}</p>}

            <button
              type="submit"
              disabled={envoi}
              className="w-full rounded-md bg-ink-800 text-paper py-2.5 font-medium disabled:opacity-60"
            >
              {envoi ? "Ajout..." : "Assigner la matière"}
            </button>
          </form>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-ink-600 mb-2">Matières existantes</h2>
            {matieres.length === 0 ? (
              <p className="text-sm text-ink-400">Aucune matière assignée pour l'instant.</p>
            ) : (
              <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white overflow-hidden">
                {matieres.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-ink-900">{m.nom}</span>
                    <span className="text-xs text-ink-400">{professeurParId.get(m.professeurId)?.nom ?? m.professeurId}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  );
}
