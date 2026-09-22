// Node-Loader-Hook für "node --test": bildet SvelteKits Alias-Importe
// ("$app/environment", "$lib/...") auf echte Dateien ab, die es außerhalb
// von Vite/SvelteKit sonst nicht gibt. Nur so lässt sich hooks.server.ts
// direkt importieren, ohne die volle Vite/SvelteKit-Runtime zu starten.
const STUB_URL = new URL('./app-environment-stub.mjs', import.meta.url).href;
const LIB_BASE_URL = new URL('../../src/lib/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '$app/environment') {
    return { url: STUB_URL, shortCircuit: true };
  }
  if (specifier.startsWith('$lib/')) {
    const rest = specifier.slice('$lib/'.length);
    const withExt = /\.[a-z]+$/i.test(rest) ? rest : `${rest}.ts`;
    return { url: new URL(withExt, LIB_BASE_URL).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
