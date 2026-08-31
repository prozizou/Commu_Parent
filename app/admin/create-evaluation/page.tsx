"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { parseMatiereTexte, EXEMPLE_MATIERE_TEXTE, EvaluationParseError } from "@/lib/evaluationParser";
import type { ComparaisonScores, MatiereResult } from "@/types";

type StudentOption = { id: string; nom: string; classe: string };

type BlocMatiere = { texte: string; erreur: string | null };

function nouveauBloc(texte = ""): BlocMatiere {
  return { texte, erreur: null };
}

export default function CreateEvaluationAdminPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [chargement, setChargement] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [session, setSession] = useState("");
  const [groupeId, setGroupeId] = useState("");
  const [baremeMin, setBaremeMin] = useState("0");
  const [baremeMax, setBaremeMax] = useState("50");
  const [blocs, setBlocs] = useState<BlocMatiere[]>([nouveauBloc(EXEMPLE_MATIERE_TEXTE)]);
  const [compGroupe, setCompGroupe] = useState("");
  const [compEtablissement, setCompEtablissement] = useState("");
  const [compReference, setCompReference] = useState("");

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ evaluationId: string; scoreGlobal: number; niveau: string } | null>(
    null
  );

  async function chargerEleves() {
    if (!adminSecret) {
      setErreur("Saisis le code admin d'abord.");
      return;
    }
    setErreur(null);
    setChargement(true);
    try {
      const res = await fetch("/api/admin/students", { headers: { "x-admin-secret": adminSecret } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de chargement.");
      setStudents(data.students);
      if (data.students.length === 0) setErreur("Aucun élève trouvé. Crée d'abord une fiche élève.");
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  function majBloc(index: number, texte: string) {
    setBlocs((prev) => {
      const copie = [...prev];
      let erreur: string | null = null;
      try {
        parseMatiereTexte(texte);
      } catch (err) {
        erreur = err instanceof EvaluationParseError ? err.message : "Format invalide.";
      }
      copie[index] = { texte, erreur };
      return copie;
    });
  }

  function ajouterMatiere() {
    setBlocs((prev) => [...prev, nouveauBloc()]);
  }

  function retirerMatiere(index: number) {
    setBlocs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);

    if (!studentId) return setErreur("Sélectionne un élève.");
    if (!session.trim()) return setErreur("Renseigne la session (ex: Mai 2026).");
    if (blocs.length === 0) return setErreur("Ajoute au moins une matière.");

    let matieres: MatiereResult[];
    try {
      matieres = blocs.map((b) => parseMatiereTexte(b.texte));
    } catch (err) {
      setErreur(err instanceof EvaluationParseError ? err.message : "Une matière contient une erreur de format.");
      return;
    }

    const comparaisonGlobale: ComparaisonScores | null =
      compGroupe || compEtablissement || compReference
        ? {
            eleve: 0, // rempli côté serveur avec le scoreGlobal calculé
            groupe: compGroupe ? Number(compGroupe) : undefined,
            etablissement: compEtablissement ? Number(compEtablissement) : undefined,
            referenceExterne: compReference ? Number(compReference) : undefined
          }
        : null;

    setEnvoi(true);
    try {
      const res = await fetch("/api/admin/create-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          studentId,
          session: session.trim(),
          groupeId: groupeId.trim() || undefined,
          bareme: { min: Number(baremeMin), max: Number(baremeMax) },
          matieres,
          comparaisons: comparaisonGlobale ? { global: comparaisonGlobale } : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création.");
      setResultat({
        evaluationId: data.evaluationId,
        scoreGlobal: data.synthese.scoreGlobal,
        niveau: data.synthese.libelleNiveau
      });
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <p className="text-sm text-ink-400">Commu_Parent — Admin</p>
        <h1 className="font-display text-2xl text-ink-900">Nouvelle évaluation</h1>
        <p className="text-sm text-ink-400 mt-1">
          Saisir les résultats d'une évaluation (matières → domaines → sous-compétences), sur le modèle
          Cambridge Primary Checkpoint.
        </p>
        <Link href="/admin/create-student" className="text-sm text-accent underline">
          ← Créer un élève
        </Link>
      </header>

      <div className="mb-4 flex gap-2">
        <input
          type="password"
          placeholder="Code admin"
          value={adminSecret}
          onChange={(e) => setAdminSecret(e.target.value)}
          className="flex-1 rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
        />
        <button
          type="button"
          onClick={chargerEleves}
          disabled={chargement}
          className="rounded-md bg-ink-800 text-paper px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {chargement ? "..." : "Charger"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-ink-100 rounded-lg p-5">
        <div>
          <label className="block text-sm text-ink-600 mb-1">Élève</label>
          {students.length === 0 ? (
            <p className="text-xs text-ink-400">
              Saisis le code admin puis appuie sur "Charger" pour voir la liste des élèves.
            </p>
          ) : (
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent bg-white"
            >
              <option value="">— Choisir —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.classe})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <label className="block text-sm text-ink-600 mb-1">Groupe (optionnel)</label>
            <input
              type="text"
              value={groupeId}
              onChange={(e) => setGroupeId(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-ink-600 mb-1">Barème (échelle des scores)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={baremeMin}
              onChange={(e) => setBaremeMin(e.target.value)}
              className="w-20 rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
            <span className="text-ink-400">à</span>
            <input
              type="number"
              value={baremeMax}
              onChange={(e) => setBaremeMax(e.target.value)}
              className="w-20 rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
            <span className="text-xs text-ink-400">(0–50 = échelle Cambridge Checkpoint)</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-ink-600">Matières</label>
            <button type="button" onClick={ajouterMatiere} className="text-sm text-accent underline">
              + Ajouter une matière
            </button>
          </div>
          <div className="space-y-4">
            {blocs.map((bloc, i) => (
              <div key={i} className="rounded-md border border-ink-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-400">Matière {i + 1}</span>
                  {blocs.length > 1 && (
                    <button type="button" onClick={() => retirerMatiere(i)} className="text-xs text-red-600">
                      Retirer
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={8}
                  value={bloc.texte}
                  onChange={(e) => majBloc(i, e.target.value)}
                  placeholder={EXEMPLE_MATIERE_TEXTE}
                  className="w-full font-mono text-xs rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
                />
                {bloc.erreur && <p className="text-xs text-red-600 mt-1">{bloc.erreur}</p>}
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-400 mt-2">
            Format : <code>Matiere: nom</code>, <code>Score: n</code>, puis une ligne{" "}
            <code>Domaine: nom | score</code> par domaine (score optionnel), et pour chaque domaine des lignes{" "}
            <code>Sous: nom | obtenus | possibles</code>.
          </p>
        </div>

        <div>
          <label className="block text-sm text-ink-600 mb-1">Comparaison du score global (optionnel)</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Groupe"
              value={compGroupe}
              onChange={(e) => setCompGroupe(e.target.value)}
              className="rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
            <input
              type="number"
              placeholder="Établissement"
              value={compEtablissement}
              onChange={(e) => setCompEtablissement(e.target.value)}
              className="rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
            <input
              type="number"
              placeholder="Référence externe"
              value={compReference}
              onChange={(e) => setCompReference(e.target.value)}
              className="rounded-md border border-ink-100 px-3 py-2 focus:border-accent"
            />
          </div>
        </div>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-md bg-ink-800 text-paper py-2.5 font-medium disabled:opacity-60"
        >
          {envoi ? "Enregistrement..." : "Enregistrer l'évaluation"}
        </button>
      </form>

      {resultat && (
        <div className="mt-4 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm text-ink-900">
          Évaluation enregistrée — score global {resultat.scoreGlobal} ({resultat.niveau}).
        </div>
      )}
    </main>
  );
}
