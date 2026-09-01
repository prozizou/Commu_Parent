"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import type { StaffRole } from "@/types";

export type EtatStaff =
  | { loading: true }
  | { loading: false; connecte: false }
  | { loading: false; connecte: true; autorise: false; user: User }
  | {
      loading: false;
      connecte: true;
      autorise: true;
      user: User;
      role: StaffRole;
      ecoleId: string | null;
      getToken: () => Promise<string>;
    };

/**
 * Session staff côté client (admin OU professeur) : vérifie les custom claims
 * `{ staff: true, role, ecoleId }`. `roleRequis` restreint à un rôle précis si fourni
 * (ex: "admin" pour la vue directeur), sinon accepte tout membre du staff.
 */
export function useStaff(roleRequis?: StaffRole): EtatStaff {
  const [state, setState] = useState<EtatStaff>({ loading: true });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, connecte: false });
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      const estStaff = tokenResult.claims.staff === true;
      const role = tokenResult.claims.role as StaffRole | undefined;
      const autorise = estStaff && (!roleRequis || role === roleRequis);

      if (autorise && role) {
        setState({
          loading: false,
          connecte: true,
          autorise: true,
          user,
          role,
          ecoleId: (tokenResult.claims.ecoleId as string | undefined) ?? null,
          getToken: () => user.getIdToken()
        });
      } else {
        setState({ loading: false, connecte: true, autorise: false, user });
      }
    });
  }, [roleRequis]);

  return state;
}
