"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginStaff } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setLoading(true);
    try {
      await loginStaff(email.trim(), password);
      router.push("/admin");
    } catch {
      setErreur("Connexion impossible. Vérifiez l'email et le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm text-ink-400 mb-1">Commu_Parent</p>
          <h1 className="font-display text-3xl text-ink-900">Espace Super Admin</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-ink-100 rounded-lg p-6 space-y-4 shadow-sm"
        >
          <div>
            <label htmlFor="email" className="block text-sm text-ink-600 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 text-ink-900 focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-ink-600 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 text-ink-900 focus:border-accent"
            />
          </div>

          {erreur && (
            <p className="text-sm text-red-600" role="alert">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-ink-800 text-paper py-2.5 font-medium disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-xs text-ink-400 text-center mt-4">
          Pas encore de compte Super Admin ?{" "}
          <Link href="/admin/create-staff" className="text-accent underline">
            Créer le premier compte
          </Link>
        </p>
      </div>
    </main>
  );
}
