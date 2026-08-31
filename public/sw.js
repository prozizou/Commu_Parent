/**
 * Service worker Commu_Parent.
 *
 * Volontairement minimal et prudent : l'app est très dynamique (Firebase Auth +
 * Realtime Database en temps réel), donc on NE met jamais en cache les pages HTML
 * ni les appels réseau vers Firebase/Cloudinary — seulement les fichiers vraiment
 * statiques (icônes, manifest, assets `_next/static` content-hashés). En cas de
 * perte de connexion, une page hors-ligne s'affiche à la place d'une erreur brute.
 *
 * Pour invalider les caches d'une version précédente après un déploiement, incrémente
 * CACHE_VERSION ci-dessous (ex: "v1" -> "v2") : `activate` supprime alors tous les
 * caches dont le nom ne correspond plus à CACHE_NAME.
 */
const CACHE_VERSION = "v1";
const CACHE_NAME = `commu-parent-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/offline.html", "/manifest.json", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE_NAME).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim())
  );
});

function estAssetStatiqueImmuable(url) {
  // Fichiers content-hashés par Next.js : sûrs à mettre en cache indéfiniment.
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // jamais de cache sur les écritures

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // laisse passer Firebase/Cloudinary/etc.

  // Navigation (chargement de page) : réseau d'abord, page hors-ligne en secours.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // Assets statiques immuables : cache d'abord, réseau en repli (et mise à jour du cache).
  if (estAssetStatiqueImmuable(url)) {
    event.respondWith(
      caches.match(request).then(
        (reponseEnCache) =>
          reponseEnCache ||
          fetch(request).then((reponseReseau) => {
            const copie = reponseReseau.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
            return reponseReseau;
          })
      )
    );
  }
  // Tout le reste (API routes, données Firebase via SDK REST éventuel, etc.) : réseau direct.
});
