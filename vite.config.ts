import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    ...SvelteKitPWA({
      // 'injectManifest' instead of 'generateSW' (changed 22.09.2026, see
      // modules/werkbank/crm/protokoll.md "Build-Blocker behoben"): with
      // generateSW, @vite-pwa/sveltekit's SvelteKitPlugin.closeBundle calls
      // vite-plugin-pwa's generateSW() from *inside* the SSR/server Rollup
      // build's closeBundle hook (gated on viteConfig.build.ssr — see
      // node_modules/@vite-pwa/sveltekit/dist/index.mjs). On @sveltejs/kit
      // 2.63.1 that reliably (5/5 clean `npm ci` builds) made SvelteKit's own
      // vite-plugin-sveltekit-guard throw "An impossible situation occurred"
      // while loading src/hooks.server.ts — confirmed via clean-room repro
      // that the failure is independent of hooks.server.ts's *content* (a
      // trivial one-line handle still failed identically) and disappears when
      // the PWA plugin's generateSW closeBundle work is removed from that
      // build pass. With injectManifest, SvelteKit compiles our own
      // src/service-worker.ts as its native service worker (same mechanism as
      // any SvelteKit app's src/service-worker.js), and @vite-pwa/sveltekit's
      // closeBundle step only runs workbox-build's injectManifest() — a plain
      // Node.js text substitution on the already-built file, no further
      // Rollup/Vite build pass, so it can't re-enter SvelteKit's plugin guard.
      strategies: 'injectManifest',
      registerType: 'prompt', // never silently reload mid-session — a CRM has unsaved form state
      injectRegister: false, // we register manually in src/lib/pwa.ts (Task 4) so we control timing/UI
      devOptions: {
        enabled: true, // lets ./dev.sh exercise the service worker, not just npm run build && preview
        type: 'module'
      },
      manifest: {
        name: 'Hirschfeld CRM', // decided 19.07.2026, see plan "Open Questions"
        short_name: 'CRM', // decided 19.07.2026, see plan "Open Questions"
        description: 'Persönliches CRM für Kontakte und Firmen.',
        lang: 'de',
        // Direkt in die Kontaktliste — seit 28.08.2026 gibt es kein Dashboard
        // mehr, '/' würde beim App-Start nur einen Redirect kosten.
        start_url: '/contacts',
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
      // With injectManifest, the actual caching behaviour (NetworkOnly for
      // /api/*, Google Fonts caching, no navigateFallback) is hand-written in
      // src/service-worker.ts — this block now only controls what goes into
      // self.__WB_MANIFEST (the precache list) that injectManifest() injects.
      injectManifest: {
        // Same intent as before: exclude HTML — adapter-node renders every
        // route server-side per request (see plan Global Constraints), so
        // there is no static page HTML in the build output to accidentally
        // precache — only immutable JS/CSS bundles, icons, and the manifest
        // itself match.
        globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest,woff,woff2}']
      }
    })
  ]
});
