import * as XLSX from "xlsx";

type EleveResultat = {
  studentId: string;
  nom: string;
  scoreGlobal: number | null;
  niveau: string | null;
  ecartMoyenne: number | null;
};

const LIBELLES_NIVEAU_EXPORT: Record<string, string> = {
  unclassified: "Non classifié",
  basic: "Niveau de base",
  aspiring: "Niveau en développement",
  good: "Bon niveau",
  high: "Niveau élevé",
  outstanding: "Niveau exceptionnel"
};

/** Export Excel des résultats d'une classe : une ligne par élève. */
export function exporterClasseExcel(params: {
  classe: string;
  session: string | null;
  moyenneClasse: number | null;
  eleves: EleveResultat[];
}) {
  const { classe, session, moyenneClasse, eleves } = params;

  const lignes = eleves.map((e) => ({
    Élève: e.nom,
    "Score global": e.scoreGlobal ?? "",
    Niveau: e.niveau ? LIBELLES_NIVEAU_EXPORT[e.niveau] ?? e.niveau : "",
    "Écart vs moyenne classe": e.ecartMoyenne ?? ""
  }));

  const feuille = XLSX.utils.json_to_sheet(lignes);
  feuille["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 20 }];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Résultats");

  // Ligne de synthèse ajoutée sous le tableau
  if (moyenneClasse !== null) {
    XLSX.utils.sheet_add_aoa(feuille, [[], ["Moyenne de la classe", moyenneClasse]], {
      origin: -1
    });
  }

  const nomFichier = `resultats-${classe.replace(/\s+/g, "-").toLowerCase()}${session ? `-${session}` : ""}.xlsx`;
  XLSX.writeFile(classeur, nomFichier);
}

/** Export Excel de la vue d'ensemble établissement : synthèse + domaines forts/faibles + évolution. */
export function exporterEtablissementExcel(params: {
  session: string | null;
  studentCount: number;
  moyenne: number | null;
  distribution: Record<string, number> | null;
  domainesForts: { nom: string; pourcentage: number }[];
  domainesFaibles: { nom: string; pourcentage: number }[];
  evolution: { session: string; moyenne: number }[];
}) {
  const { session, studentCount, moyenne, distribution, domainesForts, domainesFaibles, evolution } = params;

  const classeur = XLSX.utils.book_new();

  // Feuille 1 : synthèse
  const syntheseLignes: (string | number)[][] = [
    ["Session", session ?? ""],
    ["Élèves évalués", studentCount],
    ["Moyenne établissement", moyenne ?? ""],
    []
  ];
  if (distribution) {
    syntheseLignes.push(["Répartition des niveaux"]);
    for (const [niveau, valeur] of Object.entries(distribution)) {
      if (valeur > 0) syntheseLignes.push([LIBELLES_NIVEAU_EXPORT[niveau] ?? niveau, `${valeur}%`]);
    }
  }
  const feuilleSynthese = XLSX.utils.aoa_to_sheet(syntheseLignes);
  feuilleSynthese["!cols"] = [{ wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(classeur, feuilleSynthese, "Synthèse");

  // Feuille 2 : domaines forts/faibles
  const domainesLignes = [
    ...domainesForts.map((d) => ({ Domaine: d.nom, Pourcentage: d.pourcentage, Catégorie: "Fort" })),
    ...domainesFaibles.map((d) => ({ Domaine: d.nom, Pourcentage: d.pourcentage, Catégorie: "Faible" }))
  ];
  if (domainesLignes.length > 0) {
    const feuilleDomaines = XLSX.utils.json_to_sheet(domainesLignes);
    feuilleDomaines["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(classeur, feuilleDomaines, "Domaines forts-faibles");
  }

  // Feuille 3 : évolution
  if (evolution.length > 0) {
    const feuilleEvolution = XLSX.utils.json_to_sheet(
      evolution.map((p) => ({ Session: p.session, "Moyenne établissement": p.moyenne }))
    );
    feuilleEvolution["!cols"] = [{ wch: 18 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(classeur, feuilleEvolution, "Évolution");
  }

  const nomFichier = `etablissement${session ? `-${session}` : ""}.xlsx`;
  XLSX.writeFile(classeur, nomFichier);
}
