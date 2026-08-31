"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { GardeSuperAdmin } from "@/components/GardeSuperAdmin";

type ParentOption = { idUnique: string; nom: string };

export default function CreateStudentAdminPage() {
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [chargementParents, setChargementParents] = useState(false);
  const [nom, setNom] = useState("");
  const [classe, setClasse] = useState("");
  const [ecoleId, setEcoleId] = useState("");
  const [parentsSelectionnes, setParentsSelectionnes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<string | null>(null);

  async function chargerParents(getToken: () => Promise<string>) {
    setErreur(null);
    setChargementParents(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/parents", {
        headers: { authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de chargement.");
      setParents(data.parents);
      if (data.parents.length === 0) setErreur("Aucun parent trouvé. Crée d'abord un compte parent.");
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setChargementParents(false);
    }
  }

  function toggleParent(idUnique: string) {
    setParentsSelectionnes((prev) =>
      prev.includes(idUnique) ? prev.filter((id) => id !== idUnique) : [...prev, idUnique]
    );
  }

  async function handleSubmit(e: React.FormEvent, getToken: () => Promise<string>) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);
    if (parentsSelectionnes.length === 0) {
      setErreur("Sélectionne au moins un parent.");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ nom, classe, ecoleId, parentIds: parentsSelectionnes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création.");
      setResultat(`Élève créé et rattaché à ${parentsSelectionnes.length} parent(s).`);
      setNom("");
      setClasse("");
      setParentsSelectionnes([]);
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-sm mx-auto">
      <header className="mb-6">
        <p className="text-sm text-ink-400">Commu_Parent — Admin</p>
        <h1 className="font-display text-2xl text-ink-900">Créer un élève</h1>
        <div className="flex gap-3 text-sm mt-1">
          <Link href="/admin" className="text-accent underline">
            ← Accueil admin
          </Link>
          <Link href="/admin/create-parent" className="text-accent underline">
            Créer un parent
          </Link>
        </div>
      </header>

      <GardeSuperAdmin>
        {(getToken) => (
          <>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => chargerParents(getToken)}
                disabled={chargementParents}
                className="w-full rounded-md bg-ink-800 text-paper px-3 py-2 text-sm font-medium disabled:opacity-60"
              >
                {chargementParents ? "Chargement..." : "Charger la liste des parents"}
              </button>
            </div>

            <form
              onSubmit={(e) => handleSubmit(e, getToken)}
              className="space-y-4 bg-white border border-ink-100 rounded-lg p-5"
            >
              <div>
                <label className="block text-sm text-ink-600 mb-1">Nom de l'élève</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-ink-600 mb-1">Classe</label>
                <input
                  type="text"
                  required
                  placeholder="ex: CM2 B"
                  value={classe}
                  onChange={(e) => setClasse(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-ink-600 mb-1">École (optionnel)</label>
                <input
                  type="text"
                  value={ecoleId}
                  onChange={(e) => setEcoleId(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-600 mb-2">Parent(s) à rattacher</label>
                {parents.length === 0 ? (
                  <p className="text-xs text-ink-400">
                    Appuie sur "Charger la liste des parents" pour voir les parents disponibles.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {parents.map((p) => (
                      <label
                        key={p.idUnique}
                        className="flex items-center gap-2 text-sm rounded-md border border-ink-100 px-3 py-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={parentsSelectionnes.includes(p.idUnique)}
                          onChange={() => toggleParent(p.idUnique)}
                        />
                        <span className="text-ink-800">{p.nom}</span>
                        <span className="text-ink-400 text-xs ml-auto">{p.idUnique}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {erreur && <p className="text-sm text-red-600">{erreur}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-ink-800 text-paper py-2.5 font-medium disabled:opacity-60"
              >
                {loading ? "Création..." : "Créer l'élève"}
              </button>
            </form>

            {resultat && (
              <div className="mt-4 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm text-ink-900">
                {resultat}
              </div>
            )}
          </>
        )}
      </GardeSuperAdmin>
    </main>
  );
}
