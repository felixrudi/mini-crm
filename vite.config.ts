import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    ...SvelteKitPWA({
      strategies: 'generateSW',
      registerType: 'prompt', // never silently reload mid-session — a CRM has unsaved form state
      injectRegister: false, // we register manually in src/lib/pwa.ts (Task 4) so we control timing/UI
      devOptions: {
        enabled: true, // lets ./dev.sh exercise the service worker, not just npm run build && preview
        type: 'module'
      },
      manifest: {
        name: 'Hirschfeld CRM', // decided 19.07.2026, see plan "Open Questions"
        short_name: 'CRM', // decided 19.07.2026, see plan "Open Questions"
        description: 'Persönliches CRM für Kontakte, Firmen und Outreach.',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f9f6f2', // light-hybrid theme background, src/app.css — Felix's decision 19.07.2026
        theme_color: '#904446', // light-hybrid theme primary accent, src/app.css
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Precache glob intentionally excludes HTML: adapter-node renders every
        // route server-side per request (see plan Global Constraints), so there
        // is no static page HTML in the build output to accidentally precache —
        // only immutable JS/CSS bundles, icons, and the manifest itself match.
        globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest,woff,woff2}'],
        // Never serve a cached document for a navigation — every route must hit
        // the Node server so +layout.server.ts's crm_session cookie check runs.
        navigateFallback: null,
        runtimeCaching: [
          {
            // Explicit belt-and-suspenders: every /api/* route (src/routes/api/**)
            // returns per-request, cookie/Bearer-token-gated JSON — never cache it,
            // even though Workbox's default behavior already leaves unmatched
            // requests untouched (this rule documents the intent explicitly so a
            // future broader runtimeCaching rule can't accidentally shadow it).
            // Workbox matches urlPattern against the full url.href (e.g.
            // "https://crm.hirschfeld.at/api/contacts"), not just the pathname,
            // so the pattern is intentionally unanchored — it matches "/api/"
            // as a substring anywhere in the href. Kept FIRST in this array (ahead
            // of the Google Fonts rules) so it always gets first refusal on
            // /api/* requests, regardless of what broader same-origin rules are
            // ever added below it — earlier rules win in Workbox.
            urlPattern: /\/api\//,
            handler: 'NetworkOnly'
          },
          {
            // Google Fonts stylesheet (src/app.html <link> to fonts.googleapis.com) —
            // this is the "gecachter App-Shell" fix: without this, every page
            // re-fetches the @font-face CSS from Google on every load.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            // The actual .woff2 font files, served from fonts.gstatic.com —
            // safe to cache aggressively, they're content-hashed and immutable.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
