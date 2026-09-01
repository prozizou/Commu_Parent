import { jsPDF } from "jspdf";
import { LIBELLES_NIVEAU } from "./performance";
import type { BilanEvolution, SyntheseEvaluation } from "./performance";

/**
 * Génère et déclenche le téléchargement d'un bulletin PDF pour une synthèse d'évaluation
 * déjà calculée (voir synthetiserEvaluation). Volontairement simple (une page, texte +
 * lignes), pas de mise en page complexe — l'objectif est un document lisible et imprimable,
 * pas un rendu graphique riche.
 */
export function genererBulletinPdf(params: {
  nomEleve: string;
  session: string;
  synthese: SyntheseEvaluation;
  evolution?: BilanEvolution | null;
  prioritePedagogique?: { nom: string; matiere: string; pourcentage: number; recommandation: string } | null;
}) {
  const { nomEleve, session, synthese, evolution, prioritePedagogique } = params;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margeGauche = 20;
  const largeurUtile = 170;
  let y = 22;

  function ligneSection(y: number) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margeGauche, y, margeGauche + largeurUtile, y);
  }

  // En-tête
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(nomEleve, margeGauche, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`Bulletin de performance — Session ${session}`, margeGauche, y);
  doc.setTextColor(20, 20, 20);
  y += 10;
  ligneSection(y);
  y += 10;

  // Score global
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(`${synthese.scoreGlobal}`, margeGauche, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(LIBELLES_NIVEAU[synthese.niveau], margeGauche + 30, y - 3);
  y += 12;

  // Progression
  if (evolution) {
    const signe = evolution.delta > 0 ? "+" : "";
    const texteEvolution =
      evolution.tendance === "progression"
        ? `${signe}${evolution.delta} point(s) depuis la dernière évaluation — belle progression.`
        : evolution.tendance === "baisse"
        ? `${signe}${evolution.delta} point(s) depuis la dernière évaluation — en baisse, à surveiller.`
        : "Résultat stable depuis la dernière évaluation.";
    doc.setFontSize(10);
    doc.text(texteEvolution, margeGauche, y);
    y += 8;
  }

  ligneSection(y);
  y += 10;

  // Résultats par matière
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Résultats par matière", margeGauche, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const matiere of synthese.matieres) {
    doc.text(matiere.nom, margeGauche, y);
    doc.text(`${matiere.pourcentage}%`, margeGauche + largeurUtile - 15, y, { align: "right" });
    y += 6;
  }
  y += 4;

  ligneSection(y);
  y += 10;

  // Forces / difficultés (toutes matières confondues, au niveau des domaines)
  const domainesTousConfondus = synthese.matieres.flatMap((m) =>
    m.domaines.length > 0 ? m.domaines : [{ id: m.id, nom: m.nom, pourcentage: m.pourcentage, sousCompetences: [] }]
  );
  const forces = domainesTousConfondus.filter((d) => d.pourcentage >= 80).slice(0, 4);
  const difficultes = domainesTousConfondus.filter((d) => d.pourcentage < 70).slice(0, 4);

  if (forces.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Points forts", margeGauche, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const f of forces) {
      doc.text(`• ${f.nom}`, margeGauche, y);
      y += 5.5;
    }
    y += 4;
  }

  if (difficultes.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("À travailler", margeGauche, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const d of difficultes) {
      doc.text(`• ${d.nom}`, margeGauche, y);
      y += 5.5;
    }
    y += 4;
  }

  // Priorité pédagogique (sous-compétence la plus faible, toutes matières confondues)
  if (prioritePedagogique) {
    ligneSection(y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Priorité pédagogique", margeGauche, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${prioritePedagogique.nom} (${prioritePedagogique.matiere} · ${prioritePedagogique.pourcentage}%)`, margeGauche, y);
    y += 6;
    const recommandationLignes = doc.splitTextToSize(prioritePedagogique.recommandation, largeurUtile);
    doc.text(recommandationLignes, margeGauche, y);
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Généré via Commu_Parent", margeGauche, 285);

  const nomFichier = `bulletin-${nomEleve.replace(/\s+/g, "-").toLowerCase()}-${session}.pdf`;
  doc.save(nomFichier);
}
