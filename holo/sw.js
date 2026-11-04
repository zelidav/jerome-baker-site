/* JB Holo offline worker (scope /holo/). The page and its script go network-first so a deploy shows up on the
   next open; the holo bundle, stickers, icons and fonts go cache-first (they are big and rarely change). */
const V = 'jb-holo-v1';
const CORE = ['./', './app.js', './holo.webmanifest', '../js/holo/holo.js', '../assets/img/box.webp', '../assets/crew/lion.webp',
  '../assets/icons/holo-192.png', '../assets/icons/holo-512.png', '../assets/icons/holo-apple-180.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('jb-holo-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const own = u.origin === location.origin;
  const page = own && (r.mode === 'navigate' || /\/holo\/(app\.js|holo\.webmanifest)?$/.test(u.pathname));
  const heavy = (own && /\/(js\/holo\/|assets\/(crew|img|icons)\/)/.test(u.pathname)) || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (page) {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((k) => k.put(r, c)); return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('./'))));
  } else if (heavy) {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => {
      if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(V).then((k) => k.put(r, c)); }
      return res;
    })));
  }
});
