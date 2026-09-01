/**
 * Recommandations pédagogiques et pistes d'exercices, à partir d'une sous-compétence
 * identifiée comme priorité (voir prioritePedagogique dans lib/performance.ts).
 *
 * Pas d'appel externe/IA ici : une table de correspondance par mot-clé sur le nom de la
 * compétence, avec un repli générique si aucun mot-clé ne correspond — cohérent avec le
 * reste de l'app (déterministe, pas de dépendance réseau, fonctionne offline une fois
 * les données chargées). La table couvre les domaines du barème Cambridge Primary
 * Checkpoint (celui utilisé par défaut, voir SEUILS_CAMBRIDGE), à étendre si d'autres
 * types d'évaluation sont ajoutés.
 */

type Recommandation = { texte: string; suggestions: string[] };

const TABLE_MOTS_CLES: { motsCles: string[]; recommandation: Recommandation }[] = [
  {
    motsCles: ["reading", "lecture"],
    recommandation: {
      texte: "Travailler la compréhension de lecture, en particulier l'extraction de détails précis dans un texte.",
      suggestions: [
        "Lire un court texte puis répondre à des questions factuelles précises (qui, quand, combien)",
        "Surligner dans le texte les passages qui répondent à chaque question",
        "Reformuler un paragraphe dans ses propres mots"
      ]
    }
  },
  {
    motsCles: ["writing", "écriture", "ecriture"],
    recommandation: {
      texte: "Renforcer la production écrite : structure des phrases, organisation des idées.",
      suggestions: [
        "Écrire un court paragraphe sur un sujet simple, puis le relire à voix haute",
        "Exercices de réorganisation de phrases mélangées",
        "Dictées courtes suivies d'une correction collective"
      ]
    }
  },
  {
    motsCles: ["listening", "écoute", "ecoute"],
    recommandation: {
      texte: "Développer la compréhension orale par une écoute active répétée.",
      suggestions: [
        "Écouter un court audio et répondre à des questions simples",
        "Exercices de dictée à l'écoute",
        "Suivre des instructions orales en plusieurs étapes"
      ]
    }
  },
  {
    motsCles: ["speaking", "expression orale"],
    recommandation: {
      texte: "Pratiquer l'expression orale en contexte guidé pour gagner en aisance.",
      suggestions: [
        "Courtes présentations orales sur un sujet familier",
        "Jeux de rôle en binôme avec phrases modèles",
        "Répétition de dialogues simples"
      ]
    }
  },
  {
    motsCles: ["number", "nombre", "calcul"],
    recommandation: {
      texte: "Consolider les bases numériques (calcul, valeur de position) avant d'aller plus loin.",
      suggestions: [
        "Exercices de calcul mental quotidiens, courts et réguliers",
        "Manipulation concrète (jetons, réglettes) pour la valeur de position",
        "Problèmes simples à une étape avant de passer à plusieurs étapes"
      ]
    }
  },
  {
    motsCles: ["geometry", "géométrie", "geometrie", "measure", "mesure"],
    recommandation: {
      texte: "Travailler la géométrie et les mesures par la manipulation concrète plutôt que l'abstrait.",
      suggestions: [
        "Manipuler des formes géométriques réelles (découpage, tri par propriétés)",
        "Mesurer des objets du quotidien avec une règle ou un mètre",
        "Exercices de repérage sur quadrillage"
      ]
    }
  },
  {
    motsCles: ["statistics", "statistique", "probability", "probabilité", "probabilite"],
    recommandation: {
      texte: "Revoir la lecture et la construction de représentations de données simples.",
      suggestions: [
        "Construire un petit tableau ou diagramme à partir de données collectées en classe",
        "Lire un graphique simple et en tirer 2-3 informations",
        "Comparer des quantités à partir d'un diagramme en barres"
      ]
    }
  },
  {
    motsCles: ["thinking and working mathematically", "raisonnement"],
    recommandation: {
      texte: "Encourager la verbalisation du raisonnement, pas seulement le résultat final.",
      suggestions: [
        "Demander systématiquement \"comment as-tu trouvé ce résultat ?\"",
        "Résoudre un même problème de deux façons différentes",
        "Problèmes ouverts avec plusieurs solutions possibles"
      ]
    }
  },
  {
    motsCles: ["use of english", "grammaire", "vocabulaire"],
    recommandation: {
      texte: "Renforcer le vocabulaire et les structures grammaticales de base par la pratique répétée.",
      suggestions: [
        "Fiches de vocabulaire thématiques avec réemploi en phrases",
        "Exercices à trous ciblés sur la structure grammaticale en difficulté",
        "Lecture courte suivie de questions de vocabulaire"
      ]
    }
  }
];

const RECOMMANDATION_GENERIQUE: Recommandation = {
  texte: "Prévoir un temps de reprise ciblé sur cette compétence, avec des exercices courts et réguliers plutôt qu'une longue session isolée.",
  suggestions: [
    "Identifier 2-3 exercices courts à répéter sur plusieurs jours",
    "Reprendre un exemple déjà vu en classe pas à pas",
    "Vérifier la compréhension avec une question simple avant de continuer"
  ]
};

/** Trouve la recommandation associée au nom d'une compétence (matching insensible à la casse). */
export function genererRecommandation(nomCompetence: string): Recommandation {
  const nomLower = nomCompetence.toLowerCase();
  const correspondance = TABLE_MOTS_CLES.find(({ motsCles }) => motsCles.some((mot) => nomLower.includes(mot)));
  return correspondance?.recommandation ?? RECOMMANDATION_GENERIQUE;
}
