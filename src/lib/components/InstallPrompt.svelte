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
