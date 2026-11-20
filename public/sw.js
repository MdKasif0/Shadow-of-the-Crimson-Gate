/*
 * Service worker: lets the installed game start and play offline.
 *
 * The app itself (page, scripts, styles, icons) is cached on install from the
 * list the build writes to /precache.json. Everything else the game loads,
 * such as sounds, textures and fonts, is cached the first time it's fetched,
 * so after one session online the whole game works without a connection.
 */
const VERSION = 'v2';
// Some servers mark responses "Vary: Origin", which would stop a script fetched
// for a module tag from matching the copy cached on install
const MATCH = { ignoreVary: true };
const SHELL = `crimson-shell-${VERSION}`;
const RUNTIME = `crimson-runtime-${VERSION}`;
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/hero-gate.webp'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    let built = [];
    try {
      const response = await fetch('/precache.json', { cache: 'no-store' });
      if (response.ok) built = await response.json();
    } catch {
      // Without the list, the shell still caches as it's used
    }
    // One at a time, so a single missing file can't stop the rest from caching
    await Promise.all([...new Set([...CORE, ...built])].map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, RUNTIME]);
    for (const key of await caches.keys()) {
      if (key.startsWith('crimson-') && !keep.has(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

/**
 * The page sends the files it loaded before this worker was in control, on the
 * very first visit, so those are kept for offline play too.
 */
self.addEventListener('message', event => {
  if (event.data?.type !== 'cache-urls' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(RUNTIME);
    for (const url of event.data.urls) {
      try {
        const parsed = new URL(url, self.location.origin);
        const isFont = parsed.hostname === 'fonts.googleapis.com' || parsed.hostname === 'fonts.gstatic.com';
        if (parsed.origin !== self.location.origin && !isFont) continue;
        if (await caches.match(parsed.href, MATCH)) continue;
        const response = await fetch(parsed.href, isFont ? { mode: 'no-cors' } : undefined);
        if (response.ok || response.type === 'opaque') await cache.put(parsed.href, response);
      } catch {
        // Skipped; it will be cached the next time the game asks for it
      }
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Pages: the network first, so updates arrive; the cached copy when offline
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(SHELL);
        cache.put('/index.html', response.clone());
        return response;
      } catch {
        return (await caches.match('/index.html', MATCH)) || (await caches.match('/', MATCH)) || Response.error();
      }
    })());
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isSameOrigin && !isFont) return;
  if (isSameOrigin && (url.pathname === '/precache.json' || url.pathname === '/sw.js')) return;

  // Everything else: the cache first, then the network, keeping what arrives
  event.respondWith((async () => {
    const cached = await caches.match(request, MATCH);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') {
        const cache = await caches.open(RUNTIME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
