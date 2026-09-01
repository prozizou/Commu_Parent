export type ParentNotifPrefs = {
  email: boolean;
  push: boolean;
  absence: boolean;
  notes: boolean;
  devoirs: boolean;
};

export type Parent = {
  idUnique: string; // ex: PAR-2026-0042, sert d'identifiant de connexion
  nom: string;
  telephone: string;
  emailPro: string; // alias d'envoi, ex: prenom.nom.042@commu-parent.app
  emailReel?: string; // email personnel réel du parent, pour les notifs sortantes
  enfants: Record<string, true>; // studentId -> true
  notifPrefs: ParentNotifPrefs;
  createdAt: number;
};

export type Student = {
  id: string;
  nom: string;
  classe: string;
  ecoleId: string;
  parentIds: Record<string, true>;
};

export type MessageType = "texte" | "absence" | "note" | "devoir" | "annonce";

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  senderType: "parent" | "staff";
  senderNom: string;
  texte: string;
  pieceJointeUrl?: string;
  timestamp: number;
  lu: boolean;
};

export type NotificationType = "absence" | "note" | "devoir" | "message" | "annonce";

export type AppNotification = {
  id: string;
  type: NotificationType;
  contenu: string;
  lien?: string;
  timestamp: number;
  lu: boolean;
};

export type StaffRole = "admin" | "professeur";

export type Staff = {
  uid: string;
  nom: string;
  email: string;
  role: StaffRole;
  ecoleId: string;
  // Classes encadrées par ce professeur (ex: ["CM1", "CM2-A"]) — détermine quels élèves
  // il peut noter. Non pertinent pour un rôle "admin" (accès à tout l'établissement).
  classes?: string[];
};

/**
 * Une matière enseignée, rattachée à UN professeur (voir demande : "les matières seront
 * ajoutées selon le professeur"). Distincte de MatiereResult (le résultat chiffré d'une
 * matière dans une évaluation) : ceci est le catalogue "qui enseigne quoi", MatiereResult
 * est la note elle-même.
 */
export type MatiereEnseignee = {
  id: string;
  nom: string;
  professeurId: string; // Staff.uid
  ecoleId: string | null;
};

/* ------------------------------------------------------------------ */
/* Analyse des performances scolaires                                  */
/* Modèle inspiré de la méthodologie Cambridge Primary Checkpoint :    */
/* Élève > Matière > Domaine > Sous-compétence > points obtenus/possibles */
/* ------------------------------------------------------------------ */

/** Une sous-compétence est toujours exprimée en points obtenus / points possibles. */
export type SousCompetenceResult = {
  id: string;
  nom: string;
  pointsObtenus: number;
  pointsPossibles: number;
};

/**
 * Un domaine peut porter un score déjà agrégé par l'école (ex: barème Cambridge 0-50,
 * fourni tel quel dans le rapport) et/ou le détail des sous-compétences qui permet
 * le diagnostic fin ("il réussit la compréhension globale mais pas le détail").
 * Les deux ne sont pas nécessairement recalculables l'un depuis l'autre.
 */
export type DomaineResult = {
  id: string;
  nom: string;
  score?: number; // score agrégé du domaine, sur le même barème que la matière
  // Optionnel en pratique : RTDB ne stocke pas les tableaux vides, donc un domaine
  // sans sous-compétences saisies (juste un score agrégé) revient sans cette clé du
  // tout à la lecture, malgré un `[]` explicite à l'écriture. Voir totalDomaine,
  // itemsSousCompetences et synthetiserEvaluation dans lib/performance.ts pour le
  // repli défensif correspondant.
  sousCompetences?: SousCompetenceResult[];
};

export type MatiereResult = {
  id: string;
  nom: string; // ex: "Mathématiques", "English as a Second Language"
  scoreGlobal: number; // score de la matière, sur le barème de l'évaluation (ex: 0-50)
  domaines: DomaineResult[];
};

/** Comparaisons possibles pour un score donné (matière ou score global). */
export type ComparaisonScores = {
  eleve: number;
  groupe?: number;
  etablissement?: number;
  referenceExterne?: number; // ex: moyenne internationale
};

export type Bareme = { min: number; max: number };

export type Evaluation = {
  id: string;
  studentId: string;
  ecoleId: string;
  groupeId?: string;
  session: string; // ex: "2026-05" ou "Cambridge Primary Checkpoint - May 2026"
  bareme: Bareme; // ex: { min: 0, max: 50 }
  scoreGlobal: number; // score global toutes matières confondues, sur le barème ci-dessus
  matieres: MatiereResult[];
  comparaisons?: Record<string, ComparaisonScores>; // clé = matiere.id, ou "global"
  createdAt: number;
  createdBy?: string; // uid staff
};

/** Les six niveaux de performance du barème Cambridge Primary Checkpoint (0-50). */
export type NiveauPerformance =
  | "unclassified"
  | "basic"
  | "aspiring"
  | "good"
  | "high"
  | "outstanding";
