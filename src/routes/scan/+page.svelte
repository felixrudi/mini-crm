<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { goto } from '$app/navigation';
  import Plus from '@lucide/svelte/icons/plus';
  import Camera from '@lucide/svelte/icons/camera';
  import Loader from '@lucide/svelte/icons/loader';

  // --- Schnellkontakt ---
  let quickName = $state('');
  let quickTelefon = $state('');
  let quickNotizen = $state('');

  // --- Scankontakt ---
  let scanDisplayName = $state('');
  let scanVorname = $state('');
  let scanNachname = $state('');
  let scanFirma = $state('');
  let scanRolle = $state('');
  let scanEmail = $state('');
  let scanTelefon = $state('');
  let scanWhatsapp = $state('');
  let scanWechatId = $state('');
  let scanNotizen = $state('');
  let scanScanning = $state(false);
  let scanFileInput: HTMLInputElement;
  let scanDirty = $state(false);

  let scanName = $derived(
    [scanVorname, scanNachname].filter(Boolean).join(' ') || scanDisplayName || scanFirma || 'Unbekannt'
  );

  async function handleScan(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    scanScanning = true;
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/extract-card', { method: 'POST', body: fd });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      const d = await res.json();
      scanDisplayName = d.name ?? '';
      scanVorname = d.vorname ?? '';
      scanNachname = d.nachname ?? '';
      scanFirma = d.firma ?? '';
      scanRolle = d.rolle ?? '';
      scanEmail = d.email ?? '';
      scanTelefon = d.telefon ?? '';
      scanWhatsapp = d.whatsapp ?? '';
      scanWechatId = d.wechat_id ?? '';
      const extra = [
        d.chinesischer_name ? `CN: ${d.chinesischer_name}` : '',
        d.region ? `Region: ${d.region}` : '',
      ].filter(Boolean).join('\n');
      scanNotizen = extra;
      scanDirty = true;
      toast.success('Erkannt');
    } catch (err: any) {
      toast.error(err?.message?.slice(0, 120) || 'Erkennung fehlgeschlagen');
    } finally {
      scanScanning = false;
      (e.target as HTMLInputElement).value = '';
    }
  }

  function resetScan() {
    scanDisplayName = scanVorname = scanNachname = scanFirma = scanRolle = '';
    scanEmail = scanTelefon = scanWhatsapp = scanWechatId = scanNotizen = '';
    scanDirty = false;
  }
</script>

<div class="p-6 max-w-[1000px] mx-auto space-y-6">

  <!-- Header -->
  <div>
    <h1 class="font-display font-bold text-2xl text-ink">Scan &amp; Import</h1>
    <p class="text-sm text-ink/50 mt-1">Kontakterfassung in Sekunden: per Visitenkarten-Scan oder Kompakt-Eingabe</p>
  </div>

  <!-- Scankontakt -->
  <div id="scan" class="bg-surface rounded-xl border border-line p-5">
    <h2 class="font-display font-semibold text-base text-ink mb-4 flex items-center gap-2">
      <Camera class="w-4 h-4 text-terracotta" /> Smarter Visitenkarten-Upload
    </h2>
    <p class="text-sm text-ink/50 mb-4">Foto einer Visitenkarte oder Screenshot (WeChat/WhatsApp) hochladen — die KI liest die Daten aus.</p>
    <form
      method="POST"
      action="/contacts?/create"
      use:enhance={() => async ({ result, update }) => {
        if (result.type === 'success' && result.data?.id) {
          toast.success('Kontakt erstellt');
          resetScan();
          goto(`/contacts/${result.data.id}`);
        } else if (result.type === 'success') {
          toast.success('Kontakt erstellt');
          resetScan();
          goto('/contacts');
        } else { toast.error('Fehler'); }
        await update({ reset: false });
      }}
    >
      <input type="hidden" name="name" value={scanName} />
      <input bind:this={scanFileInput} type="file" accept="image/*" class="hidden" onchange={handleScan} />
      <div class="space-y-2.5">
        <!-- Scan-Button -->
        <button
          type="button"
          onclick={() => scanFileInput.click()}
          disabled={scanScanning}
          class="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-line rounded-lg text-sm text-ink/50 hover:border-terracotta/40 hover:text-terracotta transition-colors disabled:opacity-50 {scanDirty ? 'border-green-300 text-green-700 hover:border-green-400' : ''}"
        >
          {#if scanScanning}
            <Loader class="w-4 h-4 animate-spin" /> Erkenne…
          {:else if scanDirty}
            <Camera class="w-4 h-4" /> Nochmal scannen
          {:else}
            <Camera class="w-4 h-4" /> Visitenkarte / WeChat / WhatsApp scannen
          {/if}
        </button>

        <!-- Felder (immer sichtbar, nach Scan befüllt) -->
        <input type="text" bind:value={scanDisplayName} placeholder="Anzeigename (z.B. Elon CQ Tinder)"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        <div class="grid grid-cols-2 gap-2">
          <input type="text" name="vorname" bind:value={scanVorname} placeholder="Vorname"
            class="px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <input type="text" name="nachname" bind:value={scanNachname} placeholder="Nachname"
            class="px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <input type="text" name="firma_name" bind:value={scanFirma} placeholder="Firma"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        <div class="grid grid-cols-2 gap-2">
          <input type="email" name="email" bind:value={scanEmail} placeholder="E-Mail"
            class="px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <input type="tel" name="telefon" bind:value={scanTelefon} placeholder="Telefon"
            class="px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <input type="text" name="whatsapp" bind:value={scanWhatsapp} placeholder="WhatsApp"
            class="px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <input type="text" name="wechat_id" bind:value={scanWechatId} placeholder="WeChat ID"
            class="px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <textarea name="notizen" bind:value={scanNotizen} placeholder="Notizen (CN-Name, Region, …)" rows="2"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"></textarea>
        <button type="submit"
          class="w-full px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
          Kontakt anlegen
        </button>
      </div>
    </form>
  </div>

  <!-- Schnellkontakt -->
  <div class="bg-surface rounded-xl border border-line p-5">
    <h2 class="font-display font-semibold text-base text-ink mb-4 flex items-center gap-2">
      <Plus class="w-4 h-4 text-terracotta" /> Kompakter Schnellkontakt
    </h2>
    <p class="text-sm text-ink/50 mb-4">Auf zwei Felder reduziert — ein Klick auf "Anlegen" speichert sofort.</p>
    <form
      method="POST"
      action="/contacts?/create"
      use:enhance={() => async ({ result, update }) => {
        if (result.type === 'success') {
          toast.success('Kontakt erstellt');
          quickName = ''; quickTelefon = ''; quickNotizen = '';
        } else { toast.error('Fehler'); }
        await update();
      }}
    >
      <input type="hidden" name="name" value={quickName || 'Unbekannt'} />
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5">
        <input type="text" bind:value={quickName} placeholder="Name *" required
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        <input type="tel" name="telefon" bind:value={quickTelefon} placeholder="Telefon oder E-Mail"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        <button type="submit"
          class="px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors whitespace-nowrap">
          Anlegen
        </button>
      </div>
      <input type="hidden" name="notizen" bind:value={quickNotizen} />
    </form>
  </div>

</div>
