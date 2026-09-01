"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { GardeSuperAdmin } from "@/components/GardeSuperAdmin";
import { logout } from "@/lib/auth";

const LIENS = [
  { href: "/admin/create-parent", label: "Créer un parent" },
  { href: "/admin/create-student", label: "Créer un élève" },
  { href: "/admin/create-staff", label: "Créer un membre du personnel" },
  { href: "/admin/create-matiere", label: "Assigner une matière à un professeur" },
  { href: "/admin/create-evaluation", label: "Créer une évaluation" },
  { href: "/prof/noter", label: "Noter un élève (professeur)" }
];

export default function AdminHomePage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-sm mx-auto">
      <header className="mb-6">
        <p className="text-sm text-ink-400">Commu_Parent</p>
        <h1 className="font-display text-2xl text-ink-900">Super Admin</h1>
      </header>

      <GardeSuperAdmin>
        {() => (
          <>
            <div className="grid gap-2 mb-6">
              {LIENS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md border border-ink-100 bg-white px-4 py-3 font-medium text-ink-800 hover:border-accent transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <button type="button" onClick={() => logout()} className="text-sm text-accent underline">
              Se déconnecter
            </button>
          </>
        )}
      </GardeSuperAdmin>
    </main>
  );
}
