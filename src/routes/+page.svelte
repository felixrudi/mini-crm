<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { formatDate, isOverdue } from '$lib/utils';
  import type { Contact } from '$lib/types';
  import Users from '@lucide/svelte/icons/users';
  import Building2 from '@lucide/svelte/icons/building-2';
  import CheckSquare from '@lucide/svelte/icons/check-square';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import User from '@lucide/svelte/icons/user';
  import Plus from '@lucide/svelte/icons/plus';
  import Camera from '@lucide/svelte/icons/camera';
  import { goto } from '$app/navigation';
  import Loader from '@lucide/svelte/icons/loader';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MessagesSquare from '@lucide/svelte/icons/messages-square';
  import Filter from '@lucide/svelte/icons/filter';
  import X from '@lucide/svelte/icons/x';
  import Mail from '@lucide/svelte/icons/mail';
  import Phone from '@lucide/svelte/icons/phone';

  let { data }: { data: PageData } = $props();

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
      // Zusatzinfos in Notizen
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

  // --- Filter ---
  const TAG_COLORS = [
    'bg-terracotta/10 text-terracotta border-terracotta/20',
    'bg-sage/10 text-sage border-sage/20',
    'bg-blue-50 text-blue-600 border-blue-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-pink-50 text-pink-700 border-pink-200',
  ];
  function tagColor(tag: string) {
    const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
  }

  let activeTag = $state('');
  let activeKanal = $state('');
  let filterResults = $state<Contact[]>([]);
  let filterLoading = $state(false);

  async function applyFilter(tag: string, kanal: string) {
    activeTag = tag;
    activeKanal = kanal;
    if (!tag && !kanal) { filterResults = []; return; }
    filterLoading = true;
    const params = new URLSearchParams();
    if (tag) params.set('tag', tag);
    if (kanal) params.set('kanal', kanal);
    const res = await fetch(`/api/contacts/search?${params}`);
    if (res.ok) { const d = await res.json(); filterResults = d.contacts ?? []; }
    filterLoading = false;
  }

  function toggleTag(tag: string) {
    applyFilter(activeTag === tag ? '' : tag, '');
  }
  function toggleKanal(kanal: string) {
    applyFilter('', activeKanal === kanal ? '' : kanal);
  }
  function clearFilter() { applyFilter('', ''); }

  let hasFilter = $derived(!!activeTag || !!activeKanal);
</script>

<div class="p-6 max-w-5xl mx-auto space-y-6">

  <!-- Header -->
  <div>
    <h1 class="font-display font-bold text-2xl text-ink">Dashboard</h1>
    <p class="text-sm text-ink/50 mt-1">Übersicht</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4">
    <a href="/contacts" class="bg-surface rounded-xl border border-line p-5 hover:border-terracotta/30 transition-colors group">
      <div class="flex items-center justify-between mb-2">
        <Users class="w-5 h-5 text-terracotta" />
        <ArrowRight class="w-4 h-4 text-ink/20 group-hover:text-terracotta transition-colors" />
      </div>
      <p class="text-3xl font-display font-bold text-ink">{data.stats?.contacts ?? 0}</p>
      <p class="text-xs text-ink/50 mt-1">Kontakte</p>
    </a>
    <a href="/companies" class="bg-surface rounded-xl border border-line p-5 hover:border-terracotta/30 transition-colors group">
      <div class="flex items-center justify-between mb-2">
        <Building2 class="w-5 h-5 text-sage" />
        <ArrowRight class="w-4 h-4 text-ink/20 group-hover:text-sage transition-colors" />
      </div>
      <p class="text-3xl font-display font-bold text-ink">{data.stats?.companies ?? 0}</p>
      <p class="text-xs text-ink/50 mt-1">Firmen</p>
    </a>
    <a href="/actions" class="bg-surface rounded-xl border border-line p-5 hover:border-terracotta/30 transition-colors group">
      <div class="flex items-center justify-between mb-2">
        <CheckSquare class="w-5 h-5 text-amber-600" />
        <ArrowRight class="w-4 h-4 text-ink/20 group-hover:text-amber-600 transition-colors" />
      </div>
      <p class="text-3xl font-display font-bold text-ink">{data.stats?.open_actions ?? 0}</p>
      <p class="text-xs text-ink/50 mt-1">Offene Aufgaben</p>
    </a>
  </div>

  <!-- Schnellkontakt + Scankontakt -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- Schnellkontakt -->
    <div class="bg-surface rounded-xl border border-line p-5">
      <h2 class="font-display font-semibold text-base text-ink mb-4 flex items-center gap-2">
        <Plus class="w-4 h-4 text-terracotta" /> Schnellkontakt
      </h2>
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
        <div class="space-y-2.5">
          <input type="text" bind:value={quickName} placeholder="Name *" required
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <input type="tel" name="telefon" bind:value={quickTelefon} placeholder="Telefon"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <input type="text" name="notizen" bind:value={quickNotizen} placeholder="Notiz (optional)"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <button type="submit"
            class="w-full px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
            Kontakt anlegen
          </button>
        </div>
      </form>
    </div>

    <!-- Scankontakt -->
    <div id="scan" class="bg-surface rounded-xl border border-line p-5">
      <h2 class="font-display font-semibold text-base text-ink mb-4 flex items-center gap-2">
        <Camera class="w-4 h-4 text-terracotta" /> Scan &amp; Import
      </h2>
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
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <div class="grid grid-cols-2 gap-2">
            <input type="text" name="vorname" bind:value={scanVorname} placeholder="Vorname"
              class="px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
            <input type="text" name="nachname" bind:value={scanNachname} placeholder="Nachname"
              class="px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
          <input type="text" name="firma_name" bind:value={scanFirma} placeholder="Firma"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          <div class="grid grid-cols-2 gap-2">
            <input type="email" name="email" bind:value={scanEmail} placeholder="E-Mail"
              class="px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
            <input type="tel" name="telefon" bind:value={scanTelefon} placeholder="Telefon"
              class="px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" name="whatsapp" bind:value={scanWhatsapp} placeholder="WhatsApp"
              class="px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
            <input type="text" name="wechat_id" bind:value={scanWechatId} placeholder="WeChat ID"
              class="px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
          <textarea name="notizen" bind:value={scanNotizen} placeholder="Notizen (CN-Name, Region, …)" rows="2"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"></textarea>
          <button type="submit"
            class="w-full px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
            Kontakt anlegen
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Filter -->
  <div class="bg-surface rounded-xl border border-line p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display font-semibold text-base text-ink flex items-center gap-2">
          <Filter class="w-4 h-4 text-sage" /> Kontakte filtern
        </h2>
        {#if hasFilter}
          <button onclick={clearFilter} class="text-xs text-ink/40 hover:text-terracotta transition-colors flex items-center gap-1">
            <X class="w-3 h-3" /> Filter löschen
          </button>
        {/if}
      </div>

      {#if data.allTags.length > 0}
        <div class="mb-4">
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Tags</p>
          <div class="flex flex-wrap gap-1.5">
            {#each data.allTags as tag}
              <button
                type="button"
                onclick={() => toggleTag(tag)}
                class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all {activeTag === tag
                  ? tagColor(tag) + ' ring-2 ring-offset-1 ring-terracotta/40'
                  : 'bg-cream text-ink/50 border-line hover:border-ink/30'}"
              >
                {tag}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div>
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Kanal</p>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => toggleKanal('whatsapp')}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all {activeKanal === 'whatsapp'
              ? 'bg-green-50 text-green-700 border-green-200 ring-2 ring-offset-1 ring-green-300'
              : 'bg-cream text-ink/50 border-line hover:border-ink/30'}"
          >
            <MessageCircle class="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button
            type="button"
            onclick={() => toggleKanal('wechat')}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all {activeKanal === 'wechat'
              ? 'bg-green-50 text-green-700 border-green-200 ring-2 ring-offset-1 ring-green-300'
              : 'bg-cream text-ink/50 border-line hover:border-ink/30'}"
          >
            <MessagesSquare class="w-3.5 h-3.5" /> WeChat
          </button>
        </div>
      </div>
    </div>

  <!-- Filter-Ergebnis-Tabelle -->
  {#if hasFilter}
    <div class="bg-surface rounded-xl border border-line">
      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="font-display font-semibold text-base text-ink">
          {#if activeTag}Tag: <span class="text-terracotta">{activeTag}</span>{/if}
          {#if activeKanal}Kanal: <span class="text-green-700">{activeKanal === 'whatsapp' ? 'WhatsApp' : 'WeChat'}</span>{/if}
        </h2>
        <span class="text-sm text-ink/40">{filterLoading ? '…' : `${filterResults.length} Kontakte`}</span>
      </div>
      {#if filterLoading}
        <div class="py-10 text-center">
          <div class="w-5 h-5 border-2 border-terracotta border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      {:else if filterResults.length === 0}
        <div class="py-10 text-center">
          <p class="text-sm text-ink/40">Keine Kontakte gefunden</p>
        </div>
      {:else}
        <div class="divide-y divide-line">
          {#each filterResults as contact}
            <a href="/contacts/{contact.id}" class="flex items-center gap-3 px-5 py-3 hover:bg-cream transition-colors">
              <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                {#if contact.photo}
                  <img src={contact.photo} alt="" class="w-full h-full object-cover" />
                {:else}
                  <div class="w-full h-full bg-terracotta/10 flex items-center justify-center">
                    <span class="text-sm font-semibold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-ink truncate">{contact.name}</p>
                <p class="text-xs text-ink/40 truncate">{contact.company_name ?? contact.rolle ?? '—'}</p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0 text-ink/30">
                {#if contact.email}<Mail class="w-3.5 h-3.5" title={contact.email} />{/if}
                {#if contact.telefon}<Phone class="w-3.5 h-3.5" title={contact.telefon} />{/if}
                {#if contact.whatsapp}<MessageCircle class="w-3.5 h-3.5 text-green-500" title={contact.whatsapp} />{/if}
                {#if contact.wechat_id}<MessagesSquare class="w-3.5 h-3.5 text-green-600" title={contact.wechat_id} />{/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Aufgaben + Zuletzt aktiv -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- Offene Aufgaben -->
    <div class="bg-surface rounded-xl border border-line">
      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="font-display font-semibold text-base text-ink">Offene Aufgaben</h2>
        <a href="/actions" class="text-xs text-terracotta hover:underline">Alle →</a>
      </div>
      <div class="divide-y divide-line">
        {#if data.open_actions.length === 0}
          <div class="px-5 py-8 text-center">
            <CheckSquare class="w-8 h-8 text-ink/20 mx-auto mb-2" />
            <p class="text-sm text-ink/40">Keine offenen Aufgaben</p>
          </div>
        {:else}
          {#each data.open_actions as action}
            <div class="flex items-start gap-3 px-5 py-3">
              <form method="POST" action="/actions?/toggle"
                use:enhance={() => async ({ result, update }) => {
                  if (result.type === 'success') toast.success('Erledigt!');
                  await update();
                }}
                class="mt-0.5"
              >
                <input type="hidden" name="id" value={action.id} />
                <button type="submit" class="w-4 h-4 rounded border-2 border-ink/20 hover:border-terracotta transition-colors flex-shrink-0"></button>
              </form>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-ink font-medium">{action.titel}</p>
                <div class="flex items-center gap-3 mt-0.5">
                  {#if action.faellig_am}
                    <span class="flex items-center gap-1 text-xs {isOverdue(action.faellig_am) ? 'text-red-500 font-medium' : 'text-ink/40'}">
                      <CalendarClock class="w-3 h-3" />
                      {formatDate(action.faellig_am)}
                    </span>
                  {/if}
                  {#if action.contact_name}
                    <a href="/contacts/{action.contact_id}" class="text-xs text-terracotta hover:underline flex items-center gap-1">
                      <User class="w-3 h-3" />
                      {action.contact_name}
                    </a>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Zuletzt aktive Kontakte -->
    <div class="bg-surface rounded-xl border border-line">
      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="font-display font-semibold text-base text-ink">Zuletzt aktiv</h2>
        <a href="/contacts" class="text-xs text-terracotta hover:underline">Alle →</a>
      </div>
      <div class="divide-y divide-line">
        {#if data.recent_contacts.length === 0}
          <div class="px-5 py-8 text-center">
            <Users class="w-8 h-8 text-ink/20 mx-auto mb-2" />
            <p class="text-sm text-ink/40">Noch keine Kontakte</p>
          </div>
        {:else}
          {#each data.recent_contacts as contact}
            <a href="/contacts/{contact.id}" class="flex items-center gap-3 px-5 py-3 hover:bg-cream transition-colors">
              <div class="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                <span class="text-sm font-semibold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-ink truncate">{contact.name}</p>
                <p class="text-xs text-ink/40 truncate">{contact.company_name ?? contact.rolle ?? '—'}</p>
              </div>
              {#if contact.last_activity}
                <span class="text-xs text-ink/30 flex-shrink-0">{formatDate(contact.last_activity)}</span>
              {/if}
            </a>
          {/each}
        {/if}
      </div>
    </div>
  </div>

</div>
