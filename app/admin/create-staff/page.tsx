"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useSuperAdmin } from "@/lib/useSuperAdmin";
import type { StaffRole } from "@/types";

export default function CreateStaffAdminPage() {
  const etat = useSuperAdmin();
  const [adminSecret, setAdminSecret] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("professeur");
  const [ecoleId, setEcoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ email: string; motDePasse: string | null } | null>(null);

  // Tant qu'aucun Super Admin n'est connecté, on autorise la création via le code
  // ADMIN_API_SECRET (bootstrap du tout premier compte). Une fois connecté en Super
  // Admin, ce champ disparaît : la requête est authentifiée par le token de session.
  const modeBootstrap = etat.loading ? true : !(etat.connecte && etat.autorise);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (modeBootstrap) {
        if (!adminSecret) throw new Error("Code admin requis pour créer le tout premier compte Super Admin.");
        headers["x-admin-secret"] = adminSecret;
      } else if (!etat.loading && etat.connecte && etat.autorise) {
        headers["authorization"] = `Bearer ${await etat.getToken()}`;
      }

      const res = await fetch("/api/admin/create-staff", {
        method: "POST",
        headers,
        body: JSON.stringify({ nom, email, role, ecoleId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création.");
      setResultat({ email: data.email, motDePasse: data.motDePasse });
      setNom("");
      setEmail("");
      setEcoleId("");
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (etat.loading) {
    return (
      <main className="min-h-screen px-4 py-8 max-w-sm mx-auto">
        <p className="text-sm text-ink-400">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-sm mx-auto">
      <header className="mb-6">
        <p className="text-sm text-ink-400">Commu_Parent — Admin</p>
        <h1 className="font-display text-2xl text-ink-900">Créer un membre du personnel</h1>
        <Link href="/admin" className="text-sm text-accent underline">
          ← Accueil admin
        </Link>
      </header>

      {modeBootstrap && (
        <p className="text-xs text-ink-400 mb-4">
          Aucun Super Admin n'est connecté : saisis le code admin (variable d'environnement{" "}
          <code>ADMIN_API_SECRET</code>) pour créer le tout premier compte. Une fois ce compte créé, connecte-toi
          sur{" "}
          <Link href="/admin/login" className="text-accent underline">
            /admin/login
          </Link>{" "}
          pour créer les comptes suivants sans code.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-ink-100 rounded-lg p-5">
        {modeBootstrap && (
          <div>
            <label className="block text-sm text-ink-600 mb-1">Code admin</label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
          </div>
        )}
        <div>
          <label className="block text-sm text-ink-600 mb-1">Nom</label>
          <input
            type="text"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-ink-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-ink-600 mb-1">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent bg-white"
          >
            <option value="professeur">Professeur</option>
            <option value="admin">Super Admin</option>
          </select>
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
            Email : <span className="font-mono">{resultat.email}</span>
          </p>
          {resultat.motDePasse ? (
            <>
              <p>
                Mot de passe provisoire : <span className="font-mono">{resultat.motDePasse}</span>
              </p>
              <p className="text-ink-400 text-xs pt-1">
                À transmettre à la personne, à faire changer dès la première connexion.
              </p>
            </>
          ) : (
            <p className="text-ink-400 text-xs pt-1">
              Ce compte existait déjà : son mot de passe n'a pas été modifié, seul son rôle a été mis à jour.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
