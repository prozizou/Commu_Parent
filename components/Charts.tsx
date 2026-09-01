"use client";

const COULEURS_NIVEAU: Record<string, string> = {
  unclassified: "#8a97a6",
  basic: "#c14f4f",
  aspiring: "#c96a4d",
  good: "#4a6a8a",
  high: "#2c4a68",
  outstanding: "#101d2c"
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/**
 * Jauge radiale : un arc de 270° (repli d'un compteur), rempli proportionnellement au
 * score. Élément signature de la page d'accueil — le seul endroit de l'app avec ce
 * traitement, à dessein (voir principe "spend your boldness in one place").
 */
export function JaugeScore({
  score,
  max,
  couleur,
  taille = 140
}: {
  score: number;
  max: number;
  couleur: string;
  taille?: number;
}) {
  const cx = taille / 2;
  const cy = taille / 2;
  const r = taille / 2 - 12;
  const angleDepart = -135;
  const angleFin = 135;
  const proportion = Math.max(0, Math.min(1, score / max));
  const angleValeur = angleDepart + (angleFin - angleDepart) * proportion;

  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}>
      <path d={arcPath(cx, cy, r, angleDepart, angleFin)} stroke="#eef2f6" strokeWidth={10} fill="none" strokeLinecap="round" />
      {proportion > 0 && (
        <path
          d={arcPath(cx, cy, r, angleDepart, angleValeur)}
          stroke={couleur}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={taille * 0.24} fontWeight={600} fill="#101d2c" fontFamily="Fraunces, serif">
        {score}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize={taille * 0.09} fill="#4a6a8a">
        / {max}
      </text>
    </svg>
  );
}

/** Donut de répartition des niveaux (Basic/Aspiring/Good/High/Outstanding/Unclassified). */
export function DonutNiveaux({
  distribution,
  taille = 120
}: {
  distribution: Record<string, number>;
  taille?: number;
}) {
  const cx = taille / 2;
  const cy = taille / 2;
  const r = taille / 2 - 10;
  const segments = Object.entries(distribution).filter(([, v]) => v > 0);

  let angleCourant = 0;
  const arcs = segments.map(([niveau, valeur]) => {
    const angleDepart = angleCourant;
    const angleFin = angleCourant + (valeur / 100) * 360;
    angleCourant = angleFin;
    return { niveau, angleDepart, angleFin };
  });

  if (arcs.length === 0) {
    return (
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef2f6" strokeWidth={14} />
      </svg>
    );
  }

  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}>
      {arcs.map(({ niveau, angleDepart, angleFin }) => {
        // Cercle complet (100% sur un seul niveau) : un arc de 359.99° évite un path dégénéré.
        const fin = angleFin - angleDepart >= 360 ? angleDepart + 359.99 : angleFin;
        return (
          <path
            key={niveau}
            d={arcPath(cx, cy, r, angleDepart, fin)}
            stroke={COULEURS_NIVEAU[niveau] ?? "#8a97a6"}
            strokeWidth={14}
            fill="none"
          />
        );
      })}
    </svg>
  );
}

/** Mini-courbe (aire) d'évolution d'une moyenne au fil des sessions. */
export function MiniCourbeEvolution({
  points,
  largeur = 280,
  hauteur = 64,
  couleur = "#c96a4d"
}: {
  points: { session: string; moyenne: number }[];
  largeur?: number;
  hauteur?: number;
  couleur?: string;
}) {
  if (points.length === 0) return null;

  const marge = 4;
  const valeurs = points.map((p) => p.moyenne);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const echelle = max - min || 1;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? largeur / 2 : marge + (i / (points.length - 1)) * (largeur - marge * 2);
    const y = hauteur - marge - ((p.moyenne - min) / echelle) * (hauteur - marge * 2);
    return { x, y };
  });

  const ligne = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const aire = `${ligne} L ${coords[coords.length - 1].x} ${hauteur} L ${coords[0].x} ${hauteur} Z`;

  return (
    <svg width={largeur} height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`}>
      <path d={aire} fill={couleur} fillOpacity={0.12} />
      <path d={ligne} stroke={couleur} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={couleur} />
      ))}
    </svg>
  );
}
