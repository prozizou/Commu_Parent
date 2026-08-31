"use client";

export const dynamic = "force-dynamic";

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

    // parents/{parentId}/enfants ne contient que les studentId (Record<string, true>) :
    // on va chercher la fiche complète de chaque élève dans /students.
    const unsubParent = onValue(ref(rtdb, `parents/${parentId}/enfants`), (snap) => {
      const studentIds = snap.exists() ? Object.keys(snap.val()) : [];
      if (studentIds.length === 0) {
        setEnfants([]);
        return;
      }
      Promise.all(
        studentIds.map(
          (id) =>
            new Promise<Student | null>((resolve) => {
              onValue(ref(rtdb, `students/${id}`), (s) => resolve(s.exists() ? s.val() : null), { onlyOnce: true });
            })
        )
      ).then((liste) => setEnfants(liste.filter((s): s is Student => s !== null)));
    });

    const notifQuery = query(ref(rtdb, `notifications/${parentId}`), orderByChild("timestamp"), limitToLast(20));
    const unsubNotifs = onValue(notifQuery, (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...child.val() });
      });
      setNotifs(list.reverse());
    });

    return () => {
      unsubParent();
      unsubNotifs();
    };
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
              <div
                key={s.id}
                className="rounded-md border border-ink-100 bg-white px-4 py-3 hover:border-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-800">{s.nom}</span>
                  <span className="text-sm text-ink-400">{s.classe}</span>
                </div>
                <div className="mt-2 flex gap-4 text-sm">
                  <Link href={`/messages/${s.id}_${parentId}`} className="text-accent">
                    Messagerie
                  </Link>
                  <Link href={`/performance/${s.id}`} className="text-accent">
                    Résultats scolaires
                  </Link>
                </div>
              </div>
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
