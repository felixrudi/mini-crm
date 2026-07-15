<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Search from '@lucide/svelte/icons/search';

  let { data }: { data: PageData } = $props();

  let searchValue = $state(data.q);
  let debounceTimer: ReturnType<typeof setTimeout>;

  const STATUS_GROUPS = [
    { id: 'recherche', label: 'Recherche', bulletColor: 'bg-slate-400' },
    { id: 'entwurf', label: 'Entwurf', bulletColor: 'bg-blue-400' },
    { id: 'gesendet', label: 'Gesendet', bulletColor: 'bg-indigo-400' },
    { id: 'auto_reply', label: 'Auto-Reply', bulletColor: 'bg-amber-500' },
    { id: 'geantwortet', label: 'Geantwortet', bulletColor: 'bg-teal-400' },
    { id: 'gespräch_geführt', label: 'Gespräch geführt', bulletColor: 'bg-emerald-400' },
    { id: 'termin_gebucht', label: 'Termin gebucht', bulletColor: 'bg-green-500' },
    { id: 'nicht_gesendet', label: 'Nicht gesendet', bulletColor: 'bg-neutral-500' },
    { id: 'abgelehnt', label: 'Abgelehnt', bulletColor: 'bg-rose-400' },
    { id: 'gesperrt', label: 'Gesperrt', bulletColor: 'bg-red-500' },
  ];

  // Group items by status
  let groupedItems = $derived.by(() => {
    const groups: Record<string, typeof data.outreach> = {};
    for (const item of data.outreach) {
      const status = item.status || 'recherche';
      if (!groups[status]) groups[status] = [];
      groups[status].push(item);
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
</script>

<svelte:head>
  <title>Outreach-Überblick · Hirschfeld CRM</title>
</svelte:head>

<div class="px-4 py-6 md:px-6 md:py-6 max-w-[1400px] mx-auto space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="font-sans font-bold text-2xl text-ink">Outreach-Überblick</h1>
      <p class="text-sm text-ink/50 mt-1">Status der Kaltakquise-Kampagne (StB/WP-Outreach)</p>
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

  <!-- Grid of Status Columns -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {#each STATUS_GROUPS as group}
      {@const groupItems = groupedItems[group.id] || []}
      {#if groupItems.length > 0}
        <div class="flex flex-col space-y-3 bg-surface/30 p-4 rounded-xl border border-line h-fit min-w-[250px]">
          <!-- Column Header -->
          <div class="flex items-center justify-between border-b border-line pb-2.5 mb-1">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full {group.bulletColor}"></span>
              <h2 class="font-sans font-semibold text-sm text-ink">{group.label}</h2>
            </div>
            <span class="text-xs font-numeric bg-ink/5 px-2 py-0.5 rounded-full text-ink/50 font-medium">{groupItems.length}</span>
          </div>

          <!-- Cards List -->
          <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {#each groupItems as item}
              <div class="bg-surface p-4 rounded-lg border border-line shadow-sm hover:border-terracotta/30 transition-all space-y-3">
                <!-- Name & Kanzlei -->
                <div>
                  <div class="font-semibold text-sm text-ink leading-snug">{item.kontaktName}</div>
                  <div class="text-xs text-ink/40 mt-0.5 font-medium">{item.kanzlei}</div>
                </div>

                <!-- Email / Meta -->
                <div class="text-xs text-ink/50 space-y-1 border-t border-line/40 pt-2.5 font-mono">
                  {#if item.email && item.email !== '—'}
                    <div class="truncate text-ink/40 hover:text-ink/65 transition-colors" title={item.email}>{item.email}</div>
                  {/if}
                  {#if item.versandtAm}
                    <div class="text-[10px]">Versandt: {formatDate(item.versandtAm)}</div>
                  {/if}
                  {#if item.gesendetUeber}
                    <div class="text-[10px] text-ink/35">Über: {item.gesendetUeber}</div>
                  {/if}
                </div>

                <!-- Conditionally render info depending on status -->
                {#if item.status === 'auto_reply' && item.notiz}
                  <div class="text-xs bg-amber-500/5 text-amber-500 border border-amber-500/10 p-2.5 rounded font-sans whitespace-pre-wrap leading-relaxed">
                    {item.notiz}
                  </div>
                {/if}

                {#if (item.status === 'geantwortet' || item.status === 'termin_gebucht') && item.antwortKurzfassung}
                  <div class="text-xs bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 p-2.5 rounded font-sans whitespace-pre-wrap leading-relaxed">
                    {item.antwortKurzfassung}
                  </div>
                {/if}

                <!-- Follow-up Alert badge -->
                {#if (item.status === 'gesendet' || item.status === 'auto_reply') && item.followUpFaellig}
                  {@const overdue = isOverdue(item.followUpFaellig, item.followUpGesendet)}
                  <div class="flex items-center justify-between border-t border-line/40 pt-2.5">
                    <span class="text-[10px] uppercase font-semibold tracking-wider text-ink/30">Follow-up:</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium border {overdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-ink/5 text-ink/50 border-line'}">
                      {formatDate(item.followUpFaellig)} {overdue ? '(Fällig)' : ''}
                    </span>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>