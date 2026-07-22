<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate } from '$lib/utils';
  import type { Contact } from '$lib/types';
  import { openContact, openCompany } from '$lib/detail-panel';
  import Users from '@lucide/svelte/icons/users';
  import Building2 from '@lucide/svelte/icons/building-2';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import UserPlus from '@lucide/svelte/icons/user-plus';
  import Camera from '@lucide/svelte/icons/camera';
  import Send from '@lucide/svelte/icons/send';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MessagesSquare from '@lucide/svelte/icons/messages-square';
  import Filter from '@lucide/svelte/icons/filter';
  import X from '@lucide/svelte/icons/x';
  import Mail from '@lucide/svelte/icons/mail';
  import Phone from '@lucide/svelte/icons/phone';
  import Megaphone from '@lucide/svelte/icons/megaphone';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import Search from '@lucide/svelte/icons/search';
  import User from '@lucide/svelte/icons/user';

  let { data }: { data: PageData } = $props();

  // --- Globale Suche (Kontakte + Firmen) ---
  type SearchCompany = {
    id: string;
    name: string;
    website: string | null;
    telefon: string | null;
    ort: string | null;
    notizen: string | null;
  };

  let globalQuery = $state('');
  let globalContacts = $state<Contact[]>([]);
  let globalCompanies = $state<SearchCompany[]>([]);
  let globalLoading = $state(false);
  let globalDebounce: ReturnType<typeof setTimeout>;
  let searchInputEl: HTMLInputElement;

  let hasGlobalResults = $derived(globalContacts.length > 0 || globalCompanies.length > 0);
  let showGlobalPanel = $derived(!!globalQuery.trim());

  function handleGlobalSearch() {
    clearTimeout(globalDebounce);
    const q = globalQuery.trim();
    if (!q) {
      globalContacts = [];
      globalCompanies = [];
      globalLoading = false;
      return;
    }
    globalLoading = true;
    globalDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const d = await res.json();
          globalContacts = d.contacts ?? [];
          globalCompanies = d.companies ?? [];
        }
      } catch {
        // ignore network blips
      } finally {
        globalLoading = false;
      }
    }, 250);
  }

  function clearGlobalSearch() {
    globalQuery = '';
    globalContacts = [];
    globalCompanies = [];
    globalLoading = false;
    searchInputEl?.focus();
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

<div class="p-6 max-w-[1400px] mx-auto space-y-6 overflow-x-hidden">

  <!-- Header -->
  <div>
    <h1 class="font-display font-bold text-2xl text-ink">Dashboard</h1>
    <p class="text-sm text-ink/50 mt-1">Operative Steuerungszentrale — Übersicht &amp; anstehende Aufgaben</p>
  </div>

  <!-- Globale Suche über alles -->
  <div class="bg-surface rounded-xl border border-line p-4 sm:p-5">
    <div class="relative">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/35" />
      <input
        bind:this={searchInputEl}
        bind:value={globalQuery}
        oninput={handleGlobalSearch}
        type="search"
        placeholder="Suche über alles — Kontakte, Firmen, Telefon, E-Mail, Notizen…"
        class="w-full pl-10 pr-10 py-3 bg-cream border border-line rounded-xl text-sm text-ink placeholder-ink/35 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        autocomplete="off"
      />
      {#if globalQuery}
        <button
          type="button"
          onclick={clearGlobalSearch}
          class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink/35 hover:text-ink transition-colors rounded"
          aria-label="Suche leeren"
        >
          <X class="w-4 h-4" />
        </button>
      {/if}
    </div>

    {#if showGlobalPanel}
      <div class="mt-4 border-t border-line pt-4">
        {#if globalLoading && !hasGlobalResults}
          <div class="py-6 text-center">
            <div class="w-5 h-5 border-2 border-terracotta border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        {:else if !hasGlobalResults}
          <p class="text-sm text-ink/40 text-center py-4">Keine Treffer für „{globalQuery.trim()}"</p>
        {:else}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Kontakte -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-[11px] font-bold text-ink/40 uppercase tracking-wide flex items-center gap-1.5">
                  <User class="w-3.5 h-3.5" /> Kontakte
                </p>
                <span class="text-xs text-ink/35">{globalContacts.length}</span>
              </div>
              {#if globalContacts.length === 0}
                <p class="text-xs text-ink/30 py-2">Keine Kontakte</p>
              {:else}
                <div class="divide-y divide-line rounded-lg border border-line overflow-hidden">
                  {#each globalContacts as contact}
                    <a href="/contacts/{contact.id}" onclick={(e) => { e.preventDefault(); openContact(contact.id); }} class="flex items-center gap-3 px-3 py-2.5 hover:bg-cream transition-colors">
                      <div class="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                        <span class="text-xs font-semibold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-ink truncate">{contact.name}</p>
                        <p class="text-xs text-ink/40 truncate">{contact.company_name ?? contact.rolle ?? contact.email ?? '—'}</p>
                      </div>
                      {#if contact.telefon}
                        <span class="text-[11px] font-mono text-ink/35 flex-shrink-0 hidden sm:inline">{contact.telefon}</span>
                      {/if}
                    </a>
                  {/each}
                </div>
                <a href="/contacts?q={encodeURIComponent(globalQuery.trim())}" class="inline-flex items-center gap-1 mt-2 text-xs text-terracotta hover:underline">
                  Alle Kontakte →
                </a>
              {/if}
            </div>

            <!-- Firmen -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-[11px] font-bold text-ink/40 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 class="w-3.5 h-3.5" /> Firmen
                </p>
                <span class="text-xs text-ink/35">{globalCompanies.length}</span>
              </div>
              {#if globalCompanies.length === 0}
                <p class="text-xs text-ink/30 py-2">Keine Firmen</p>
              {:else}
                <div class="divide-y divide-line rounded-lg border border-line overflow-hidden">
                  {#each globalCompanies as company}
                    <a href="/companies/{company.id}" onclick={(e) => { e.preventDefault(); openCompany(company.id); }} class="flex items-center gap-3 px-3 py-2.5 hover:bg-cream transition-colors">
                      <div class="w-8 h-8 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
                        <Building2 class="w-4 h-4 text-sage" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-ink truncate">{company.name}</p>
                        <p class="text-xs text-ink/40 truncate">{company.ort ?? company.website?.replace(/^https?:\/\//, '') ?? company.notizen ?? '—'}</p>
                      </div>
                      {#if company.telefon}
                        <span class="text-[11px] font-mono text-ink/35 flex-shrink-0 hidden sm:inline">{company.telefon}</span>
                      {/if}
                    </a>
                  {/each}
                </div>
                <a href="/companies?q={encodeURIComponent(globalQuery.trim())}" class="inline-flex items-center gap-1 mt-2 text-xs text-terracotta hover:underline">
                  Alle Firmen →
                </a>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Outreach-KPIs (Woche vs. Monat) -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="bg-surface rounded-xl border border-line p-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-semibold text-ink/40 uppercase tracking-wide">Outreach</p>
        <Send class="w-4 h-4 text-terracotta" />
      </div>
      <div class="flex items-end justify-between">
        <span class="text-xs text-ink/40">Woche</span>
        <span class="font-display font-bold text-2xl text-ink">{data.outreachStats.outreachWoche}</span>
      </div>
      <div class="flex items-end justify-between mt-1">
        <span class="text-xs text-ink/40">Monat</span>
        <span class="font-display font-semibold text-lg text-ink/70">{data.outreachStats.outreachMonat}</span>
      </div>
    </div>

    <div class="bg-surface rounded-xl border border-line p-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-semibold text-ink/40 uppercase tracking-wide">Antworten</p>
        <MessageCircle class="w-4 h-4 text-terracotta" />
      </div>
      <div class="flex items-end justify-between">
        <span class="text-xs text-ink/40">Woche</span>
        <span class="font-display font-bold text-2xl text-ink">{data.outreachStats.antwortenWoche}</span>
      </div>
      <div class="flex items-end justify-between mt-1">
        <span class="text-xs text-ink/40">Monat</span>
        <span class="font-display font-semibold text-lg text-ink/70">{data.outreachStats.antwortenMonat}</span>
      </div>
    </div>

    <div class="bg-surface rounded-xl border border-line p-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-semibold text-ink/40 uppercase tracking-wide">Rücklaufquote</p>
        <TrendingUp class="w-4 h-4 text-terracotta" />
      </div>
      <div class="flex items-end justify-between">
        <span class="text-xs text-ink/40">Woche</span>
        <span class="font-display font-bold text-2xl text-ink">{data.outreachStats.rücklaufWoche}%</span>
      </div>
      <div class="flex items-end justify-between mt-1">
        <span class="text-xs text-ink/40">Monat</span>
        <span class="font-display font-semibold text-lg text-ink/70">{data.outreachStats.rücklaufMonat}%</span>
      </div>
    </div>
  </div>

  <!-- Kontakte/Firmen-Stats -->
  <div class="grid grid-cols-2 gap-4">
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
  </div>

  <!-- Quick Actions + Zuletzt aktiv (links) / Antwort-Wiedervorlagen (rechts) -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <div class="space-y-6">
      <!-- Quick Actions -->
      <div class="bg-surface rounded-xl border border-line p-5">
        <h2 class="font-display font-semibold text-base text-ink mb-4">⚡ Quick Actions</h2>
        <div class="grid grid-cols-3 gap-3">
          <a href="/scan" class="flex flex-col items-center justify-center gap-2 px-3 py-4 border border-line rounded-lg text-ink/70 hover:border-terracotta/40 hover:text-terracotta transition-colors text-center">
            <UserPlus class="w-5 h-5" />
            <span class="text-xs font-medium">+ Kontakt</span>
          </a>
          <a href="/scan" class="flex flex-col items-center justify-center gap-2 px-3 py-4 border border-line rounded-lg text-ink/70 hover:border-terracotta/40 hover:text-terracotta transition-colors text-center">
            <Camera class="w-5 h-5" />
            <span class="text-xs font-medium">Scan &amp; Import</span>
          </a>
          <a href="/contacts?db=outreach" class="flex flex-col items-center justify-center gap-2 px-3 py-4 border border-line rounded-lg text-ink/70 hover:border-terracotta/40 hover:text-terracotta transition-colors text-center">
            <Send class="w-5 h-5" />
            <span class="text-xs font-medium">Outreach starten</span>
          </a>
        </div>
      </div>

      <!-- Zuletzt aktiv -->
      <div class="bg-surface rounded-xl border border-line">
        <div class="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 class="font-display font-semibold text-base text-ink flex items-center gap-2">
            <Megaphone class="w-4 h-4 text-sage" /> Zuletzt aktiv
          </h2>
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
              <a href="/contacts/{contact.id}" onclick={(e) => { e.preventDefault(); openContact(contact.id); }} class="flex items-center gap-3 px-5 py-3 hover:bg-cream transition-colors">
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

    <!-- Antwort-Wiedervorlagen -->
    <div class="bg-surface rounded-xl border border-line">
      <div class="px-5 py-4 border-b border-line">
        <h2 class="font-display font-semibold text-base text-ink flex items-center gap-2">
          <CalendarClock class="w-4 h-4 text-terracotta" /> Antwort-Wiedervorlagen
        </h2>
        <p class="text-xs text-ink/40 mt-1">Beantwortet, aber noch kein Follow-up raus — am schnellsten weitermachen</p>
      </div>
      <div class="divide-y divide-line">
        {#if data.wiedervorlagen.length === 0}
          <div class="px-5 py-8 text-center">
            <CalendarClock class="w-8 h-8 text-ink/20 mx-auto mb-2" />
            <p class="text-sm text-ink/40">Nichts offen — sauber.</p>
          </div>
        {:else}
          {#each data.wiedervorlagen as w}
            <a href="/outreach" class="block px-5 py-3 hover:bg-cream transition-colors">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-ink truncate">{w.name}</p>
                {#if w.followUpFaellig}
                  <span class="text-xs text-ink/40 flex-shrink-0">{formatDate(w.followUpFaellig)}</span>
                {/if}
              </div>
              <p class="text-xs text-ink/50 mt-0.5 line-clamp-2">{w.antwort}</p>
            </a>
          {/each}
        {/if}
      </div>
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
            <a href="/contacts/{contact.id}" onclick={(e) => { e.preventDefault(); openContact(contact.id); }} class="flex items-center gap-3 px-5 py-3 hover:bg-cream transition-colors">
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

</div>
