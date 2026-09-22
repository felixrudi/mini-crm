import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    serviceWorker: {
      // SvelteKit's own auto-registration must stay off: src/service-worker.ts
      // now exists (needed for @vite-pwa/sveltekit's injectManifest strategy,
      // see vite.config.ts), and by default SvelteKit would inject its own
      // navigator.serviceWorker.register('/service-worker.js') call — a second,
      // competing registration next to the controlled one in src/lib/pwa.ts
      // (Task 4, registerType 'prompt': never silently reload mid-session).
      register: false
    }
  }
};
