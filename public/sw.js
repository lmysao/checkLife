/* ============================================================
   RITUAL DIÁRIO — Service Worker
   ============================================================
   Estratégia:
   - Install: pré-cacheia o app shell (HTML, manifest, ícones,
     SDK do Supabase, fontes do Google).
   - Activate: limpa caches antigos.
   - Fetch:
     * Para assets do próprio app (HTML, JS, CSS, ícones, manifest):
       stale-while-revalidate (responde do cache instantaneamente,
       e atualiza em background).
     * Para a CDN do Supabase e fontes do Google: cache-first com
       fallback de rede (esses recursos mudam raramente).
     * Para chamadas à API do Supabase (rest.supabase.co): network
       (não cachear dados — o app já tem seu próprio cache localStorage).
   ============================================================ */

const CACHE_VERSION = "ritual-v3";
const APP_SHELL = [
  "/ritual.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/supabase_schema.sql",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Karla:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap",
];

// ----- INSTALL: pré-cacheia o app shell -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // addAll falha se UM recurso não puder ser cacheado; usamos add individual
      // para que falhas parciais (ex: offline no primeiro install) não quebrem tudo.
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res && res.ok) {
              await cache.put(url, res.clone());
            }
          } catch (e) {
            // ignora — será tentado novamente em runtime
          }
        })
      );
      // força o SW a assumir imediatamente
      await self.skipWaiting();
    })()
  );
});

// ----- ACTIVATE: limpa caches antigos -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ----- FETCH: estratégia por tipo de recurso -----
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // só intercepta GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1) Chamadas à API REST do Supabase → sempre rede (não cachear dados)
  //    O app já tem fallback localStorage offline.
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/")) {
    event.respondWith(
      fetch(req).catch(() => new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } }))
    );
    return;
  }

  // 2) Navegação (HTML) → network-first com fallback para cache (app shell)
  //    Assim, quando online, pega a versão mais recente; offline, usa cache.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, net.clone());
          return net;
        } catch (e) {
          const cache = await caches.open(CACHE_VERSION);
          const cached = await cache.match(req) || await cache.match("/ritual.html");
          return cached || new Response("Offline e sem cache.", { status: 503 });
        }
      })()
    );
    return;
  }

  // 3) CDN do Supabase + Google Fonts → cache-first (mudam raramente)
  if (
    url.hostname === "cdn.jsdelivr.net" ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(req);
        if (cached) {
          // revalida em background
          fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
          }).catch(() => {});
          return cached;
        }
        try {
          const net = await fetch(req);
          if (net && net.ok) cache.put(req, net.clone());
          return net;
        } catch (e) {
          return cached || new Response("", { status: 503 });
        }
      })()
    );
    return;
  }

  // 4) Assets do próprio app (ícones, manifest, etc.) → stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((net) => {
          if (net && net.ok && (net.type === "basic" || net.type === "cors")) {
            cache.put(req, net.clone());
          }
          return net;
        })
        .catch(() => null);
      return cached || fetchPromise || new Response("", { status: 503 });
    })()
  );
});

// ----- MESSAGE: permite forçar update do cache a partir do app -----
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
