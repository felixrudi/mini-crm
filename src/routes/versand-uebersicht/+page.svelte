<script lang="ts">
  import type { PageData } from './$types';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';

  let { data }: { data: PageData } = $props();

  const STATUS_LABEL: Record<string, string> = {
    recherche: 'Recherche',
    entwurf: 'Entwurf',
    gesendet: 'Gesendet',
    geantwortet: 'Geantwortet',
    auto_reply: 'Im Urlaub',
    abgelehnt: 'Abgelehnt',
    gespräch_geführt: 'Gespräch geführt',
    termin_gebucht: 'Termin gebucht',
    gesperrt: 'Gesperrt'
  };

  const STATUS_COLOR: Record<string, string> = {
    gesendet: 'text-ink/60',
    geantwortet: 'text-status-positive',
    auto_reply: 'text-status-away',
    abgelehnt: 'text-ink/35',
    gespräch_geführt: 'text-status-positive',
    termin_gebucht: 'text-terracotta',
    gesperrt: 'text-ink/25',
    entwurf: 'text-status-critical',
    recherche: 'text-ink/35'
  };

  let statusFilter = $state<string>('alle');
  let welleFilter = $state<string>('alle');
  let sortKey = $state<'name' | 'versandtAm' | 'followUpFaellig'>('versandtAm');
  let sortDir = $state<'asc' | 'desc'>('desc');

  let statusOptions = $derived.by(() => {
    const set = new Set(data.outreach.map((i) => i.status));
    return Array.from(set).sort();
  });

  let welleOptions = $derived.by(() => {
    const set = new Set(data.outreach.map((i) => i.welle).filter((w): w is number => w != null));
    return Array.from(set).sort((a, b) => a - b);
  });

  let filtered = $derived.by(() => {
    let items = data.outreach;
    if (statusFilter !== 'alle') items = items.filter((i) => i.status === statusFilter);
    if (welleFilter !== 'alle') items = items.filter((i) => String(i.welle ?? '') === welleFilter);

    return [...items].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortKey === 'name') {
        av = a.kontaktName;
        bv = b.kontaktName;
      } else if (sortKey === 'versandtAm') {
        av = a.versandtAm ?? '';
        bv = b.versandtAm ?? '';
      } else {
        av = a.followUpFaellig ?? '';
        bv = b.followUpFaellig ?? '';
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  });

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'desc';
    }
  }

  function formatDateTime(dateStr: string | undefined | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string | undefined | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const AMPEL_COLOR: Record<string, string> = {
    gruen: 'bg-status-positive',
    gelb: 'bg-status-away',
    rot: 'bg-status-critical'
  };
  const AMPEL_LABEL: Record<string, string> = {
    gruen: 'Alles sauber',
    gelb: 'Ein paar Fälle warten',
    rot: 'Braucht Aufmerksamkeit'
  };
</script>

<svelte:head>
  <title>Versand-Übersicht · Hirschfeld CRM</title>
</svelte:head>

<div class="px-4 py-6 md:px-6 md:py-6 max-w-[1400px] mx-auto space-y-6">
  <!-- Kopfzeile -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="font-sans font-bold text-2xl text-ink">Versand-Übersicht</h1>
      <p class="text-sm text-ink/50 mt-1">
        Stand: {data.snapshot ? formatDateTime(data.snapshot.zeitstempel) : 'noch kein Lauf'}
        {#if data.snapshot?.alterStunden != null && data.snapshot.alterStunden > 36}
          <span class="text-status-critical font-medium"> — letzter Lauf {Math.round(data.snapshot.alterStunden)}h her, Cron prüfen</span>
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 px-3 py-2 bg-surface/40 border border-line rounded-lg">
        <span class="w-2.5 h-2.5 rounded-full {AMPEL_COLOR[data.ampel]}"></span>
        <span class="text-sm font-medium text-ink">{AMPEL_LABEL[data.ampel]}</span>
      </div>
      {#if data.followUpUeberfaelligCount > 0}
        <div class="flex items-center gap-2 px-3 py-2 bg-status-away/10 border border-status-away/30 rounded-lg">
          <span class="text-sm font-mono font-bold text-status-away">{data.followUpUeberfaelligCount}</span>
          <span class="text-xs text-ink/60">Follow-up fällig</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Freigabe-fällige Zeilen -->
  {#if data.freigabeFaellig.length > 0}
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm font-semibold text-status-critical">
        <AlertTriangle class="w-4 h-4" />
        {data.freigabeFaellig.length} Fälle brauchen deine Entscheidung
      </div>
      {#each data.freigabeFaellig as item}
        <div class="flex flex-col md:flex-row md:items-center justify-between p-3.5 pl-4 bg-status-critical/5 border border-status-critical/25 border-l-status-critical border-l-[3px] rounded-r-lg gap-2">
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-sm text-ink">{item.kontaktName}</div>
            {#if item.kanzlei}
              <div class="text-xs text-ink/40 mt-0.5">{item.kanzlei}</div>
            {/if}
          </div>
          <div class="text-xs text-ink/70 italic md:max-w-md">{item.freigabeGrund}</div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Filter -->
  <div class="flex flex-wrap items-center gap-3">
    <select bind:value={statusFilter} class="px-3 py-1.5 bg-surface border border-line rounded-lg text-sm text-ink">
      <option value="alle">Alle Status</option>
      {#each statusOptions as s}
        <option value={s}>{STATUS_LABEL[s] ?? s}</option>
      {/each}
    </select>
    <select bind:value={welleFilter} class="px-3 py-1.5 bg-surface border border-line rounded-lg text-sm text-ink">
      <option value="alle">Alle Wellen</option>
      {#each welleOptions as w}
        <option value={String(w)}>Welle {w}</option>
      {/each}
    </select>
    <span class="text-xs text-ink/40 ml-auto">{filtered.length} von {data.outreach.length}</span>
  </div>

  <!-- Tabelle -->
  <div class="overflow-x-auto rounded-xl border border-line">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-surface/40 border-b border-line text-left text-xs uppercase tracking-wider text-ink/50">
          <th class="px-3 py-2.5 font-semibold cursor-pointer select-none" onclick={() => toggleSort('name')}>
            <span class="inline-flex items-center gap-1">Kanzlei / Kontakt <ArrowUpDown class="w-3 h-3" /></span>
          </th>
          <th class="px-3 py-2.5 font-semibold">Status</th>
          <th class="px-3 py-2.5 font-semibold">Gesendet über</th>
          <th class="px-3 py-2.5 font-semibold cursor-pointer select-none" onclick={() => toggleSort('versandtAm')}>
            <span class="inline-flex items-center gap-1">Versandt am <ArrowUpDown class="w-3 h-3" /></span>
          </th>
          <th class="px-3 py-2.5 font-semibold cursor-pointer select-none" onclick={() => toggleSort('followUpFaellig')}>
            <span class="inline-flex items-center gap-1">Follow-up fällig <ArrowUpDown class="w-3 h-3" /></span>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as item (item.id)}
          <tr class="border-b border-line/40 last:border-0 hover:bg-surface/30 transition-colors">
            <td class="px-3 py-2.5">
              <div class="font-medium text-ink">{item.kontaktName}</div>
              {#if item.kanzlei}
                <div class="text-xs text-ink/40">{item.kanzlei}</div>
              {/if}
            </td>
            <td class="px-3 py-2.5">
              <span class="font-medium {STATUS_COLOR[item.status] ?? 'text-ink/60'}">{STATUS_LABEL[item.status] ?? item.status}</span>
            </td>
            <td class="px-3 py-2.5 text-ink/60 font-mono text-xs">{item.gesendetUeber || '—'}</td>
            <td class="px-3 py-2.5 text-ink/60">{formatDateTime(item.versandtAm)}</td>
            <td class="px-3 py-2.5">
              {#if item.followUpUeberfaellig}
                <span class="text-status-critical font-medium">{formatDate(item.followUpFaellig)}</span>
              {:else}
                <span class="text-ink/40">{formatDate(item.followUpFaellig)}</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if filtered.length === 0}
      <div class="text-sm text-ink/40 italic py-8 text-center">Keine Treffer für diese Filter.</div>
    {/if}
  </div>
</div>
