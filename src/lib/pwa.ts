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
