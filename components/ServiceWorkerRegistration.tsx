"use client";

import { useEffect } from "react";

/**
 * Enregistre public/sw.js. Uniquement en production : en dev, le service worker
 * interférerait avec le rechargement à chaud (HMR) et servirait des bundles obsolètes.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Échec de l'enregistrement du service worker :", err);
    });
  }, []);

  return null;
}
