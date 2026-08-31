"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { auth, rtdb } from "@/lib/firebase";
import type { AppNotification, Student } from "@/types";

const typeLabels: Record<AppNotification["type"], string> = {
  absence: "Absence",
  note: "Note",
  devoir: "Devoir",
  message: "Message",
  annonce: "Annonce"
};

export default function DashboardPage() {
  const [parentId, setParentId] = useState<string | null>(null);
  const [enfants, setEnfants] = useState<Student[]>([]);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const idTokenResult = await user.getIdTokenResult();
      const pId = (idTokenResult.claims.parentId as string) ?? null;
      setParentId(pId);
    });
  }, []);

  useEffect(() => {
    if (!parentId) return;

    const notifQuery = query(ref(rtdb, `notifications/${parentId}`), orderByChild("timestamp"), limitToLast(20));
    const unsubNotifs = onValue(notifQuery, (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...child.val() });
      });
      setNotifs(list.reverse());
    });

    return () => unsubNotifs();
  }, [parentId]);

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <p className="text-sm text-ink-400">Commu_Parent</p>
        <h1 className="font-display text-2xl text-ink-900">Tableau de bord</h1>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-ink-600 mb-3">Mes enfants</h2>
        {enfants.length === 0 ? (
          <p className="text-sm text-ink-400">Aucun enfant rattaché pour l'instant.</p>
        ) : (
          <div className="grid gap-2">
            {enfants.map((s) => (
              <Link
                key={s.id}
                href={`/messages/${s.id}_${parentId}`}
                className="flex items-center justify-between rounded-md border border-ink-100 bg-white px-4 py-3 hover:border-accent transition-colors"
              >
                <span className="font-medium text-ink-800">{s.nom}</span>
                <span className="text-sm text-ink-400">{s.classe}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-ink-600 mb-3">Notifications récentes</h2>
        {notifs.length === 0 ? (
          <p className="text-sm text-ink-400">Rien de nouveau pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`rounded-md border px-4 py-3 text-sm ${
                  n.lu ? "border-ink-100 bg-white text-ink-600" : "border-accent/40 bg-accent/5 text-ink-900"
                }`}
              >
                <span className="font-medium">{typeLabels[n.type]}</span> — {n.contenu}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
