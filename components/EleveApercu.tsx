"use client";

import Link from "next/link";
import {
  analyserEvolution,
  prioritePedagogique,
  synthetiserEvaluation,
  type PositionComparaison
} from "@/lib/performance";
import { genererRecommandation } from "@/lib/recommandations";
import { JaugeScore, MiniCourbeEvolution } from "@/components/Charts";
import { NiveauBadge } from "@/components/PerformanceUI";
import type { Evaluation } from "@/types";

const COULEUR_NIVEAU: Record<string, string> = {
  unclassified: "#8a97a6",
  basic: "#c14f4f",
  aspiring: "#c96a4d",
  good: "#4a6a8a",
  high: "#2c4a68",
  outstanding: "#101d2c"
};

const LIBELLES_POSITION: Record<PositionComparaison, string> = {
  "au-dessus": "au-dessus de",
  proche: "proche de",
  "en-dessous": "en dessous de"
};

export function EleveApercu({ studentId, evaluations }: { studentId: string; evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return <p className="text-sm text-ink-400">Aucune évaluation pour cet élève pour l'instant.</p>;
  }

  const tri = [...evaluations].sort((a, b) => a.createdAt - b.createdAt);
  const derniere = tri[tri.length - 1];
  const synthese = synthetiserEvaluation(derniere);
  const comp = synthese.comparaisonGlobale;
  const evolution = analyserEvolution(tri.map((e) => ({ session: e.session, score: e.scoreGlobal })));
  const courbe = tri.map((e) => ({ session: e.session, moyenne: e.scoreGlobal }));

  const prioritesParMatiere = synthese.matieres
    .map((m) => ({ matiere: m.nom, priorite: prioritePedagogique(m) }))
    .filter((p): p is { matiere: string; priorite: NonNullable<ReturnType<typeof prioritePedagogique>> } => p.priorite !== null);
  const prioriteGlobale =
    prioritesParMatiere.length > 0
      ? prioritesParMatiere.reduce((pire, p) => (p.priorite.pourcentage < pire.priorite.pourcentage ? p : pire))
      : null;
  const recommandation = prioriteGlobale ? genererRecommandation(prioriteGlobale.priorite.nom) : null;

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5">
      <div className="flex items-center gap-5">
        <JaugeScore score={synthese.scoreGlobal} max={derniere.bareme.max} couleur={COULEUR_NIVEAU[synthese.niveau]} taille={116} />
        <div className="flex-1 min-w-0">
          <NiveauBadge niveau={synthese.niveau} />
          <p className="text-xs text-ink-400 mt-2">{derniere.session}</p>
          {comp?.groupe !== undefined && comp.positionGroupe && (
            <p className="text-sm text-ink-800 mt-1">
              {LIBELLES_POSITION[comp.positionGroupe]} la moyenne du groupe ({comp.groupe})
            </p>
          )}
        </div>
      </div>

      {courbe.length > 1 && (
        <div className="mt-5 pt-4 border-t border-ink-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-ink-400">Évolution</p>
            {evolution && (
              <p className="text-xs text-ink-600">
                {evolution.delta > 0 ? "+" : ""}
                {evolution.delta} pt{Math.abs(evolution.delta) > 1 ? "s" : ""}
                {evolution.tendance === "progression" && " ↗"}
                {evolution.tendance === "baisse" && " ↘"}
              </p>
            )}
          </div>
          <MiniCourbeEvolution points={courbe} largeur={260} hauteur={56} />
        </div>
      )}

      {prioriteGlobale && recommandation && (
        <div className="mt-5 pt-4 border-t border-ink-100">
          <p className="text-xs text-ink-400 mb-1">💡 Priorité pédagogique</p>
          <p className="text-sm text-ink-900 font-medium">
            {prioriteGlobale.priorite.nom}{" "}
            <span className="text-ink-400 font-normal">({prioriteGlobale.priorite.pourcentage}%)</span>
          </p>
          <p className="text-sm text-ink-800 mt-1">{recommandation.texte}</p>
        </div>
      )}

      <Link href={`/performance/${studentId}`} className="inline-block text-xs text-accent underline mt-4">
        Voir la fiche complète →
      </Link>
    </div>
  );
}
