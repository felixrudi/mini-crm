# PWA Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mini-crm installable as a Progressive Web App (homescreen icon, standalone window without an address bar, cached app-shell so `_app/immutable/*` bundles and Google Fonts don't re-download on every page) — without ever letting the service worker cache anything that depends on the `crm_session` login cookie.

**Architecture:** Add `@vite-pwa/sveltekit` (a thin SvelteKit-aware wrapper around Workbox/`vite-plugin-pwa`) to `vite.config.ts`, configured with `generateSW` + a Workbox precache that only ever includes static build output (`_app/immutable/*` JS/CSS, icons, the manifest itself) — never page HTML, since adapter-node renders every route on the server per request and there is no static HTML in the build output to accidentally precache. `navigateFallback` is explicitly disabled so every navigation always hits the Node server and re-runs the `crm_session` cookie check in `src/routes/+layout.server.ts`. Icons are generated once from the deer-head mark inside the existing `static/logo.png` wordmark, composited onto a `light-hybrid`-colored (`#f9f6f2`) square canvas, via a committed shell script (no new npm runtime dependency).

**Why `@vite-pwa/sveltekit` over a hand-rolled manifest + service worker:** a manual approach means writing and maintaining the cache-invalidation logic (Workbox's precache manifest is content-hashed and auto-updates on every build; a hand-written SW would need its own versioning scheme to avoid ever serving a stale JS bundle after a deploy — a real risk for a single-user CRM Felix might otherwise get stuck on a broken cached version of). `@vite-pwa/sveltekit` specifically (over plain `vite-plugin-pwa`) is needed because this is a SvelteKit project — it understands SvelteKit's build output layout (`_app/immutable/*`, `.svelte-kit/output`) and ships the `virtual:pwa-info`/`virtual:pwa-register/svelte` integration points Task 4 uses, which plain `vite-plugin-pwa` doesn't provide out of the box for adapter-node's non-static output. The cost is one more devDependency and the API-surface uncertainty Task 0 spikes before anything depends on it.

**Tech Stack:** SvelteKit 2 + Svelte 5, `@sveltejs/adapter-node`, Vite 6, Tailwind 4. New devDependencies: `vite-plugin-pwa` + `@vite-pwa/sveltekit`. Icon generation uses ImageMagick (`magick`) as a one-time local CLI tool, not an npm dependency. No test runner exists in this repo (verified: `package.json` has no `test` script and no `vitest`; the four files under `tests/*.test.ts` run ad hoc via Node's built-in `node:test`, not via any configured runner) — verification in this plan is the local dev server (`./dev.sh`), `npm run build && npm run preview`, and a manual Chrome DevTools Lighthouse PWA audit. Do not introduce vitest/Playwright as a side effect of this plan (YAGNI, matches the project's existing testing culture per `docs/superpowers/plans/2026-07-14-teable-migration.md`).

## Global Constraints

- **SPA + per-request auth, verified:** `src/routes/+layout.ts` sets `export const ssr = false;` and `src/routes/+layout.server.ts` checks `cookies.get('crm_session') === 'authenticated'` on every navigation, redirecting to `/login` otherwise. Because adapter-node still renders each route server-side per request (ssr:false only disables SvelteKit's own HTML rendering step, it does not make this a fully static SPA), **no static page HTML exists anywhere in the `build/` output** — only `_app/immutable/*.js`/`.css` chunks, `static/*` assets, and `manifest.webmanifest`. This is what makes the caching strategy below safe: there is nothing dynamic in the precache glob for Workbox to even find.
- **`navigateFallback: null` is mandatory** (Task 3) — do not add an offline SPA-shell fallback. If a fallback document were ever cached and served offline, it would never re-run the cookie check that lives in `+layout.server.ts`'s `load` function, which only exists on the server. Simpler and safer to let navigations fail with the browser's native offline error than to fake an authenticated-looking shell.
- **Cookie name to never cache:** `crm_session` (httpOnly, set in `src/routes/login/+page.server.ts`). No runtime-caching rule may match `/login`, `/api/*`, or any SvelteKit data/action request.
- **`CRM_API_KEY`/`CRM_PASSWORD`/`TEABLE_API_KEY` env vars are unrelated to this plan** — nothing here touches auth logic, only what the browser is allowed to cache in front of it.
- **Existing 4-theme system, decided (19.07.2026):** Felix confirmed `light-hybrid` as the theme he wants active — which also matches `src/app.css`'s actual `:root`/default state (`:root, [data-theme='light-hybrid']`), not `dark-hirschfeld`. This plan therefore uses `light-hybrid`'s exact hex values for `theme_color`/`background_color` and icon canvas: `--background: #f9f6f2`, `--primary: #904446`, `--accent-sand: #e6c5a8`, `--border-bright: #d9686a` (all confirmed in `src/app.css`). The runtime theme switcher (`src/routes/+layout.svelte`, persisted per-device in `localStorage`) is unaffected by this — a web app manifest can only declare **one** static `theme_color`/`background_color`, chosen independently of whichever theme the user has picked at runtime; `light-hybrid` is simply the one chosen here since it's Felix's actual preferred default.
- **`static/logo.png` is 2000×1000px, not square** — verified via `sips` + Pillow. It is a horizontal wordmark ("HIRSCH_FELD — AI Builder · Educator") on a transparent background, with a dark-red deer-head/antler mark on the left. The mark's exact bounding box, measured programmatically (Pillow bbox scan of the alpha channel): **x:[64, 392], y:[277, 597]** — a 328×320px near-square region. This is the source crop for all app icons (Task 1/2), not the full wordmark.
- **No ImageMagick installed on this machine yet** (verified: `which magick convert` → not found; only Apple's built-in `sips` is present, which cannot add colored padding/canvas-extension — needed to turn the non-square mark crop into square icons). Task 1 installs it via `brew install imagemagick` as a **local one-time tool**, not a project/npm dependency — it is not added to `package.json` and is not required at build or deploy time, only when regenerating icons.
- **iOS needs its own icon tag:** Safari on iOS ignores the manifest's `icons` array for the homescreen and requires a dedicated `<link rel="apple-touch-icon">` (Task 4). Felix has flagged iPhone behavior before (see the `afterNavigate` bugfix comment already in `src/routes/+layout.svelte`), so this is treated as a first-class requirement, not an afterthought.
- **Package manager: npm** (`package-lock.json` present, `Dockerfile` runs `npm install` / `npm run build`). Use `npm install -D <pkg>`, never `pnpm`/`yarn`.
- **Deploy discipline (Felix's standing rule, unchanged by this plan):** `./deploy.sh` builds a Docker image on `root@204.168.144.189` (Coolify app `ld4mpvsus77cn8gs7ocdxjtm`) and health-checks `https://crm.hirschfeld.at/`. **Nothing in this plan is deployed.** Every task is verified against `./dev.sh` (`localhost:5173`) and `npm run build && npm run preview` (`localhost:4173`) only. `./deploy.sh` itself is not modified by this plan and is only ever run on Felix's explicit "deploy".
- **`@vite-pwa/sveltekit`'s exact virtual-module API (manifest-link injection, SW registration hook) is NOT independently verified in this repo** — Task 0 is a mandatory spike (read the installed package's own README/type defs) to confirm the exact import paths/property names before Task 3/4 depend on them, mirroring how `docs/superpowers/plans/2026-07-14-teable-migration.md` Task 0 handled unverified Teable API shapes.

---

## Open Questions for Felix

These are used as concrete defaults below (per the "no placeholders" plan-writing rule this isn't left blank), but every one is a real decision — confirm or override before Task 3 Step 2 is executed:

1. **App name / short name — decided (19.07.2026):** Felix confirmed `short_name: "CRM"` is enough; `name: "Hirschfeld CRM"` kept as the fuller label (matches existing sidebar branding text "Hirschfeld" / "CRM" in `src/routes/+layout.svelte`), used wherever the OS shows the full name instead of the short one.
2. **Icon theme — decided (19.07.2026):** Felix wants `light-hybrid` active, not `dark-hirschfeld` — manifest/icons below use `light-hybrid`'s colors (`#f9f6f2` background, `#904446` primary) accordingly. No lighter/darker variant needed beyond this.
3. **Push notifications.** Out of scope for this plan entirely — no code, no permission prompts, nothing wired. Flag here only so it's an explicit "not now" rather than silently dropped. If wanted later, it's a separate plan (needs a push server + `Notification`/`PushManager` permission UX, non-trivial).
4. **Install-hint banner (Task 5).** Marked optional/skippable in this plan. Confirm whether you want it at all, since Chrome/Edge/Android already show their own native "Install app" affordance in the address bar without any code from us — the banner in Task 5 mainly helps iOS Safari users, who get no native prompt at all and must be told to use Share → "Zum Home-Bildschirm".

---

## File Structure

New files:
- `scripts/generate-pwa-icons.sh` — repeatable icon-generation script (ImageMagick), not a throwaway — kept for whenever `logo.png` changes.
- `static/icons/icon-192.png`, `static/icons/icon-512.png` — `purpose: "any"` manifest icons.
- `static/icons/icon-maskable-512.png` — `purpose: "maskable"` manifest icon (larger safe-zone padding).
- `static/icons/apple-touch-icon.png` (180×180) — iOS homescreen icon, referenced via `<link rel="apple-touch-icon">`, not the manifest.
- `static/favicon.png` (48×48) — **bonus, not required for PWA**: `src/app.html` already references `%sveltekit.assets%/favicon.png` but the file has never existed (verified: `ls static/favicon.png` → not found), so every browser tab has been silently 404'ing on the favicon since before this plan. Fixed for free in Task 2 since the icon pipeline is being built anyway.
- `src/lib/pwa.ts` — thin wrapper around the SW-registration virtual module, exposing `needRefresh`/`updateServiceWorker` to Svelte.
- `src/lib/components/UpdatePrompt.svelte` — small "Neue Version verfügbar" banner, shown only when a new service worker is waiting (Task 4).
- `src/lib/components/InstallPrompt.svelte` — optional "Zum Home-Bildschirm hinzufügen" banner (Task 5, skippable).

Modified files:
- `vite.config.ts` — add `SvelteKitPWA` plugin with manifest + Workbox config (Task 3).
- `src/app.html` — inject the manifest `<link>`, `theme-color` meta, `apple-touch-icon` link, apple status-bar meta (Task 4).
- `src/routes/+layout.svelte` — register the service worker (browser-only, guarded), mount `UpdatePrompt` and (if kept) `InstallPrompt` (Task 4/5).
- `package.json` — add devDependencies `vite-plugin-pwa`, `@vite-pwa/sveltekit`.
- `.gitignore` — add `dev-dist/` (vite-plugin-pwa's dev-mode SW scratch directory, created when `devOptions.enabled: true`).

---

## Task 0: Install the PWA plugin and confirm its exact SvelteKit API surface

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)

**Interfaces:**
- Produces: confirmed exact import paths/export names for (a) the `vite.config.ts` plugin options object, (b) the manifest-`<link>`-injection virtual module used in Task 4's `app.html`/layout, (c) the service-worker-registration virtual module used in Task 4's `src/lib/pwa.ts`. Tasks 3 and 4 are written against the current documented pattern for this package family — this task corrects them before they're executed if the installed version differs.

- [ ] **Step 1: Install the packages**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && npm install -D vite-plugin-pwa @vite-pwa/sveltekit`

Expected: both added to `package.json` devDependencies and `package-lock.json` updated, no peer-dependency errors (this repo already has `legacy-peer-deps=true` in its Docker build `.npmrc`; if `npm install` warns about peer deps locally, rerun with `--legacy-peer-deps` to match).

- [ ] **Step 2: Read the installed package's own docs for the three unverified surfaces**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && cat node_modules/@vite-pwa/sveltekit/README.md | less` (or open in an editor).

Look specifically for:
1. The exact shape of the plugin options passed to `SvelteKitPWA({...})` in `vite.config.ts` — confirm `manifest`, `workbox`, `devOptions`, `registerType`, `injectRegister` are accepted as top-level keys the same way `vite-plugin-pwa` documents them (this package is a wrapper, so it should pass most options through unchanged — confirm there's no SvelteKit-specific renaming).
2. The virtual module + property path used to inject the manifest `<link rel="manifest">` tag into `app.html`/the root layout for **`adapter-node`** specifically (not `adapter-static`) — as of this plan's writing, the documented pattern is `import { pwaInfo } from 'virtual:pwa-info'` then `{@html pwaInfo?.webManifest?.linkTag}` inside `<svelte:head>`. Confirm the exact property name (`webManifest.linkTag` vs. an older `webManifestLink` string) against the installed version's type definitions: `cat node_modules/@vite-pwa/sveltekit/dist/*.d.ts | grep -i -A3 "webManifest\|pwaInfo"`.
3. The virtual module used for registering/updating the service worker from Svelte — as of this plan's writing, the documented pattern is `import { useRegisterSW } from 'virtual:pwa-register/svelte'`, returning reactive `needRefresh`/`offlineReady` stores and an `updateServiceWorker(reloadPage?: boolean)` function. Confirm via `cat node_modules/vite-plugin-pwa/dist/types.d.ts | grep -i -A5 "useRegisterSW"`.

- [x] **Step 3: Record findings inline in this plan**

Add a one-line comment under this step recording whatever differs from the assumptions above, so Tasks 3/4 are corrected before being typed into real files rather than copy-pasted blind.

> **Observed (2026-07-19):** Installed `vite-plugin-pwa@1.3.0` + `@vite-pwa/sveltekit@1.1.0`. All three assumptions in this plan were correct as written — nothing to correct for Tasks 3/4. (1) `node_modules/@vite-pwa/sveltekit/dist/index.d.ts`: `SvelteKitPWAOptions extends Partial<VitePWAOptions>` plus one extra top-level `kit?: KitOptions` key — every `vite-plugin-pwa` option (`manifest`, `workbox`, `injectManifest`, `devOptions`, `registerType`, `injectRegister`, `strategies`, `filename`, `includeAssets`, etc., see `node_modules/vite-plugin-pwa/dist/index.d.ts` lines ~270-437) passes through unchanged, no SvelteKit-specific renaming. (2) `node_modules/vite-plugin-pwa/info.d.ts`: `virtual:pwa-info` exports `pwaInfo: PwaInfo | undefined` where `PwaInfo.webManifest = { href, useCredentials, linkTag }` — confirms `pwaInfo?.webManifest?.linkTag` exactly, no legacy `webManifestLink` string in this version. (3) `node_modules/vite-plugin-pwa/svelte.d.ts`: `virtual:pwa-register/svelte` exports `useRegisterSW(options?: RegisterSWOptions): { needRefresh: Writable<boolean>, offlineReady: Writable<boolean>, updateServiceWorker: (reloadPage?: boolean) => Promise<void> }` (Svelte store `Writable` from `svelte/store`) — confirms the assumed shape verbatim; `RegisterSWOptions` (`node_modules/vite-plugin-pwa/types/index.d.ts`) additionally offers `onNeedRefresh`, `onOfflineReady`, `onRegisteredSW(swScriptUrl, registration)`, `onRegisterError(error)` callbacks Task 4 may want. Full detail: `.superpowers/sdd/task-0-report.md`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vite-plugin-pwa + @vite-pwa/sveltekit devDependencies"
```

---

## Task 1: Install ImageMagick and crop the deer-head mark out of the existing logo

**Files:**
- None yet (local tool install + a throwaway crop kept only as an intermediate for Task 2's script)

**Interfaces:**
- Produces: confirmation that the measured crop region (x:64–392, y:277–597 of `static/logo.png`) is visually correct before it's baked into the committed script in Task 2.

- [ ] **Step 1: Install ImageMagick locally (not a project dependency)**

Run: `brew install imagemagick`

Expected: `magick -version` prints a version string (e.g. `Version: ImageMagick 7...`). This is a one-time CLI tool for regenerating icons on this machine — it is not added to `package.json`, not required by `Dockerfile`/`deploy.sh`, and not needed at runtime.

- [ ] **Step 2: Crop the measured mark region and visually confirm it**

Run:
```bash
cd /Users/felix/Documents/Programmieren/mini-crm
magick static/logo.png -crop 328x320+64+277 +repage /tmp/mark-crop-check.png
open /tmp/mark-crop-check.png
```

Expected: opens showing just the dark-red deer-head/antler mark, cleanly cropped with no stray pixels of the "HIRSCH_FELD" text bleeding in from the right and no cropped-off antler tips at the top/left. If the crop looks off (e.g. antler tips clipped), re-measure with:
```bash
python3 -c "
from PIL import Image
import numpy as np
im = Image.open('static/logo.png').convert('RGBA')
arr = np.array(im)
mark = arr[:, 64:392, :]
alpha = mark[:,:,3]
rows = np.where(alpha.max(axis=1) > 10)[0]
print('y range:', rows.min(), rows.max())
"
```
and adjust the `-crop WxH+X+Y` geometry in Task 2's script accordingly before generating the real icon set.

- [ ] **Step 3: Clean up the throwaway check file**

Run: `rm /tmp/mark-crop-check.png`

(Nothing to commit — this task only validates the crop geometry used by Task 2's script.)

---

## Task 2: Generate the icon set with a committed, repeatable script

**Files:**
- Create: `scripts/generate-pwa-icons.sh`
- Create (via running the script): `static/icons/icon-192.png`, `static/icons/icon-512.png`, `static/icons/icon-maskable-512.png`, `static/icons/apple-touch-icon.png`, `static/favicon.png`

**Interfaces:**
- Consumes: `static/logo.png` (the crop geometry confirmed in Task 1)
- Produces: the exact icon file paths Task 3's manifest config and Task 4's `app.html` reference

- [ ] **Step 1: Write the script**

```bash
#!/bin/bash
# scripts/generate-pwa-icons.sh
# Regenerates every PWA/favicon icon from static/logo.png's deer-head mark.
# Re-run this whenever logo.png changes. Requires ImageMagick (`brew install
# imagemagick`) — a local tool, not a project dependency (see plan
# docs/superpowers/plans/2026-07-19-pwa-support.md, Global Constraints).
set -e

cd "$(dirname "$0")/.."

SRC="static/logo.png"
# Mark bounding box measured via Pillow alpha-channel scan (see Task 1):
# x:[64,392], y:[277,597] -> 328x320px. Re-measure if logo.png changes.
CROP="328x320+64+277"
BG="#f9f6f2"   # light-hybrid theme background (src/app.css :root, [data-theme='light-hybrid']) — Felix's decision 19.07.2026

mkdir -p static/icons
TMP=$(mktemp -t pwa-mark).png

echo "-> Cropping mark from $SRC ($CROP)..."
magick "$SRC" -crop "$CROP" +repage "$TMP"

echo "-> icon-192.png / icon-512.png (purpose: any, ~11% margin)..."
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 192x192 static/icons/icon-192.png
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 512x512 static/icons/icon-512.png

echo "-> icon-maskable-512.png (purpose: maskable, ~20% safe-zone margin)..."
magick "$TMP" -background "$BG" -gravity center -extent 560x560 -resize 512x512 static/icons/icon-maskable-512.png

echo "-> apple-touch-icon.png (180x180, opaque background required by iOS)..."
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 180x180 static/icons/apple-touch-icon.png

echo "-> favicon.png (48x48 — bonus fix, app.html has referenced a nonexistent favicon.png)..."
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 48x48 static/favicon.png

rm -f "$TMP"
echo "Done. Generated: $(ls static/icons/) + static/favicon.png"
```

- [ ] **Step 2: Make it executable and run it**

Run:
```bash
chmod +x scripts/generate-pwa-icons.sh
./scripts/generate-pwa-icons.sh
```

Expected: prints each step, ends with `Done. Generated: apple-touch-icon.png icon-192.png icon-512.png icon-maskable-512.png + static/favicon.png`.

- [ ] **Step 3: Visually spot-check the maskable icon's safe zone**

Run: `open static/icons/icon-maskable-512.png`

Expected: the deer mark sits comfortably inside the center ~60% of the canvas with solid `#f9f6f2` filling the rest — no antler tips near the edge (Android launchers crop maskable icons to a circle/squircle/rounded-square depending on the device, clipping anything outside the center safe zone). The dark-red mark against this light cream background should have strong contrast — spot-check it isn't washed out.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-pwa-icons.sh static/icons/ static/favicon.png
git commit -m "feat: add PWA icon set generated from the logo's deer mark"
```

---

## Task 3: Configure the PWA plugin — manifest + Workbox caching strategy

**Files:**
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: icon paths from Task 2, findings from Task 0 Step 3
- Produces: `manifest.webmanifest` in the build output, a generated service worker (`sw.js`) with the caching rules every later task's runtime behavior depends on

- [ ] **Step 1: Rewrite `vite.config.ts`**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
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
          },
          {
            // Explicit belt-and-suspenders: every /api/* route (src/routes/api/**)
            // returns per-request, cookie/Bearer-token-gated JSON — never cache it,
            // even though Workbox's default behavior already leaves unmatched
            // requests untouched (this rule documents the intent explicitly so a
            // future broader runtimeCaching rule can't accidentally shadow it).
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkOnly'
          }
        ]
      }
      // NOTE: if Task 0 found a different/renamed option (e.g. a nested `kit: {...}`
      // block specific to @vite-pwa/sveltekit for adapter-node output paths), add it
      // here per the installed version's README before running Step 2 below.
    })
  ]
});
```

- [ ] **Step 2: Add `dev-dist/` to `.gitignore`**

`devOptions.enabled: true` makes `vite-plugin-pwa` write a dev-mode service worker scratch build to `dev-dist/` at the repo root during `vite dev` — this must not be committed.

```
node_modules/
build/
.svelte-kit/
.env
.env.*
!.env.example
.worktrees/
dev-dist/
```

- [ ] **Step 3: Verify the build produces a manifest + service worker**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && npm run build`

Expected: build succeeds, and `ls build/client/` (or wherever adapter-node's client output lands — check the actual printed output path) shows `manifest.webmanifest` and `sw.js` alongside the existing `_app/` directory.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts .gitignore
git commit -m "feat: configure vite-plugin-pwa manifest + Workbox caching strategy"
```

---

## Task 4: Wire the manifest link, theme-color meta, apple-touch-icon, and SW registration into the app

**Files:**
- Modify: `src/app.html`
- Create: `src/lib/pwa.ts`
- Create: `src/lib/components/UpdatePrompt.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `pwaInfo` from `virtual:pwa-info` and `useRegisterSW` from `virtual:pwa-register/svelte` (exact shapes per Task 0 Step 3's findings)
- Produces: `initPwa()` returning `{ needRefresh, updateServiceWorker }`, consumed by `UpdatePrompt.svelte`

- [ ] **Step 1: Add static meta tags to `src/app.html`**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

    <!-- PWA: manifest link is injected via virtual:pwa-info in +layout.svelte's
         <svelte:head> (adapter-node has no static index.html for the plugin to
         auto-inject into) — see Task 0 Step 3 for the confirmed property path. -->
    <meta name="theme-color" content="#904446" />
    <link rel="apple-touch-icon" href="%sveltekit.assets%/icons/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="CRM" />

    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="bg-cream text-ink font-sans">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 2: Write `src/lib/pwa.ts`**

```ts
// src/lib/pwa.ts
// Thin wrapper around vite-plugin-pwa's Svelte registration hook so
// components don't import the virtual module directly (keeps it mockable
// and gives one place to fix the import if Task 0's findings differ).
//
// Top-level static import (not a dynamic import/require) is correct and safe
// here: Vite virtual modules must be resolvable at build time, and this repo's
// root layout sets `export const ssr = false` (src/routes/+layout.ts), so
// Svelte components — and anything they import, including this file — are
// never rendered on the server. There is no SSR code path where `navigator`/
// `window` (which the virtual module's generated code touches) would be undefined.
import { browser } from '$app/environment';
import { useRegisterSW } from 'virtual:pwa-register/svelte';

export function initPwa() {
  if (!browser) {
    return {
      needRefresh: { subscribe: () => () => {} },
      updateServiceWorker: async () => {}
    };
  }

  // Per Task 0 Step 3's confirmed findings. Documented pattern as of this
  // plan's writing: virtual:pwa-register/svelte exports useRegisterSW(),
  // returning Svelte-store-compatible `needRefresh`/`offlineReady` plus an
  // `updateServiceWorker(reloadPage?: boolean)` function.
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      console.log('SW registered:', swUrl, registration);
    },
    onRegisterError(error: unknown) {
      console.error('SW registration failed:', error);
    }
  });

  return { needRefresh, updateServiceWorker };
}
```

- [ ] **Step 2b: If Task 0 found the virtual module isn't safely statically importable**

If Task 0's spike reveals `virtual:pwa-register/svelte` does something at module-init time that breaks even with `ssr: false` (e.g. an unconditional `navigator.serviceWorker` access outside a function body), fall back to a dynamic `await import('virtual:pwa-register/svelte')` inside an async `initPwa()`, called from an `$effect` in `+layout.svelte` instead of at component-init time. Only do this if Step 1's static import actually fails in Task 4 Step 5's verification — don't pre-optimize for a problem that may not exist.

- [ ] **Step 3: Write `src/lib/components/UpdatePrompt.svelte`**

```svelte
<script lang="ts">
  import { initPwa } from '$lib/pwa';

  const { needRefresh, updateServiceWorker } = initPwa();
</script>

{#if $needRefresh}
  <div class="fixed bottom-4 right-4 z-50 bg-surface border border-line rounded-xl shadow-lg p-4 max-w-xs">
    <p class="text-sm text-ink mb-3">Neue Version verfügbar.</p>
    <button
      onclick={() => updateServiceWorker(true)}
      class="w-full py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
    >
      Aktualisieren
    </button>
  </div>
{/if}
```

- [ ] **Step 4: Wire manifest link + `UpdatePrompt` into `src/routes/+layout.svelte`**

Add near the top of the `<script>` block (alongside the existing imports):

```svelte
<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { afterNavigate } from '$app/navigation';
  import { pwaInfo } from 'virtual:pwa-info';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
  // ...existing lucide icon imports unchanged...
```

Add to the existing `<svelte:head>` (or create one if none exists yet — none was found in the current file, so this is a new top-level element alongside the existing markup):

```svelte
<svelte:head>
  {#if pwaInfo}
    {@html pwaInfo.webManifest.linkTag}
  {/if}
</svelte:head>

<ToastContainer />
<UpdatePrompt />
{#if browser}
  <CommandPalette bind:open={paletteOpen} />
{/if}
```

- [ ] **Step 5: Verify locally with `./dev.sh`**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && ./dev.sh`

Then in Chrome DevTools → Application → Manifest: confirm `Hirschfeld CRM` / `CRM` / `standalone` / `#f9f6f2` (background) / `#904446` (theme) all show up correctly, and the three icon sizes load without a broken-image icon. Application → Service Workers: confirm a worker registers with no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/app.html src/lib/pwa.ts src/lib/components/UpdatePrompt.svelte src/routes/+layout.svelte
git commit -m "feat: register service worker + wire PWA manifest into app shell"
```

---

## Task 5 (optional, skippable): "Add to homescreen" install hint

Chrome/Edge/Android already show their own native install affordance once the manifest above is valid (an icon in the address bar) — this task only adds value for **iOS Safari**, which never fires `beforeinstallprompt` and has no native prompt at all; the only way onto an iPhone homescreen is Share → "Zum Home-Bildschirm", which nothing can trigger programmatically. Skip this whole task if Felix doesn't want a banner (see Open Questions #4).

**Files:**
- Create: `src/lib/components/InstallPrompt.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Produces: a dismissible banner, self-contained, no exported interface consumed elsewhere

- [ ] **Step 1: Write `src/lib/components/InstallPrompt.svelte`**

```svelte
<script lang="ts">
  import { browser } from '$app/environment';

  let deferredPrompt = $state<Event | null>(null);
  let showAndroidBanner = $state(false);
  let showIosHint = $state(false);
  let dismissed = $state(false);

  $effect(() => {
    if (!browser || dismissed) return;

    // Chrome/Edge/Android: fires when the browser thinks the manifest+SW are
    // installable. We intercept it to show our own banner instead of relying
    // solely on the browser's native address-bar icon.
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      showAndroidBanner = true;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    // iOS Safari never fires beforeinstallprompt at all — detect it manually.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isIos && !isStandalone) {
      showIosHint = true;
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  });

  async function installAndroid() {
    if (!deferredPrompt) return;
    (deferredPrompt as unknown as { prompt: () => void }).prompt();
    deferredPrompt = null;
    showAndroidBanner = false;
  }

  function dismiss() {
    dismissed = true;
    showAndroidBanner = false;
    showIosHint = false;
  }
</script>

{#if showAndroidBanner}
  <div class="fixed bottom-4 left-4 z-50 bg-surface border border-line rounded-xl shadow-lg p-4 max-w-xs">
    <p class="text-sm text-ink mb-3">Als App installieren?</p>
    <div class="flex gap-2">
      <button onclick={installAndroid} class="flex-1 py-2 bg-terracotta text-white rounded-lg text-sm font-medium">
        Installieren
      </button>
      <button onclick={dismiss} class="px-3 py-2 text-sm text-ink/60">Später</button>
    </div>
  </div>
{:else if showIosHint}
  <div class="fixed bottom-4 left-4 z-50 bg-surface border border-line rounded-xl shadow-lg p-4 max-w-xs">
    <p class="text-sm text-ink mb-1">Zum Home-Bildschirm hinzufügen:</p>
    <p class="text-xs text-ink/60 mb-3">Teilen-Symbol → "Zum Home-Bildschirm"</p>
    <button onclick={dismiss} class="w-full py-2 text-sm text-ink/60">Verstanden</button>
  </div>
{/if}
```

- [ ] **Step 2: Mount it in `src/routes/+layout.svelte`**

```svelte
<UpdatePrompt />
<InstallPrompt />
```

(with the matching `import InstallPrompt from '$lib/components/InstallPrompt.svelte';` added alongside the other imports from Task 4 Step 4)

- [ ] **Step 3: Verify on a real iPhone and in Chrome (Android or desktop DevTools device emulation)**

On iPhone Safari: open `https://<local-tunnel-or-preview-url>`, confirm the "Teilen → Zum Home-Bildschirm" hint appears and is dismissible, and that after adding to homescreen the icon shown is the deer mark (not a screenshot thumbnail — confirms `apple-touch-icon` from Task 4 is being picked up).

In Chrome DevTools → More tools → Rendering, or an actual Android device: confirm the "Installieren" banner appears and the native install flow completes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/InstallPrompt.svelte src/routes/+layout.svelte
git commit -m "feat: add optional add-to-homescreen install hint (Android + iOS)"
```

---

## Task 6: Full local verification (nothing deployed)

**Files:** none — verification only.

- [ ] **Step 1: Dev-mode smoke test**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && ./dev.sh`

Check in Chrome DevTools:
- Application → Manifest: name/short_name/theme_color/icons all correct, no warnings.
- Application → Service Workers: one active worker, no errors in the Console.
- Network tab, reload twice: confirm `_app/immutable/*.js`/`.css` and the Google Fonts `.woff2` requests show `(ServiceWorker)` as the source on the second load (proves the CacheFirst/StaleWhileRevalidate rules from Task 3 are active).

- [ ] **Step 2: Production build + preview smoke test**

Run: `cd /Users/felix/Documents/Programmieren/mini-crm && npm run build && npm run preview`

Open `http://localhost:4173`, repeat the same DevTools checks as Step 1 (dev mode and build mode use different SW code paths in vite-plugin-pwa, both must be checked).

- [ ] **Step 3: Cookie-safety checklist (the one that actually matters)**

With the preview server running and logged in (`crm_session` cookie set):
1. In DevTools → Application → Service Workers, click "Offline".
2. Reload the page. Expected: the browser's native offline error (or, if `UpdatePrompt`/shell JS is still cached and briefly paints, an immediate failed data fetch) — **never** a page that looks logged-in with real contact/company data, since no API/data response is precached or runtime-cached.
3. Go back online, log out (clear `crm_session` — via the app's logout if one exists, or manually delete the cookie in DevTools → Application → Cookies), reload. Expected: redirected to `/login` exactly as before this plan — confirms the service worker did not shadow the auth redirect.
4. Confirm `Application → Cache Storage` shows only Workbox's precache (JS/CSS/icons/manifest) and the two Google Fonts runtime caches — no cache entry for `/api/*`, `/companies`, `/contacts`, or any `__data.json`-style request.

- [ ] **Step 4: Run a Lighthouse PWA audit**

In Chrome DevTools → Lighthouse → check "Progressive Web App" (or run `npx lighthouse http://localhost:4173 --view --only-categories=pwa` from the repo root) against the `npm run preview` server from Step 2.

Expected: installability checks pass (manifest valid, icons present, service worker controls the page, `theme_color` set). "Redirects HTTP to HTTPS" and similar will not apply to localhost — that's fine, `crm.hirschfeld.at` already serves HTTPS via Coolify/Traefik in production.

- [ ] **Step 5: Report back to Felix, do not deploy**

Summarize the Lighthouse PWA score and the cookie-safety checklist results. **Do not run `./deploy.sh`** — per the Global Constraints, deploy only happens on Felix's explicit "deploy", as a separate step outside this plan.
