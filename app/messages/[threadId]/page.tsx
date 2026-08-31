"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, push, onValue, query, orderByChild, serverTimestamp } from "firebase/database";
import { auth, rtdb } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { Message } from "@/types";

export default function MessageThreadPage({ params }: { params: { threadId: string } }) {
  const { threadId } = params;
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const q = query(ref(rtdb, `messages/${threadId}`), orderByChild("timestamp"));
    return onValue(q, (snap) => {
      const list: Message[] = [];
      snap.forEach((child) => list.push({ id: child.key!, ...child.val() }));
      setMessages(list);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }, [threadId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (!texte.trim() && !fichier)) return;
    setEnvoi(true);
    try {
      let pieceJointeUrl: string | undefined;
      if (fichier) pieceJointeUrl = await uploadToCloudinary(fichier);

      await push(ref(rtdb, `messages/${threadId}`), {
        senderId: user.uid,
        senderType: "parent",
        senderNom: user.displayName ?? "Parent",
        texte: texte.trim(),
        pieceJointeUrl: pieceJointeUrl ?? null,
        timestamp: serverTimestamp(),
        lu: false
      });
      setTexte("");
      setFichier(null);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col max-w-2xl mx-auto px-4 py-6">
      <header className="mb-4">
        <h1 className="font-display text-xl text-ink-900">Échanges avec l'école</h1>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
              m.senderType === "parent"
                ? "ml-auto bg-ink-800 text-paper"
                : "bg-white border border-ink-100 text-ink-800"
            }`}
          >
            <p className="text-xs opacity-70 mb-0.5">{m.senderNom}</p>
            {m.texte && <p>{m.texte}</p>}
            {m.pieceJointeUrl && (
              <a href={m.pieceJointeUrl} target="_blank" rel="noreferrer" className="underline text-xs">
                Pièce jointe
              </a>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-ink-100 pt-3 flex gap-2 items-end">
        <input
          type="file"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          className="text-xs w-24"
        />
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Écrire un message..."
          rows={1}
          className="flex-1 resize-none rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-accent"
        />
        <button
          type="submit"
          disabled={envoi}
          className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Envoyer
        </button>
      </form>
    </main>
  );
}
