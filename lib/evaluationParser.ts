/**
 * Parseur du format texte utilisé dans le formulaire admin "Nouvelle évaluation".
 * Permet à un membre du staff de saisir une matière complète (domaines + sous-compétences)
 * sans construire un formulaire imbriqué compliqué, en collant un texte structuré du type :
 *
 *   Matiere: Mathématiques
 *   Score: 29
 *   Domaine: Thinking and Working Mathematically | 27
 *   Domaine: Number | 27
 *     Sous: Counting and sequences | 2 | 4
 *     Sous: Integers and powers | 5 | 8
 *     Sous: Place value, ordering and rounding | 3 | 6
 *   Domaine: Geometry and Measure | 34
 *   Domaine: Statistics and Probability | 28
 *
 * Une ligne "Sous: ..." indentée se rattache toujours au dernier "Domaine:" rencontré.
 * Le score du domaine est optionnel (ex: "Domaine: Number" sans score, si seules les
 * sous-compétences sont connues).
 */
import type { DomaineResult, MatiereResult, SousCompetenceResult } from "@/types";

function slugify(nom: string): string {
  return (
    nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // retire les accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

export class EvaluationParseError extends Error {}

export function parseMatiereTexte(texte: string): MatiereResult {
  const lignes = texte
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let nom: string | null = null;
  let scoreGlobal: number | null = null;
  const domaines: DomaineResult[] = [];
  let domaineCourant: DomaineResult | null = null;
  const domaineIds = new Set<string>();

  for (const ligne of lignes) {
    if (/^matiere\s*:/i.test(ligne)) {
      nom = ligne.replace(/^matiere\s*:/i, "").trim();
    } else if (/^score\s*:/i.test(ligne)) {
      const valeur = Number(ligne.replace(/^score\s*:/i, "").trim());
      if (Number.isNaN(valeur)) throw new EvaluationParseError(`Score de matière invalide : "${ligne}"`);
      scoreGlobal = valeur;
    } else if (/^domaine\s*:/i.test(ligne)) {
      const parts = ligne.replace(/^domaine\s*:/i, "").split("|").map((p) => p.trim());
      const [domNom, domScore] = parts;
      if (!domNom) throw new EvaluationParseError(`Nom de domaine manquant : "${ligne}"`);
      let id = slugify(domNom);
      while (domaineIds.has(id)) id += "-2";
      domaineIds.add(id);
      domaineCourant = {
        id,
        nom: domNom,
        score: domScore !== undefined && domScore !== "" ? Number(domScore) : undefined,
        sousCompetences: []
      };
      if (domaineCourant.score !== undefined && Number.isNaN(domaineCourant.score)) {
        throw new EvaluationParseError(`Score de domaine invalide : "${ligne}"`);
      }
      domaines.push(domaineCourant);
    } else if (/^sous\s*:/i.test(ligne)) {
      if (!domaineCourant) {
        throw new EvaluationParseError(`Sous-compétence sans domaine parent : "${ligne}"`);
      }
      const parts = ligne.replace(/^sous\s*:/i, "").split("|").map((p) => p.trim());
      const [scNom, obtenusStr, possiblesStr] = parts;
      const obtenus = Number(obtenusStr);
      const possibles = Number(possiblesStr);
      if (!scNom || Number.isNaN(obtenus) || Number.isNaN(possibles)) {
        throw new EvaluationParseError(
          `Ligne "Sous:" invalide (attendu "Sous: nom | obtenus | possibles") : "${ligne}"`
        );
      }
      const sc: SousCompetenceResult = { id: slugify(scNom), nom: scNom, pointsObtenus: obtenus, pointsPossibles: possibles };
      (domaineCourant.sousCompetences ??= []).push(sc);
    } else {
      throw new EvaluationParseError(`Ligne non reconnue : "${ligne}"`);
    }
  }

  if (!nom) throw new EvaluationParseError('Il manque la ligne "Matiere: ...".');
  if (scoreGlobal === null) throw new EvaluationParseError('Il manque la ligne "Score: ...".');

  return { id: slugify(nom), nom, scoreGlobal, domaines };
}

/** Exemple pré-rempli, utilisé comme placeholder dans le formulaire admin. */
export const EXEMPLE_MATIERE_TEXTE = `Matiere: Mathématiques
Score: 29
Domaine: Thinking and Working Mathematically | 27
Domaine: Number | 27
  Sous: Counting and sequences | 2 | 4
  Sous: Integers and powers | 5 | 8
  Sous: Place value, ordering and rounding | 3 | 6
  Sous: Fractions, decimals, percentages, ratio and proportion | 9 | 15
Domaine: Geometry and Measure | 34
Domaine: Statistics and Probability | 28`;
