/**
 * Moteur de calcul de l'analyse des performances scolaires.
 *
 * Reprend la logique du rapport Cambridge Primary Checkpoint analysé :
 *   Élève → Score global → Matière → Domaine → Sous-compétence
 *   → points obtenus / points possibles → forces / difficultés.
 *
 * Toutes les fonctions sont pures (aucun accès réseau/Firebase ici) pour rester
 * testables et réutilisables aussi bien côté serveur (API routes) que client (pages).
 */
import type {
  ComparaisonScores,
  DomaineResult,
  Evaluation,
  MatiereResult,
  NiveauPerformance,
  SousCompetenceResult
} from "@/types";

/* ------------------------------------------------------------------ */
/* 1. Pourcentages et niveaux                                          */
/* ------------------------------------------------------------------ */

/** Performance = points obtenus / points possibles, en pourcentage. */
export function pourcentage(pointsObtenus: number, pointsPossibles: number): number {
  if (!pointsPossibles || pointsPossibles <= 0) return 0;
  return Math.round((pointsObtenus / pointsPossibles) * 1000) / 10; // 1 décimale
}

/**
 * Échelle de niveaux du rapport Cambridge Primary Checkpoint analysé (score sur 0-50).
 * Important : ce barème correspond au système Cambridge du rapport source. Pour un
 * autre barème d'établissement, adapter les seuils (ou fournir un barème personnalisé
 * à `niveauPerformance`).
 */
export const SEUILS_CAMBRIDGE: { max: number; niveau: NiveauPerformance }[] = [
  { max: 0, niveau: "unclassified" },
  { max: 10, niveau: "basic" },
  { max: 20, niveau: "aspiring" },
  { max: 30, niveau: "good" },
  { max: 40, niveau: "high" },
  { max: 50, niveau: "outstanding" }
];

export const LIBELLES_NIVEAU: Record<NiveauPerformance, string> = {
  unclassified: "Non classifié",
  basic: "Niveau de base",
  aspiring: "Niveau en développement",
  good: "Bon niveau",
  high: "Niveau élevé",
  outstanding: "Niveau exceptionnel"
};

/**
 * Détermine le niveau de performance à partir d'un score sur l'échelle Cambridge (0-50).
 * Passer des `seuils` personnalisés pour un autre barème d'établissement.
 */
export function niveauPerformance(
  score: number,
  seuils: { max: number; niveau: NiveauPerformance }[] = SEUILS_CAMBRIDGE
): NiveauPerformance {
  if (score <= 0) return seuils[0].niveau;
  const palier = seuils.find((s) => score <= s.max);
  return palier ? palier.niveau : seuils[seuils.length - 1].niveau;
}

/* ------------------------------------------------------------------ */
/* 2. Agrégation domaine / matière                                     */
/* ------------------------------------------------------------------ */

/** Total points obtenus / possibles d'un domaine, à partir de ses sous-compétences. */
export function totalDomaine(domaine: DomaineResult): { obtenus: number; possibles: number } {
  return domaine.sousCompetences.reduce(
    (acc, sc) => ({ obtenus: acc.obtenus + sc.pointsObtenus, possibles: acc.possibles + sc.pointsPossibles }),
    { obtenus: 0, possibles: 0 }
  );
}

/**
 * Pourcentage de réussite d'un domaine.
 * Utilise le score agrégé du domaine s'il est fourni (cas des rapports Cambridge où le
 * score du domaine est calculé/pondéré par l'organisme, pas simplement recalculable
 * depuis les sous-compétences) ; sinon retombe sur le total des sous-compétences.
 */
export function pourcentageDomaine(domaine: DomaineResult, bareme?: { min: number; max: number }): number {
  if (typeof domaine.score === "number" && bareme) {
    return pourcentage(domaine.score - bareme.min, bareme.max - bareme.min);
  }
  const { obtenus, possibles } = totalDomaine(domaine);
  return pourcentage(obtenus, possibles);
}

/** Pourcentage d'une matière à partir de son score global sur le barème de l'évaluation. */
export function pourcentageMatiere(matiere: MatiereResult, bareme: { min: number; max: number }): number {
  return pourcentage(matiere.scoreGlobal - bareme.min, bareme.max - bareme.min);
}

/* ------------------------------------------------------------------ */
/* 3. Forces / difficultés                                             */
/* ------------------------------------------------------------------ */

export type ItemEvalue = { id: string; nom: string; pourcentage: number };

export type BilanForcesFaiblesses = {
  forces: ItemEvalue[]; // >= seuilFort
  aRenforcer: ItemEvalue[]; // >= seuilRenforcer et < seuilFort
  priorites: ItemEvalue[]; // < seuilRenforcer
};

/**
 * Classe une liste d'items (compétences, domaines, matières...) en forces / à renforcer /
 * priorités, à partir de leur pourcentage de réussite.
 *
 * Note : ces seuils (80 % / 70 % par défaut) sont une proposition de présentation
 * pédagogique ; le rapport Cambridge source ne définit pas ces paliers-là — seule
 * l'échelle de score global 0-50 en fait partie.
 */
export function identifierForcesEtDifficultes(
  items: ItemEvalue[],
  seuilFort = 80,
  seuilRenforcer = 70
): BilanForcesFaiblesses {
  const tries = [...items].sort((a, b) => b.pourcentage - a.pourcentage);
  return {
    forces: tries.filter((i) => i.pourcentage >= seuilFort),
    aRenforcer: tries.filter((i) => i.pourcentage >= seuilRenforcer && i.pourcentage < seuilFort),
    priorites: tries.filter((i) => i.pourcentage < seuilRenforcer)
  };
}

/** Construit la liste des `ItemEvalue` pour toutes les sous-compétences d'un domaine. */
export function itemsSousCompetences(domaine: DomaineResult): ItemEvalue[] {
  return domaine.sousCompetences.map((sc) => ({
    id: sc.id,
    nom: sc.nom,
    pourcentage: pourcentage(sc.pointsObtenus, sc.pointsPossibles)
  }));
}

/** Construit la liste des `ItemEvalue` pour tous les domaines d'une matière. */
export function itemsDomaines(matiere: MatiereResult, bareme: { min: number; max: number }): ItemEvalue[] {
  return matiere.domaines.map((d) => ({ id: d.id, nom: d.nom, pourcentage: pourcentageDomaine(d, bareme) }));
}

/** Construit la liste des `ItemEvalue` pour toutes les matières d'une évaluation. */
export function itemsMatieres(evaluation: Evaluation): ItemEvalue[] {
  return evaluation.matieres.map((m) => ({
    id: m.id,
    nom: m.nom,
    pourcentage: pourcentageMatiere(m, evaluation.bareme)
  }));
}

/* ------------------------------------------------------------------ */
/* 4. Comparaisons (groupe / établissement / référence externe)        */
/* ------------------------------------------------------------------ */

export type PositionComparaison = "au-dessus" | "proche" | "en-dessous";

/** Écart considéré comme "proche de la moyenne" (sur la même échelle que les scores comparés). */
const ECART_PROCHE = 2;

export function positionParRapportA(score: number, reference: number, ecartProche = ECART_PROCHE): PositionComparaison {
  const delta = score - reference;
  if (Math.abs(delta) <= ecartProche) return "proche";
  return delta > 0 ? "au-dessus" : "en-dessous";
}

export type ComparaisonDetaillee = ComparaisonScores & {
  positionGroupe?: PositionComparaison;
  positionEtablissement?: PositionComparaison;
  positionReferenceExterne?: PositionComparaison;
};

export function comparerScores(comparaison: ComparaisonScores): ComparaisonDetaillee {
  const { eleve, groupe, etablissement, referenceExterne } = comparaison;
  return {
    ...comparaison,
    positionGroupe: groupe !== undefined ? positionParRapportA(eleve, groupe) : undefined,
    positionEtablissement: etablissement !== undefined ? positionParRapportA(eleve, etablissement) : undefined,
    positionReferenceExterne:
      referenceExterne !== undefined ? positionParRapportA(eleve, referenceExterne) : undefined
  };
}

/* ------------------------------------------------------------------ */
/* 5. Distribution des performances (composition d'un groupe/classe)   */
/* ------------------------------------------------------------------ */

export type DistributionNiveaux = Record<NiveauPerformance, number>; // pourcentage par niveau, somme = 100

/** Répartit une liste de scores (0-50) en pourcentage par niveau de performance. */
export function distributionNiveaux(
  scores: number[],
  seuils: { max: number; niveau: NiveauPerformance }[] = SEUILS_CAMBRIDGE
): DistributionNiveaux {
  const distribution = Object.fromEntries(seuils.map((s) => [s.niveau, 0])) as DistributionNiveaux;
  if (scores.length === 0) return distribution;

  for (const score of scores) {
    const niveau = niveauPerformance(score, seuils);
    distribution[niveau] += 1;
  }
  for (const niveau of Object.keys(distribution) as NiveauPerformance[]) {
    distribution[niveau] = Math.round((distribution[niveau] / scores.length) * 1000) / 10;
  }
  return distribution;
}

/* ------------------------------------------------------------------ */
/* 6. Évolution dans le temps                                          */
/* ------------------------------------------------------------------ */

export type PointHistorique = { session: string; score: number };
export type TendanceEvolution = "progression" | "stagnation" | "baisse";

export type BilanEvolution = {
  tendance: TendanceEvolution;
  delta: number; // score le plus récent - score précédent
  historique: PointHistorique[];
};

/**
 * Analyse la tendance entre les deux évaluations les plus récentes d'un historique.
 * `seuilStagnation` définit l'écart en-deçà duquel on considère qu'il n'y a ni
 * progression ni baisse significative.
 */
export function analyserEvolution(historique: PointHistorique[], seuilStagnation = 1): BilanEvolution | null {
  if (historique.length < 2) return null;
  const tri = [...historique].sort((a, b) => a.session.localeCompare(b.session));
  const [precedent, recent] = tri.slice(-2);
  const delta = Math.round((recent.score - precedent.score) * 10) / 10;

  let tendance: TendanceEvolution = "stagnation";
  if (delta > seuilStagnation) tendance = "progression";
  else if (delta < -seuilStagnation) tendance = "baisse";

  return { tendance, delta, historique: tri };
}

/* ------------------------------------------------------------------ */
/* 7. Synthèse complète d'une évaluation                               */
/* ------------------------------------------------------------------ */

export type SyntheseSousCompetence = SousCompetenceResult & { pourcentage: number };
export type SyntheseDomaine = { id: string; nom: string; pourcentage: number; sousCompetences: SyntheseSousCompetence[] };
export type SyntheseMatiere = {
  id: string;
  nom: string;
  scoreGlobal: number;
  pourcentage: number;
  domaines: SyntheseDomaine[];
  bilan: BilanForcesFaiblesses;
  comparaison?: ComparaisonDetaillee;
};

export type SyntheseEvaluation = {
  scoreGlobal: number;
  niveau: NiveauPerformance;
  libelleNiveau: string;
  matieres: SyntheseMatiere[];
  bilanMatieres: BilanForcesFaiblesses;
  comparaisonGlobale?: ComparaisonDetaillee;
};

/**
 * Point d'entrée principal : transforme une évaluation brute en synthèse pédagogique
 * exploitable directement par les vues (score, niveau, forces/difficultés à chaque
 * granularité, comparaisons). C'est la fonction que les pages doivent appeler.
 */
export function synthetiserEvaluation(evaluation: Evaluation): SyntheseEvaluation {
  const { bareme } = evaluation;

  const matieres: SyntheseMatiere[] = evaluation.matieres.map((matiere) => {
    const domaines: SyntheseDomaine[] = matiere.domaines.map((domaine) => ({
      id: domaine.id,
      nom: domaine.nom,
      pourcentage: pourcentageDomaine(domaine, bareme),
      sousCompetences: domaine.sousCompetences.map((sc) => ({ ...sc, pourcentage: pourcentage(sc.pointsObtenus, sc.pointsPossibles) }))
    }));

    const comparaisonBrute = evaluation.comparaisons?.[matiere.id];

    return {
      id: matiere.id,
      nom: matiere.nom,
      scoreGlobal: matiere.scoreGlobal,
      pourcentage: pourcentageMatiere(matiere, bareme),
      domaines,
      bilan: identifierForcesEtDifficultes(itemsDomaines(matiere, bareme)),
      comparaison: comparaisonBrute ? comparerScores(comparaisonBrute) : undefined
    };
  });

  const comparaisonGlobaleBrute = evaluation.comparaisons?.global;

  return {
    scoreGlobal: evaluation.scoreGlobal,
    niveau: niveauPerformance(evaluation.scoreGlobal),
    libelleNiveau: LIBELLES_NIVEAU[niveauPerformance(evaluation.scoreGlobal)],
    matieres,
    bilanMatieres: identifierForcesEtDifficultes(itemsMatieres(evaluation)),
    comparaisonGlobale: comparaisonGlobaleBrute ? comparerScores(comparaisonGlobaleBrute) : undefined
  };
}

/**
 * Bilan forces/difficultés au niveau des domaines, toutes matières confondues d'une
 * évaluation (utilisé pour le résumé "⭐ Points forts / 🎯 À travailler" côté parent).
 * Si une matière n'a pas de domaines détaillés, elle est elle-même utilisée comme item.
 */
export function bilanDomainesToutesMatieres(synthese: SyntheseEvaluation): BilanForcesFaiblesses {
  const items: ItemEvalue[] = synthese.matieres.flatMap((m) =>
    m.domaines.length > 0
      ? m.domaines.map((d) => ({ id: `${m.id}:${d.id}`, nom: d.nom, pourcentage: d.pourcentage }))
      : [{ id: m.id, nom: m.nom, pourcentage: m.pourcentage }]
  );
  return identifierForcesEtDifficultes(items);
}

/** La sous-compétence la plus faible d'une matière : la priorité pédagogique à travailler. */
export function prioritePedagogique(matiere: SyntheseMatiere): SyntheseSousCompetence | null {
  const toutes = matiere.domaines.flatMap((d) => d.sousCompetences);
  if (toutes.length === 0) return null;
  return toutes.reduce((pire, sc) => (sc.pourcentage < pire.pourcentage ? sc : pire));
}
