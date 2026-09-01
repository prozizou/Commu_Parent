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

const COULEURS_NIVEAU_BARRE: Record<NiveauPerformance, string> = {
  unclassified: "#8a97a6",
  basic: "#c14f4f",
  aspiring: "#c96a4d",
  good: "#4a6a8a",
  high: "#2c4a68",
  outstanding: "#101d2c"
};

/** Barre de répartition des niveaux d'une classe/établissement (section 9 du cahier des charges). */
export function BarreDistribution({ distribution }: { distribution: Record<NiveauPerformance, number> }) {
  const segments = (Object.entries(distribution) as [NiveauPerformance, number][]).filter(([, v]) => v > 0);
  if (segments.length === 0) return null;
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
        {segments.map(([niveau, valeur]) => (
          <div key={niveau} style={{ width: `${valeur}%`, background: COULEURS_NIVEAU_BARRE[niveau] }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
        {segments.map(([niveau, valeur]) => (
          <span key={niveau} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: COULEURS_NIVEAU_BARRE[niveau] }} />
            {LIBELLES_NIVEAU[niveau]} · {valeur}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** Liste de domaines forts ou faibles (établissement/classe), même granularité que ItemEvalue. */
export function ListeDomaines({
  titre,
  items,
  tonalite
}: {
  titre: string;
  items: { id: string; nom: string; pourcentage: number }[];
  tonalite: "force" | "priorite";
}) {
  if (items.length === 0) return null;
  const couleur = tonalite === "force" ? "text-ink-800" : "text-red-600";
  return (
    <div>
      <h3 className={`text-xs font-semibold mb-2 ${tonalite === "force" ? "text-ink-600" : "text-red-700"}`}>
        {titre}
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span className="text-ink-800">{item.nom}</span>
            <span className={`tabular-nums ${couleur}`}>{item.pourcentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barres verticales d'évolution de la moyenne établissement, session par session. */
export function EvolutionBarres({ points }: { points: { session: string; moyenne: number }[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.moyenne), 1);
  return (
    <div className="flex items-end gap-3 h-24">
      {points.map((p) => (
        <div key={p.session} className="flex flex-col items-center flex-1 h-full justify-end">
          <div
            className="w-full rounded-t-sm bg-accent"
            style={{ height: `${(p.moyenne / max) * 100}%`, minHeight: 4 }}
          />
          <div className="text-xs text-ink-400 mt-1.5">{p.session}</div>
          <div className="text-xs text-ink-800 tabular-nums">{p.moyenne}</div>
        </div>
      ))}
    </div>
  );
}
