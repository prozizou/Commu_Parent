import type { NiveauPerformance } from "@/types";
import { LIBELLES_NIVEAU } from "@/lib/performance";
import type { PositionComparaison } from "@/lib/performance";

const COULEURS_NIVEAU: Record<NiveauPerformance, string> = {
  unclassified: "bg-ink-100 text-ink-600",
  basic: "bg-red-50 text-red-700",
  aspiring: "bg-orange-50 text-orange-700",
  good: "bg-accent/10 text-accent",
  high: "bg-ink-600/10 text-ink-600",
  outstanding: "bg-ink-800/10 text-ink-800"
};

/** Pastille de niveau de performance (Basic / Aspiring / Good / High / Outstanding...). */
export function NiveauBadge({ niveau }: { niveau: NiveauPerformance }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${COULEURS_NIVEAU[niveau]}`}>
      {LIBELLES_NIVEAU[niveau]}
    </span>
  );
}

/** Barre de progression pour une compétence/matière, avec son pourcentage (section 16 du cahier des charges). */
export function BarrePourcentage({ label, pourcentage }: { label: string; pourcentage: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-ink-800">{label}</span>
        <span className="text-ink-400">{pourcentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-ink-50 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.max(0, Math.min(100, pourcentage))}%` }}
        />
      </div>
    </div>
  );
}

const LIBELLES_POSITION: Record<PositionComparaison, string> = {
  "au-dessus": "au-dessus",
  proche: "proche de",
  "en-dessous": "en dessous"
};

const COULEURS_POSITION: Record<PositionComparaison, string> = {
  "au-dessus": "text-ink-800",
  proche: "text-ink-400",
  "en-dessous": "text-red-600"
};

/** "24 — proche de la moyenne du groupe (27)" */
export function PositionBadge({
  position,
  reference,
  libelleReference
}: {
  position: PositionComparaison;
  reference: number;
  libelleReference: string;
}) {
  return (
    <span className={`text-xs ${COULEURS_POSITION[position]}`}>
      {LIBELLES_POSITION[position]} {libelleReference} ({reference})
    </span>
  );
}
