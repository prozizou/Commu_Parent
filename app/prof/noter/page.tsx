"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EXEMPLE_MATIERE_TEXTE, EvaluationParseError, parseMatiereTexte } from "@/lib/evaluationParser";
import type { MatiereEnseignee, Staff, Student } from "@/types";

// Exemple sans la ligne "Matiere:" : le professeur ne saisit pas le nom de la matière,
// il l'a déjà choisie dans le sélecteur — voir app/api/prof/noter/route.ts qui la préfixe.
const EXEMPLE_SANS_MATIERE = EXEMPLE_MATIERE_TEXTE.split("\n").slice(1).join("\n");

export default function NoterElevePage() {
  const [professeurs, setProfesseurs] = useState<Staff[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [professeurId, setProfesseurId] = useState("");
  const [matieres, setMatieres] = useState<MatiereEnseignee[]>([]);
  const [matiereId, setMatiereId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [session, setSession] = useState("");
  const [texteResultats, setTexteResultats] = useState(EXEMPLE_SANS_MATIERE);
  const [erreurFormat, setErreurFormat] = useState<string | null>(null);

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ scoreGlobal: number; niveau: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/staff").then((res) => res.json()),
      fetch("/api/admin/students").then((res) => res.json())
    ])
      .then(([staffData, studentsData]) => {
        if (staffData.error) throw new Error(staffData.error);
        if (studentsData.error) throw new Error(studentsData.error);
        setProfesseurs((staffData.staff as Staff[]).filter((s) => s.role === "professeur"));
        setStudents(studentsData.students);
      })
      .catch((err) => setErreurChargement(err.message))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!professeurId) {
      setMatieres([]);
      setMatiereId("");
      return;
    }
    fetch(`/api/admin/matieres?professeurId=${professeurId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMatieres(data.matieres);
      })
      .catch((err) => setErreur(err.message));
  }, [professeurId]);

  const professeur = professeurs.find((p) => p.uid === professeurId);
  const elevesEncadres =
    professeur?.classes && professeur.classes.length > 0
      ? students.filter((s) => professeur.classes!.includes(s.classe))
      : students; // pas de classes renseignées = pas de restriction (voir route API)

  function majTexte(texte: string) {
    setTexteResultats(texte);
    try {
      parseMatiereTexte(`Matiere: temp\n${texte}`);
      setErreurFormat(null);
    } catch (err) {
      setErreurFormat(err instanceof EvaluationParseError ? err.message : "Format invalide.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);

    if (!professeurId) return setErreur("Choisis ton compte professeur.");
    if (!matiereId) return setErreur("Choisis une matière.");
    if (!studentId) return setErreur("Choisis un élève.");
    if (!session.trim()) return setErreur("Renseigne la session (ex: Mai 2026).");
    if (erreurFormat) return setErreur("Corrige le format des résultats avant d'enregistrer.");

    setEnvoi(true);
    try {
      const res = await fetch("/api/prof/noter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professeurId,
          matiereId,
          studentId,
          session: session.trim(),
          texteResultats
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'enregistrement.");
      setResultat({ scoreGlobal: data.synthese.scoreGlobal, niveau: data.synthese.libelleNiveau });
      setTexteResultats(EXEMPLE_SANS_MATIERE);
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <p className="text-sm text-ink-400">Commu_Parent — Professeur</p>
        <h1 className="font-display text-2xl text-ink-900">Noter un élève</h1>
        <Link href="/" className="text-sm text-accent underline">
          ← Accueil
        </Link>
      </header>

      {chargement ? (
        <p className="text-sm text-ink-400">Chargement...</p>
      ) : erreurChargement ? (
        <p className="text-sm text-red-600">{erreurChargement}</p>
      ) : professeurs.length === 0 ? (
        <p className="text-sm text-ink-400">Aucun professeur enregistré pour l'instant.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-ink-100 rounded-lg p-5">
          <div>
            <label className="block text-sm text-ink-600 mb-1">Professeur</label>
            <select
              required
              value={professeurId}
              onChange={(e) => {
                setProfesseurId(e.target.value);
                setMatiereId("");
                setStudentId("");
              }}
              className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent bg-white"
            >
              <option value="">— Choisir —</option>
              {professeurs.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.nom}
                </option>
              ))}
            </select>
          </div>

          {professeurId && (
            <div>
              <label className="block text-sm text-ink-600 mb-1">Matière</label>
              {matieres.length === 0 ? (
                <p className="text-xs text-ink-400">
                  Aucune matière assignée à ce professeur.{" "}
                  <Link href="/admin/create-matiere" className="text-accent underline">
                    En assigner une
                  </Link>
                  .
                </p>
              ) : (
                <select
                  required
                  value={matiereId}
                  onChange={(e) => setMatiereId(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent bg-white"
                >
                  <option value="">— Choisir —</option>
                  {matieres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {professeurId && (
            <div>
              <label className="block text-sm text-ink-600 mb-1">Élève</label>
              {elevesEncadres.length === 0 ? (
                <p className="text-xs text-ink-400">Aucun élève dans les classes encadrées par ce professeur.</p>
              ) : (
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent bg-white"
                >
                  <option value="">— Choisir —</option>
                  {elevesEncadres.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom} ({s.classe})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-ink-600 mb-1">Session</label>
            <input
              type="text"
              required
              placeholder="ex: Mai 2026"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-600 mb-1">Résultats</label>
            <textarea
              required
              rows={8}
              value={texteResultats}
              onChange={(e) => majTexte(e.target.value)}
              className="w-full font-mono text-xs rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
            {erreurFormat && <p className="text-xs text-red-600 mt-1">{erreurFormat}</p>}
            <p className="text-xs text-ink-400 mt-2">
              Format : <code>Score: n</code>, puis une ligne <code>Domaine: nom | score</code> par domaine (score
              optionnel), et pour chaque domaine des lignes <code>Sous: nom | obtenus | possibles</code>.
            </p>
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={envoi}
            className="w-full rounded-md bg-ink-800 text-paper py-2.5 font-medium disabled:opacity-60"
          >
            {envoi ? "Enregistrement..." : "Enregistrer la note"}
          </button>
        </form>
      )}

      {resultat && (
        <div className="mt-4 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm text-ink-900">
          Note enregistrée — score {resultat.scoreGlobal} ({resultat.niveau}).
        </div>
      )}
    </main>
  );
}
