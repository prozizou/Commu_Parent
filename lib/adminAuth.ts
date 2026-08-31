/**
 * Vérification serveur des requêtes admin authentifiées par un vrai compte staff
 * (Firebase Auth + custom claims `{ staff: true, role: "admin" | "professeur" }`),
 * à la place du code secret partagé `ADMIN_API_SECRET`.
 *
 * Le client envoie son ID token Firebase dans l'en-tête `Authorization: Bearer <idToken>`
 * (voir `lib/useSuperAdmin.ts` côté client). Seul `/api/admin/create-staff` accepte encore
 * `ADMIN_API_SECRET` en repli, pour pouvoir créer le tout premier compte Super Admin avant
 * qu'aucun compte staff n'existe (bootstrap).
 */
import type { NextRequest } from "next/server";
import { getAdminAuth } from "./firebaseAdmin";
import { AUTH_DISABLED } from "./authConfig";
import type { StaffRole } from "@/types";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export type StaffContext = { uid: string; email: string; role: StaffRole; ecoleId?: string | null };

/**
 * Vérifie le token Firebase Auth du staff. `roleRequis: "admin"` (par défaut) exige le
 * rôle Super Admin ; `"any"` accepte n'importe quel membre du staff (admin ou professeur).
 */
export async function requireStaff(req: NextRequest, roleRequis: "admin" | "any" = "admin"): Promise<StaffContext> {
  // Voir lib/authConfig.ts : interrupteur temporaire, à retirer avec l'authentification réactivée.
  if (AUTH_DISABLED) {
    return { uid: "auth-disabled", email: "", role: "admin", ecoleId: null };
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) throw new AuthError("Connexion requise.");

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new AuthError("Session invalide, reconnecte-toi.");
  }

  if (!decoded.staff) throw new AuthError("Réservé au personnel de l'école.", 403);
  if (roleRequis === "admin" && decoded.role !== "admin") {
    throw new AuthError("Réservé au Super Admin.", 403);
  }

  return { uid: decoded.uid, email: decoded.email ?? "", role: decoded.role, ecoleId: decoded.ecoleId ?? null };
}
