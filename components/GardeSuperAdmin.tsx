"use client";

import Link from "next/link";
import { useSuperAdmin } from "@/lib/useSuperAdmin";
import { logout } from "@/lib/auth";

/**
 * Protège une page /admin/* : n'affiche `children` que si l'utilisateur connecté est
 * Super Admin (claims `staff: true, role: "admin"`). Passe `getToken()` aux enfants pour
 * authentifier les appels API (Authorization: Bearer <idToken>).
 */
export function GardeSuperAdmin({
  children
}: {
  children: (getToken: () => Promise<string>) => React.ReactNode;
}) {
  const etat = useSuperAdmin();

  if (etat.loading) {
    return <p className="text-sm text-ink-400">Vérification de la session...</p>;
  }

  if (!etat.connecte) {
    return (
      <div className="rounded-md border border-ink-100 bg-white p-4 text-sm">
        <p className="text-ink-800 mb-2">Cette page est réservée au Super Admin.</p>
        <Link href="/admin/login" className="text-accent underline">
          Se connecter →
        </Link>
      </div>
    );
  }

  if (!etat.autorise) {
    return (
      <div className="rounded-md border border-ink-100 bg-white p-4 text-sm">
        <p className="text-ink-800 mb-2">
          Connecté en tant que <span className="font-mono">{etat.user.email}</span>, mais ce compte n'a pas les
          droits Super Admin.
        </p>
        <button type="button" onClick={() => logout()} className="text-accent underline">
          Se déconnecter
        </button>
      </div>
    );
  }

  return <>{children(etat.getToken)}</>;
}
