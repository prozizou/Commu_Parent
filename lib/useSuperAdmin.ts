"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";

export type EtatSuperAdmin =
  | { loading: true }
  | { loading: false; connecte: false }
  | { loading: false; connecte: true; autorise: false; user: User }
  | { loading: false; connecte: true; autorise: true; user: User; getToken: () => Promise<string> };

/**
 * Session Super Admin côté client : vérifie que l'utilisateur Firebase Auth connecté
 * porte bien les custom claims `{ staff: true, role: "admin" }`, et expose `getToken()`
 * pour authentifier les appels aux routes /api/admin/* (en-tête Authorization: Bearer).
 */
export function useSuperAdmin(): EtatSuperAdmin {
  const [state, setState] = useState<EtatSuperAdmin>({ loading: true });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, connecte: false });
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      const autorise = tokenResult.claims.staff === true && tokenResult.claims.role === "admin";
      if (autorise) {
        setState({ loading: false, connecte: true, autorise: true, user, getToken: () => user.getIdToken() });
      } else {
        setState({ loading: false, connecte: true, autorise: false, user });
      }
    });
  }, []);

  return state;
}
