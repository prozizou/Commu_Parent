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
};
