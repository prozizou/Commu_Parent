"use client";

import {
  analyserEvolution,
  bilanDomainesToutesMatieres,
  synthetiserEvaluation,
  type PositionComparaison
} from "@/lib/performance";
import { BarrePourcentage, NiveauBadge } from "@/components/PerformanceUI";
import type { Evaluation } from "@/types";

const LIBELLES_POSITION: Record<PositionComparaison, string> = {
  "au-dessus": "au-dessus",
  proche: "proche de",
  "en-dessous": "en dessous de"
};

/**
 * Répond directement aux cinq questions fondamentales de la méthodologie (voir README
 * > "Analyse des performances scolaires") à partir de l'historique d'évaluations d'un
 * élève. Utilisé par la page d'accueil (mode ouvert) et réutilisable ailleurs.
 */
export function ObjectifsPerformance({ evaluations }: { evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return <p className="text-sm text-ink-400">Aucune évaluation pour cet élève pour l'instant.</p>;
  }

  const tri = [...evaluations].sort((a, b) => a.createdAt - b.createdAt);
  const derniere = tri[tri.length - 1];
  const synthese = synthetiserEvaluation(derniere);
  const bilanDomaines = bilanDomainesToutesMatieres(synthese);
  const evolution = analyserEvolution(tri.map((e) => ({ session: e.session, score: e.scoreGlobal })));
  const comp = synthese.comparaisonGlobale;

  return (
    <div className="space-y-6">
      <Question titre="Quel est le niveau de l'élève ?">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl text-ink-900">{synthese.scoreGlobal}</span>
          <span className="text-sm text-ink-400">/ {derniere.bareme.max}</span>
          <NiveauBadge niveau={synthese.niveau} />
        </div>
      </Question>

      <Question titre="Comment l'élève se situe-t-il par rapport à son groupe ?">
        {comp?.groupe !== undefined && comp.positionGroupe ? (
          <p className="text-sm text-ink-800">
            {synthese.scoreGlobal} — {LIBELLES_POSITION[comp.positionGroupe]} la moyenne du groupe ({comp.groupe})
          </p>
        ) : (
          <p className="text-sm text-ink-400">Pas de moyenne de groupe renseignée pour cette évaluation.</p>
        )}
      </Question>

      <Question titre="Comment se situe-t-il par rapport à l'établissement ou à une référence externe ?">
        {comp?.etablissement === undefined && comp?.referenceExterne === undefined ? (
          <p className="text-sm text-ink-400">
            Pas de moyenne d'établissement ni de référence externe renseignée pour cette évaluation.
          </p>
        ) : (
          <ul className="text-sm text-ink-800 space-y-1">
            {comp?.etablissement !== undefined && comp.positionEtablissement && (
              <li>
                Établissement : {LIBELLES_POSITION[comp.positionEtablissement]} la moyenne ({comp.etablissement})
              </li>
            )}
            {comp?.referenceExterne !== undefined && comp.positionReferenceExterne && (
              <li>
                Référence externe : {LIBELLES_POSITION[comp.positionReferenceExterne]} la moyenne (
                {comp.referenceExterne})
              </li>
            )}
          </ul>
        )}
      </Question>

      <Question titre="Quelles compétences maîtrise-t-il ou ne maîtrise-t-il pas ?">
        <div className="space-y-4">
          <GroupeCompetences titre="🟢 Maîtrisées" items={bilanDomaines.forces} />
          <GroupeCompetences titre="🟠 À renforcer" items={bilanDomaines.aRenforcer} />
          <GroupeCompetences titre="🔴 Priorités" items={bilanDomaines.priorites} />
        </div>
      </Question>

      <Question titre="Ses performances progressent-elles avec le temps ?">
        {!evolution ? (
          <p className="text-sm text-ink-400">
            Une seule évaluation enregistrée pour l'instant : pas encore de tendance mesurable.
          </p>
        ) : (
          <div className="text-sm text-ink-800">
            <p className="mb-2">
              {evolution.delta > 0 ? "+" : ""}
              {evolution.delta} point{Math.abs(evolution.delta) > 1 ? "s" : ""} entre les deux dernières
              évaluations
              {evolution.tendance === "progression" && " — progression."}
              {evolution.tendance === "baisse" && " — en baisse."}
              {evolution.tendance === "stagnation" && " — stable."}
            </p>
            <p className="text-xs text-ink-400">
              {evolution.historique.map((h) => `${h.session} : ${h.score}`).join(" → ")}
            </p>
          </div>
        )}
      </Question>
    </div>
  );
}

function Question({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-ink-100 bg-white p-4">
      <h3 className="text-sm font-medium text-ink-600 mb-2">{titre}</h3>
      {children}
    </section>
  );
}

function GroupeCompetences({ titre, items }: { titre: string; items: { id: string; nom: string; pourcentage: number }[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-ink-400 mb-1.5">{titre}</p>
      <div className="space-y-2">
        {items.map((i) => (
          <BarrePourcentage key={i.id} label={i.nom} pourcentage={i.pourcentage} />
        ))}
      </div>
    </div>
  );
}
