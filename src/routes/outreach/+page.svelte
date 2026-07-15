<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Search from '@lucide/svelte/icons/search';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  let { data }: { data: PageData } = $props();

  let searchValue = $state(data.q);
  let debounceTimer: ReturnType<typeof setTimeout>;

  let activeTab = $state<'overdue' | 'away' | 'answered' | 'booked'>('overdue');

  let expanded = $state<Record<string, boolean>>({
    entwurf: false,
    gesendet: false,
    recherche: false,
    nicht_gesendet: false,
    abgelehnt: false,
    gesperrt: false
  });

  // 1. Calculate Overdue items (follow-up date in the past and follow-up sent is false)
  let overdueItems = $derived.by(() => {
    return data.outreach
      .filter(item => isOverdue(item.followUpFaellig, item.followUpGesendet))
      .sort((a, b) => {
        if (!a.followUpFaellig) return 1;
        if (!b.followUpFaellig) return -1;
        return new Date(a.followUpFaellig).getTime() - new Date(b.followUpFaellig).getTime();
      });
  });

  // 2. Im Urlaub (status auto_reply, and not overdue)
  let awayItems = $derived.by(() => {
    return data.outreach.filter(item => item.status === 'auto_reply' && !isOverdue(item.followUpFaellig, item.followUpGesendet));
  });

  // 3. Geantwortet (status antwort / gespräch_geführt, and not overdue)
  let answeredItems = $derived.by(() => {
    return data.outreach.filter(item => 
      (item.status === 'geantwortet' || item.status === 'gespräch_geführt') && 
      !isOverdue(item.followUpFaellig, item.followUpGesendet)
    );
  });

  // 4. Termine (status termin_gebucht)
  let bookedItems = $derived.by(() => {
    return data.outreach.filter(item => item.status === 'termin_gebucht');
  });

  // Archive groups
  const ARCHIVED_GROUPS = [
    { id: 'entwurf', label: 'Entwürfe' },
    { id: 'gesendet', label: 'Gesendet (Kein Follow-up fällig)' },
    { id: 'recherche', label: 'Recherche' },
    { id: 'nicht_gesendet', label: 'Nicht gesendet' },
    { id: 'abgelehnt', label: 'Abgelehnt' },
    { id: 'gesperrt', label: 'Gesperrt' }
  ];

  // Helper to get archived list filtered by search
  let archivedItems = $derived.by(() => {
    const groups: Record<string, typeof data.outreach> = {};
    for (const item of data.outreach) {
      const isArchived = ['entwurf', 'gesendet', 'recherche', 'nicht_gesendet', 'abgelehnt', 'gesperrt'].includes(item.status);
      const isItemOverdue = isOverdue(item.followUpFaellig, item.followUpGesendet);
      
      // If it's in a normal state but not overdue, it's archived
      if (isArchived && !isItemOverdue && item.status !== 'auto_reply') {
        if (!groups[item.status]) groups[item.status] = [];
        groups[item.status].push(item);
      }
    }
    return groups;
  });

  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = new URL($page.url);
      if (searchValue.trim()) {
        url.searchParams.set('q', searchValue.trim());
      } else {
        url.searchParams.delete('q');
      }
      goto(url.toString(), { replaceState: true });
    }, 250);
  }

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function isOverdue(dateStr: string | undefined, followUpGesendet: boolean): boolean {
    if (!dateStr || followUpGesendet) return false;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return d < today;
  }

  function getOverdueDays(dateStr: string | undefined): number {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    const diffTime = today.getTime() - d.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  function selectTab(tab: 'overdue' | 'away' | 'answered' | 'booked') {
    activeTab = tab;
    setTimeout(() => {
      const el = document.getElementById('outreach-tabs-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
</script>

<svelte:head>
  <title>Outreach-Überblick · Hirschfeld CRM</title>
</svelte:head>

<div class="px-4 py-6 md:px-6 md:py-6 max-w-[1400px] mx-auto space-y-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="font-sans font-bold text-2xl text-ink">Outreach · StB/WP-Kampagne</h1>
      <p class="text-sm text-ink/50 mt-1">Status der Kaltakquise-Kampagne</p>
    </div>

    <!-- Search -->
    <div class="relative w-full sm:w-80">
      <input
        type="text"
        bind:value={searchValue}
        placeholder="Name, Kanzlei oder E-Mail suchen..."
        oninput={handleSearch}
        class="w-full pl-9 pr-4 py-2 bg-surface border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
      />
      <Search class="w-4 h-4 text-ink/30 absolute left-3 top-3" />
    </div>
  </div>

  <!-- Ampel-Leiste (Signatur-Element) -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <!-- Überfällig -->
    <button
      onclick={() => selectTab('overdue')}
      class="bg-surface/40 p-5 rounded-xl border border-line flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface/80 hover:border-status-critical/30 transition-all select-none group {activeTab === 'overdue' ? 'ring-2 ring-status-critical ring-offset-2 ring-offset-background' : ''}"
    >
      <span class="text-4xl font-mono font-bold text-status-critical transition-transform group-hover:scale-105">{overdueItems.length}</span>
      <div class="flex items-center gap-2 mt-1.5">
        <span class="w-2 h-2 rounded-full bg-status-critical"></span>
        <span class="text-xs uppercase font-semibold tracking-wider text-ink/50 group-hover:text-ink/75 transition-colors">Überfällig</span>
      </div>
    </button>

    <!-- Im Urlaub -->
    <button
      onclick={() => selectTab('away')}
      class="bg-surface/40 p-5 rounded-xl border border-line flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface/80 hover:border-status-away/30 transition-all select-none group {activeTab === 'away' ? 'ring-2 ring-status-away ring-offset-2 ring-offset-background' : ''}"
    >
      <span class="text-4xl font-mono font-bold text-status-away transition-transform group-hover:scale-105">{awayItems.length}</span>
      <div class="flex items-center gap-2 mt-1.5">
        <span class="w-2 h-2 rounded-full bg-status-away"></span>
        <span class="text-xs uppercase font-semibold tracking-wider text-ink/50 group-hover:text-ink/75 transition-colors">Im Urlaub</span>
      </div>
    </button>

    <!-- Geantwortet -->
    <button
      onclick={() => selectTab('answered')}
      class="bg-surface/40 p-5 rounded-xl border border-line flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface/80 hover:border-status-positive/30 transition-all select-none group {activeTab === 'answered' ? 'ring-2 ring-status-positive ring-offset-2 ring-offset-background' : ''}"
    >
      <span class="text-4xl font-mono font-bold text-status-positive transition-transform group-hover:scale-105">{answeredItems.length}</span>
      <div class="flex items-center gap-2 mt-1.5">
        <span class="w-2 h-2 rounded-full bg-status-positive"></span>
        <span class="text-xs uppercase font-semibold tracking-wider text-ink/50 group-hover:text-ink/75 transition-colors">Geantwortet</span>
      </div>
    </button>

    <!-- Termine -->
    <button
      onclick={() => selectTab('booked')}
      class="bg-surface/40 p-5 rounded-xl border border-line flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface/80 hover:border-terracotta/30 transition-all select-none group {activeTab === 'booked' ? 'ring-2 ring-terracotta ring-offset-2 ring-offset-background' : ''}"
    >
      <span class="text-4xl font-mono font-bold text-terracotta transition-transform group-hover:scale-105">{bookedItems.length}</span>
      <div class="flex items-center gap-2 mt-1.5">
        <span class="w-2 h-2 rounded-full bg-terracotta"></span>
        <span class="text-xs uppercase font-semibold tracking-wider text-ink/50 group-hover:text-ink/75 transition-colors">Termine</span>
      </div>
    </button>
  </div>

  <!-- TAB-STEUERUNG & LISTE -->
  <div id="outreach-tabs-container" class="space-y-6 scroll-mt-6">
    <!-- Tab Bar -->
    <div class="flex border-b border-line gap-4 sm:gap-6 overflow-x-auto pb-px">
      <button
        onclick={() => activeTab = 'overdue'}
        class="pb-2.5 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap {activeTab === 'overdue' ? 'border-status-critical text-ink font-bold' : 'border-transparent text-ink/40 hover:text-ink/70'}"
      >
        Zu schreiben ({overdueItems.length})
      </button>
      <button
        onclick={() => activeTab = 'away'}
        class="pb-2.5 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap {activeTab === 'away' ? 'border-status-away text-ink font-bold' : 'border-transparent text-ink/40 hover:text-ink/70'}"
      >
        Im Urlaub ({awayItems.length})
      </button>
      <button
        onclick={() => activeTab = 'answered'}
        class="pb-2.5 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap {activeTab === 'answered' ? 'border-status-positive text-ink font-bold' : 'border-transparent text-ink/40 hover:text-ink/70'}"
      >
        Geantwortet ({answeredItems.length})
      </button>
      <button
        onclick={() => activeTab = 'booked'}
        class="pb-2.5 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap {activeTab === 'booked' ? 'border-terracotta text-ink font-bold' : 'border-transparent text-ink/40 hover:text-ink/70'}"
      >
        Termine ({bookedItems.length})
      </button>
    </div>

    <!-- Active Tab List -->
    <div class="space-y-4">
      {#if activeTab === 'overdue'}
        {#if overdueItems.length === 0}
          <div class="text-sm text-ink/40 italic py-8 text-center bg-surface/10 rounded-xl border border-line/35">
            Keine überfälligen Follow-ups. Alles erledigt! 🎉
          </div>
        {:else}
          <div class="space-y-2">
            {#each overdueItems as item}
              {@const days = getOverdueDays(item.followUpFaellig)}
              <div class="flex flex-col md:flex-row md:items-center justify-between p-3.5 pl-4 bg-surface/30 hover:bg-surface/75 border border-line border-l-status-critical border-l-[3px] rounded-r-lg transition-colors gap-3">
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-sm text-ink">{item.kontaktName}</div>
                  {#if item.kanzlei}
                    <div class="text-xs text-ink/40 mt-0.5 font-medium">{item.kanzlei}</div>
                  {/if}
                  {#if item.email && item.email !== '—'}
                    <div class="text-[11px] text-ink/40 font-mono mt-1 select-all">{item.email}</div>
                  {/if}
                </div>

                <div class="flex-[2] min-w-0">
                  {#if item.notiz}
                    <div class="text-xs text-ink/60 line-clamp-2 bg-ink/[2%] px-2.5 py-1.5 rounded border border-line/30 italic font-sans" title={item.notiz}>
                      "{item.notiz}"
                    </div>
                  {/if}
                </div>

                <div class="flex flex-col items-end justify-center text-right font-mono text-xs shrink-0">
                  <span class="text-status-critical font-bold">Fällig {days === 0 ? 'heute' : `vor ${days} Tag${days > 1 ? 'en' : ''}`}</span>
                  <span class="text-[10px] text-ink/30 mt-0.5">Sollte: {formatDate(item.followUpFaellig)}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else if activeTab === 'away'}
        {#if awayItems.length === 0}
          <div class="text-sm text-ink/40 italic py-8 text-center bg-surface/10 rounded-xl border border-line/35">
            Aktuell niemand im Urlaub.
          </div>
        {:else}
          <div class="space-y-2">
            {#each awayItems as item}
              <div class="flex flex-col md:flex-row md:items-center justify-between p-3.5 pl-4 bg-surface/30 hover:bg-surface/75 border border-line border-l-status-away border-l-[3px] rounded-r-lg transition-colors gap-3">
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-sm text-ink">{item.kontaktName}</div>
                  {#if item.kanzlei}
                    <div class="text-xs text-ink/40 mt-0.5 font-medium">{item.kanzlei}</div>
                  {/if}
                </div>
                <div class="flex-[2] min-w-0">
                  {#if item.notiz}
                    <div class="text-xs text-status-away/95 bg-status-away/5 px-2.5 py-1.5 rounded border border-status-away/10 font-sans whitespace-pre-wrap">
                      {item.notiz}
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col items-end justify-center text-right font-mono text-xs shrink-0 text-ink/40">
                  <span>Auto-Reply</span>
                  {#if item.followUpFaellig}
                    <span class="text-[10px] mt-0.5">WV: {formatDate(item.followUpFaellig)}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else if activeTab === 'answered'}
        {#if answeredItems.length === 0}
          <div class="text-sm text-ink/40 italic py-8 text-center bg-surface/10 rounded-xl border border-line/35">
            Keine offenen Antworten.
          </div>
        {:else}
          <div class="space-y-2">
            {#each answeredItems as item}
              <div class="flex flex-col md:flex-row md:items-center justify-between p-3.5 pl-4 bg-surface/30 hover:bg-surface/75 border border-line border-l-status-positive border-l-[3px] rounded-r-lg transition-colors gap-3">
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-sm text-ink">{item.kontaktName}</div>
                  {#if item.kanzlei}
                    <div class="text-xs text-ink/40 mt-0.5 font-medium">{item.kanzlei}</div>
                  {/if}
                </div>
                <div class="flex-[2] min-w-0">
                  {#if item.antwortKurzfassung}
                    <div class="text-xs text-status-positive bg-status-positive/5 px-2.5 py-1.5 rounded border border-status-positive/10 font-sans">
                      {item.antwortKurzfassung}
                    </div>
                  {:else if item.notiz}
                    <div class="text-xs text-ink/50 italic font-sans truncate">
                      "{item.notiz.slice(0, 100)}..."
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col items-end justify-center text-right font-mono text-xs shrink-0 text-ink/40">
                  <span class="text-status-positive font-medium">Interesse</span>
                  {#if item.versandtAm}
                    <span class="text-[10px] mt-0.5">Mail: {formatDate(item.versandtAm)}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else if activeTab === 'booked'}
        {#if bookedItems.length === 0}
          <div class="text-sm text-ink/40 italic py-8 text-center bg-surface/10 rounded-xl border border-line/35">
            Noch keine gebuchten Termine.
          </div>
        {:else}
          <div class="space-y-2">
            {#each bookedItems as item}
              <div class="flex flex-col md:flex-row md:items-center justify-between p-3.5 pl-4 bg-surface/30 hover:bg-surface/75 border border-line border-l-terracotta border-l-[3px] rounded-r-lg transition-colors gap-3">
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-sm text-ink">{item.kontaktName}</div>
                  {#if item.kanzlei}
                    <div class="text-xs text-ink/40 mt-0.5 font-medium">{item.kanzlei}</div>
                  {/if}
                </div>
                <div class="flex-[2] min-w-0">
                  {#if item.antwortKurzfassung}
                    <div class="text-xs text-terracotta bg-terracotta/5 px-2.5 py-1.5 rounded border border-terracotta/10 font-sans">
                      {item.antwortKurzfassung}
                    </div>
                  {:else if item.notiz}
                    <div class="text-xs text-ink/50 italic font-sans truncate">
                      "{item.notiz.slice(0, 100)}..."
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col items-end justify-center text-right font-mono text-xs shrink-0 text-terracotta">
                  <span class="font-bold">Termin</span>
                  {#if item.versandtAm}
                    <span class="text-[10px] text-ink/40 mt-0.5">Versandt: {formatDate(item.versandtAm)}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- ARCHIV (standardmäßig eingeklappt) -->
  <div class="space-y-4 pt-4">
    <h2 class="text-xs uppercase font-bold tracking-wider text-ink/40 border-b border-line pb-2">Archiv & Massenstände</h2>
    
    <div class="divide-y divide-line/40 border border-line/40 rounded-xl overflow-hidden bg-surface/10">
      {#each ARCHIVED_GROUPS as group}
        {@const groupItems = archivedItems[group.id] || []}
        <div class="flex flex-col">
          <!-- Accordion Header -->
          <button
            onclick={() => expanded[group.id] = !expanded[group.id]}
            class="flex items-center justify-between p-3.5 px-4 text-xs font-semibold text-ink/60 hover:bg-surface/30 hover:text-ink transition-colors cursor-pointer select-none"
          >
            <div class="flex items-center gap-2">
              {#if expanded[group.id]}
                <ChevronDown class="w-3.5 h-3.5 text-ink/30" />
              {:else}
                <ChevronRight class="w-3.5 h-3.5 text-ink/30" />
              {/if}
              <span>{group.label}</span>
            </div>
            <span class="font-mono text-ink/30 bg-ink/[3%] px-2 py-0.5 rounded-full text-[10px]">{groupItems.length}</span>
          </button>

          <!-- Accordion Content -->
          {#if expanded[group.id]}
            <div class="p-3 px-4 border-t border-line/20 bg-surface/5 space-y-1.5 transition-all">
              {#if groupItems.length === 0}
                <div class="text-[11px] text-ink/30 italic py-1">Keine Datensätze in dieser Gruppe.</div>
              {:else}
                <div class="divide-y divide-line/20 max-h-[40vh] overflow-y-auto pr-1">
                  {#each groupItems as item}
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2 text-xs text-ink/75 hover:bg-surface/20 rounded px-1.5 transition-colors gap-2">
                      <div class="font-semibold truncate sm:w-1/3 shrink-0">{item.kontaktName}</div>
                      <div class="text-ink/40 truncate sm:w-1/3">{item.kanzlei || '—'}</div>
                      <div class="text-ink/30 font-mono text-[10px] sm:w-1/3 text-right">
                        {#if item.versandtAm}
                          Versandt: {formatDate(item.versandtAm)}
                        {:else if item.followUpFaellig}
                          WV: {formatDate(item.followUpFaellig)}
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>