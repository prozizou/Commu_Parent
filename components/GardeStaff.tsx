"use client";

import Link from "next/link";
import { useStaff } from "@/lib/useStaff";
import { AUTH_DISABLED } from "@/lib/authConfig";
import { logout } from "@/lib/auth";
import type { StaffRole } from "@/types";

/**
 * Protège une page staff : n'affiche `children` que si l'utilisateur connecté porte les
 * claims `{ staff: true, role }`. `roleRequis` restreint à un rôle précis (ex: "admin"
 * pour /dashboard/etablissement), sinon accepte admin ET professeur.
 */
export function GardeStaff({
  roleRequis,
  children
}: {
  roleRequis?: StaffRole;
  children: (getToken: () => Promise<string>, role: StaffRole, ecoleId: string | null) => React.ReactNode;
}) {
  const etat = useStaff(roleRequis);

  if (AUTH_DISABLED) {
    return <>{children(async () => "", roleRequis ?? "admin", null)}</>;
  }

  if (etat.loading) {
    return <p className="text-sm text-ink-400">Vérification de la session...</p>;
  }

  if (!etat.connecte) {
    return (
      <div className="rounded-md border border-ink-100 bg-white p-4 text-sm">
        <p className="text-ink-800 mb-2">Cette page est réservée au personnel de l'école.</p>
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
          droits nécessaires pour cette page.
        </p>
        <button type="button" onClick={() => logout()} className="text-accent underline">
          Se déconnecter
        </button>
      </div>
    );
  }

  return <>{children(etat.getToken, etat.role, etat.ecoleId)}</>;
}
