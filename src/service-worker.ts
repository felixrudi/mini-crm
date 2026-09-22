/// <reference lib="webworker" />

// SvelteKit's native service worker entry point (kit.files.serviceWorker,
// default src/service-worker.{js,ts}) — required so @vite-pwa/sveltekit's
// 'injectManifest' strategy has a real, SvelteKit-built file to post-process
// (see vite.config.ts for why 'generateSW' was replaced with this on
// 22.09.2026: modules/werkbank/crm/protokoll.md "Build-Blocker behoben").
//
// This file intentionally mirrors, by hand, exactly what workbox-build's
// generateSW would have produced for the previous vite.config.ts workbox
// block, given registerType: 'prompt' and injectRegister: false — verified
// against node_modules/workbox-build/build/templates/sw-template.js and
// node_modules/vite-plugin-pwa/dist/index.js (registerType !== 'autoUpdate'
// -> workbox.skipWaiting/clientsClaim stay unset -> the generated SW listens
// for a SKIP_WAITING postMessage instead of calling self.skipWaiting()
// unconditionally). No self.skipWaiting()/clientsClaim() call at the top
// level here either, on purpose: src/lib/pwa.ts's updateServiceWorker() is
// what's allowed to activate a new version, never the SW on its own — a CRM
// has unsaved form state, so no silent mid-session reload (Task 4, Runde 1).

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// self.__WB_MANIFEST is replaced at build time by injectManifest() with the
// precache list built from vite.config.ts's injectManifest.globPatterns.
// Same precache scope as before: no HTML (adapter-node renders every route
// server-side per request), only immutable JS/CSS/icons/manifest.
precacheAndRoute(self.__WB_MANIFEST);

// No navigateFallback is registered here — equivalent to the previous
// `navigateFallback: null`: every navigation must hit the Node server so
// hooks.server.ts's crm_session cookie check runs (moved there from
// +layout.server.ts).

// Explicit belt-and-suspenders: every /api/* route (src/routes/api/**)
// returns per-request, cookie/Bearer-token-gated JSON — never cache it, even
// though Workbox's default behavior already leaves unmatched requests
// untouched (this rule documents the intent explicitly so a future broader
// route can't accidentally shadow it). Kept FIRST so it always gets first
// refusal on /api/* requests, regardless of what's registered after it —
// earlier-registered routes win in Workbox.
registerRoute(/\/api\//, new NetworkOnly());

// Google Fonts stylesheet (src/app.html <link> to fonts.googleapis.com) —
// this is the "gecachter App-Shell" fix: without this, every page re-fetches
// the @font-face CSS from Google on every load.
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

// The actual .woff2 font files, served from fonts.gstatic.com — safe to
// cache aggressively, they're content-hashed and immutable.
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);
