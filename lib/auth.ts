import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, rtdb } from "./firebase";

// Domaine interne utilisé pour transformer l'ID unique parent en pseudo-email Firebase Auth.
// Le parent ne voit jamais ce domaine : il tape uniquement son ID (ex: PAR-2026-0042).
const INTERNAL_AUTH_DOMAIN = "commu-parent.internal";

export function idToInternalEmail(idUnique: string) {
  return `${idUnique.toLowerCase()}@${INTERNAL_AUTH_DOMAIN}`;
}

/**
 * Connexion parent avec son ID unique + mot de passe.
 * L'ID est d'abord vérifié dans /parents avant de tenter le login Firebase Auth,
 * pour renvoyer un message clair si l'ID n'existe pas.
 */
export async function loginParent(idUnique: string, password: string) {
  const snap = await get(ref(rtdb, `parents/${idUnique}`));
  if (!snap.exists()) {
    throw new Error("ID parent introuvable. Vérifiez le code fourni par l'école.");
  }
  const email = idToInternalEmail(idUnique);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { user: cred.user, parent: snap.val() };
}

/**
 * Création du compte Auth pour un parent, appelée côté admin/staff
 * au moment de l'inscription (le mot de passe provisoire est ensuite changé par le parent).
 */
export async function createParentAuthAccount(idUnique: string, tempPassword: string) {
  const email = idToInternalEmail(idUnique);
  return createUserWithEmailAndPassword(auth, email, tempPassword);
}

/** Connexion staff (admin / professeur) avec un vrai email + mot de passe. */
export async function loginStaff(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export function logout() {
  return firebaseSignOut(auth);
}
