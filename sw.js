/* ModeLab service worker. Pages, version.json, pwa.js and the manifest are network first (no-store),
   so a new build shows on the next open; the cache is only an offline fallback.
   It never touches localStorage, so progress and settings survive every update. */
const VERSION = "1.90";
const CACHE = "modelab-" + VERSION + ".2";
const LABS = ["Study","Mode","Fret","Jam","Chord","Tab","Songwriter"].map(n => n + "-Lab-v" + VERSION + ".html");
const PRECACHE = ["index.html", "manifest.webmanifest", "pwa.js", "motion.js", "icon-192.png", "icon-512.png", "apple-touch-icon.png", ...LABS];
/* a followed redirect (modelab.app answers /X.html with a 307 to /X) cannot answer a navigation as-is */
function clean(r){ return r.redirected ? new Response(r.body, {status: r.status, statusText: r.statusText, headers: r.headers}) : r; }
function key(url){ const u = new URL(url); u.search = ""; u.hash = ""; let p = u.pathname;
  if (p.endsWith("/")) p += "index.html"; else if (!/\.[a-z0-9]+$/i.test(p)) p += ".html";
  u.pathname = p; return u.href; }
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u =>
    fetch(new Request(u, {cache: "no-store", redirect: "follow"})).then(r => r.ok ? c.put(key(new URL(u, self.registration.scope).href), clean(r)) : null).catch(() => null)
  ))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("modelab-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* CDNs (notation, sounds, fonts) go straight to the network */
  if (url.pathname.endsWith("/sw.js")) return;
  const p = url.pathname;
  const fresh = req.mode === "navigate" || /\.html$/.test(p) || !/\.[a-z0-9]+$/i.test(p) || /(version\.json|pwa\.js|motion\.js|\.webmanifest)$/.test(p);
  if (fresh) {
    e.respondWith((async () => {
      try {
        const r = await fetch(new Request(req.url, {cache: "no-store", redirect: "follow", credentials: "same-origin"}));
        const out = clean(r);
        if (r.ok && !/version\.json$/.test(p)) { const c = await caches.open(CACHE); c.put(key(req.url), out.clone()); }
        return out;
      } catch (err) {
        const c = await caches.open(CACHE);
        return (await c.match(key(req.url))) || (await caches.match(key(req.url))) ||
          (req.mode === "navigate" ? await c.match(new URL("index.html", self.registration.scope).href) : undefined) ||
          new Response("Offline", {status: 503, headers: {"content-type": "text/plain"}});
      }
    })());
    return;
  }
  /* pictures, audio and files: from the cache when we have them, refreshed in the background */
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok && r.type === "basic" && !r.redirected) c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
    return hit || net;
  })());
});
