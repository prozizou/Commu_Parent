"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { GardeSuperAdmin } from "@/components/GardeSuperAdmin";

export default function CreateParentAdminPage() {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [emailReel, setEmailReel] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ idUnique: string; motDePasse: string } | null>(null);

  async function handleSubmit(e: React.FormEvent, getToken: () => Promise<string>) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/create-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ nom, telephone, emailReel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création.");
      setResultat(data);
      setNom("");
      setTelephone("");
      setEmailReel("");
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
        <h1 className="font-display text-2xl text-ink-900">Créer un compte parent</h1>
        <div className="flex gap-3 text-sm mt-1">
          <Link href="/admin" className="text-accent underline">
            ← Accueil admin
          </Link>
          <Link href="/admin/create-student" className="text-accent underline">
            Créer un élève →
          </Link>
        </div>
      </header>

      <GardeSuperAdmin>
        {(getToken) => (
          <>
            <form
              onSubmit={(e) => handleSubmit(e, getToken)}
              className="space-y-4 bg-white border border-ink-100 rounded-lg p-5"
            >
              <div>
                <label className="block text-sm text-ink-600 mb-1">Nom du parent</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-ink-600 mb-1">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-ink-600 mb-1">Email réel (optionnel)</label>
                <input
                  type="email"
                  value={emailReel}
                  onChange={(e) => setEmailReel(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
                />
              </div>

              {erreur && <p className="text-sm text-red-600">{erreur}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-ink-800 text-paper py-2.5 font-medium disabled:opacity-60"
              >
                {loading ? "Création..." : "Créer le compte"}
              </button>
            </form>

            {resultat && (
              <div className="mt-4 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm space-y-1">
                <p className="font-medium text-ink-900">Compte créé avec succès</p>
                <p>
                  ID de connexion : <span className="font-mono">{resultat.idUnique}</span>
                </p>
                <p>
                  Mot de passe provisoire : <span className="font-mono">{resultat.motDePasse}</span>
                </p>
                <p className="text-ink-400 text-xs pt-1">À transmettre au parent pour sa première connexion.</p>
              </div>
            )}
          </>
        )}
      </GardeSuperAdmin>
    </main>
  );
}
