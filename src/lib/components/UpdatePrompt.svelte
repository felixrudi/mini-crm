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
