<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from '$lib/toast';
  import { openCompany } from '$lib/detail-panel';
  import type { Company, ViewFilter } from '$lib/types';
  import { groupByTags, tagColor, DEFAULT_TAGS_EXCLUDE } from '$lib/tags';
  import TagInput from '$lib/components/TagInput.svelte';
  import ViewTabs from '$lib/components/ViewTabs.svelte';
  import EditableTagChip from '$lib/components/EditableTagChip.svelte';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Plus from '@lucide/svelte/icons/plus';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Users from '@lucide/svelte/icons/users';
  import Phone from '@lucide/svelte/icons/phone';
  import Target from '@lucide/svelte/icons/target';
  import Search from '@lucide/svelte/icons/search';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';

  let { data }: { data: PageData } = $props();

  let activeDb = $state(data.db);
  function setDb(db: 'crm' | 'outreach') {
    activeDb = db;
    const url = new URL($page.url);
    if (db === 'outreach') url.searchParams.set('db', 'outreach');
    else url.searchParams.delete('db');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  const STATUS_LABELS: Record<string, string> = {
    gesendet: 'Gesendet', geantwortet: 'Geantwortet', termin: 'Termin',
    kein_interesse: 'Kein Interesse', bounce: 'Bounce', abgesagt: 'Abgesagt'
  };
  const STATUS_COLORS: Record<string, string> = {
    gesendet: 'bg-blue-50 text-blue-600 border-blue-200',
    geantwortet: 'bg-amber-50 text-amber-600 border-amber-200',
    termin: 'bg-green-50 text-green-700 border-green-200',
    kein_interesse: 'bg-ink/5 text-ink/40 border-line',
    bounce: 'bg-red-50 text-red-500 border-red-200',
    abgesagt: 'bg-ink/5 text-ink/40 border-line'
  };

  let outreachSearch = $state(data.oq ?? '');
  let outreachDebounce: ReturnType<typeof setTimeout>;
  function handleOutreachSearch() {
    clearTimeout(outreachDebounce);
    outreachDebounce = setTimeout(() => {
      const url = new URL($page.url);
      if (outreachSearch.trim()) url.searchParams.set('oq', outreachSearch.trim());
      else url.searchParams.delete('oq');
      goto(url.toString(), { replaceState: true, invalidateAll: true });
    }, 300);
  }

  // Outreach-Firmen sind aus Prospects abgeleitet (keine Tags-/Ort-Felder
  // dort) — Sortieren/Gruppieren spiegeln daher das Prospects-Muster (Name/
  // Status/zuletzt versandt bzw. Gruppierung nach Status), nicht Tags.
  let osort = $state<'name' | 'status' | 'versandt'>(
    data.osort === 'status' || data.osort === 'versandt' ? data.osort : 'name'
  );
  let ogroup = $state<'' | 'status'>(data.ogroup === 'status' ? 'status' : '');
  let outreachFilter = $derived<ViewFilter>({ q: outreachSearch, osort, ogroup });

  function updateOutreachExtraUrl() {
    const url = new URL($page.url);
    if (osort !== 'name') url.searchParams.set('osort', osort);
    else url.searchParams.delete('osort');
    if (ogroup === 'status') url.searchParams.set('ogroup', 'status');
    else url.searchParams.delete('ogroup');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true, invalidateAll: true });
  }
  function setOSort(s: 'name' | 'status' | 'versandt') { osort = s; updateOutreachExtraUrl(); }
  function setOGroup(g: '' | 'status') { ogroup = g; updateOutreachExtraUrl(); }
  function clearOutreachExtraFilter() { osort = 'name'; ogroup = ''; updateOutreachExtraUrl(); }

  function applyOutreachView(filter: ViewFilter) {
    outreachSearch = filter.q ?? '';
    osort = filter.osort === 'status' || filter.osort === 'versandt' ? filter.osort : 'name';
    ogroup = filter.ogroup === 'status' ? 'status' : '';
    clearTimeout(outreachDebounce);
    const url = new URL($page.url);
    if (outreachSearch.trim()) url.searchParams.set('oq', outreachSearch.trim());
    else url.searchParams.delete('oq');
    if (osort !== 'name') url.searchParams.set('osort', osort);
    else url.searchParams.delete('osort');
    if (ogroup === 'status') url.searchParams.set('ogroup', 'status');
    else url.searchParams.delete('ogroup');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true, invalidateAll: true });
  }

  const OSTATUS_GROUP_LABEL = (status: string) => STATUS_LABELS[status] ?? status ?? 'Unbekannt';
  let outreachCompanyGroups = $derived(
    ogroup === 'status' ? groupByTags(data.outreachCompanies, (c: { status: string }) => [OSTATUS_GROUP_LABEL(c.status)]) : null
  );

  let showCreateForm = $state(false);
  let editId = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);

  let editName = $state('');
  let editWebsite = $state('');
  let editTelefon = $state('');
  let editOrt = $state('');
  let editNotizen = $state('');
  let editTags = $state<string[]>([]);
  let createTags = $state<string[]>([]);

  // CRM-Textsuche (Name, Website, Telefon, Notizen, Kontaktnamen)
  let searchValue = $state(data.q ?? '');
  let crmSearchDebounce: ReturnType<typeof setTimeout>;
  function handleCrmSearch() {
    clearTimeout(crmSearchDebounce);
    crmSearchDebounce = setTimeout(() => {
      const url = new URL($page.url);
      if (searchValue.trim()) url.searchParams.set('q', searchValue.trim());
      else url.searchParams.delete('q');
      goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true, invalidateAll: true });
    }, 300);
  }

  function startEdit(company: Company) {
    editId = company.id;
    editName = company.name;
    editWebsite = company.website ?? '';
    editTelefon = company.telefon ?? '';
    editOrt = company.ort ?? '';
    editNotizen = company.notizen ?? '';
    editTags = company.tags ?? [];
  }
  function cancelEdit() { editId = null; }

  // --- Filter, Sortierung, Gruppierung (bestehende Funktion, in "Mehr Filter") ---
  let selectedTags = $state<string[]>(data.tags ?? []);
  let excludedTags = $state<string[]>(data.tagsExclude ?? []);
  let tagMode = $state<'or' | 'and'>(data.tagMode === 'and' ? 'and' : 'or');
  let ort = $state(data.ort ?? '');
  let sortBy = $state<'name' | 'contacts' | 'tags'>(data.sort ?? 'name');
  let group = $state<'' | 'tags'>(data.group === 'tags' ? 'tags' : '');
  let hasFilter = $derived(
    selectedTags.length > 0 ||
      ort !== '' ||
      !!searchValue.trim() ||
      excludedTags.length !== DEFAULT_TAGS_EXCLUDE.length ||
      DEFAULT_TAGS_EXCLUDE.some((t) => !excludedTags.includes(t))
  );

  // Eingeklappte Gruppen (nur clientseitig, kein Teable-Persist nötig).
  let collapsedGroups = $state<Set<string>>(new Set());
  function toggleGroup(tag: string) {
    const next = new Set(collapsedGroups);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    collapsedGroups = next;
  }

  let currentFilter = $derived<ViewFilter>({ q: searchValue, tags: selectedTags, tagsExclude: excludedTags, tagMode, sort: sortBy, ort, group });

  function updateUrl() {
    const url = new URL($page.url);
    if (searchValue.trim()) url.searchParams.set('q', searchValue.trim());
    else url.searchParams.delete('q');
    if (selectedTags.length > 0) url.searchParams.set('tags', selectedTags.join(','));
    else url.searchParams.delete('tags');
    url.searchParams.set('tagsExclude', excludedTags.join(','));
    if (tagMode === 'and') url.searchParams.set('mode', 'and');
    else url.searchParams.delete('mode');
    if (ort) url.searchParams.set('ort', ort);
    else url.searchParams.delete('ort');
    if (sortBy !== 'name') url.searchParams.set('sort', sortBy);
    else url.searchParams.delete('sort');
    if (group === 'tags') url.searchParams.set('group', 'tags');
    else url.searchParams.delete('group');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true, invalidateAll: true });
  }

  // Bulk-Rename eines Tags über alle CRM-Firmen (Tags sind reine Strings,
  // dupliziert je Record — kein eigenes Tag-Objekt). War der alte Name gerade
  // als Include- oder Exclude-Filter aktiv, wird er im Filter-State durch den
  // neuen ersetzt, damit die Ansicht nicht plötzlich leer/falsch wirkt.
  async function renameTag(oldTag: string, newTag: string) {
    const fd = new FormData();
    fd.append('oldTag', oldTag);
    fd.append('newTag', newTag);
    const res = await fetch('?/rename_tag', { method: 'POST', body: fd });
    if (res.ok) {
      toast.success(`Tag „${oldTag}" → „${newTag}" umbenannt`);
      if (selectedTags.includes(oldTag)) selectedTags = selectedTags.map((t) => (t === oldTag ? newTag : t));
      if (excludedTags.includes(oldTag)) excludedTags = excludedTags.map((t) => (t === oldTag ? newTag : t));
      updateUrl();
    } else {
      toast.error('Umbenennen fehlgeschlagen');
      throw new Error('rename failed');
    }
  }

  function toggleTag(tag: string) {
    selectedTags = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
    if (excludedTags.includes(tag)) excludedTags = excludedTags.filter((t) => t !== tag);
    updateUrl();
  }
  function toggleExcludeTag(tag: string) {
    excludedTags = excludedTags.includes(tag) ? excludedTags.filter((t) => t !== tag) : [...excludedTags, tag];
    if (selectedTags.includes(tag)) selectedTags = selectedTags.filter((t) => t !== tag);
    updateUrl();
  }
  function setTagMode(mode: 'or' | 'and') { tagMode = mode; updateUrl(); }
  function setOrt(o: string) { ort = o; updateUrl(); }
  function setSort(s: 'name' | 'contacts' | 'tags') { sortBy = s; updateUrl(); }
  function setGroup(g: '' | 'tags') { group = g; updateUrl(); }
  function clearFilter() {
    searchValue = '';
    selectedTags = [];
    excludedTags = [...DEFAULT_TAGS_EXCLUDE];
    tagMode = 'or';
    ort = '';
    updateUrl();
  }
  function applyView(filter: ViewFilter) {
    searchValue = filter.q ?? '';
    selectedTags = filter.tags ?? [];
    excludedTags = filter.tagsExclude !== undefined ? (filter.tagsExclude ?? []) : [...DEFAULT_TAGS_EXCLUDE];
    tagMode = filter.tagMode === 'and' ? 'and' : 'or';
    ort = filter.ort ?? '';
    sortBy = filter.sort === 'contacts' || filter.sort === 'tags' ? filter.sort : 'name';
    group = filter.group === 'tags' ? 'tags' : '';
    updateUrl();
  }

  let companyGroups = $derived(group === 'tags' ? groupByTags(data.companies, (c) => c.tags ?? []) : null);
</script>

{#snippet companyRow(company: Company & { contact_names?: string[] })}
  <tr class="hover:bg-cream/50 transition-colors">
    <td class="px-3 py-2">
      {#if editId === company.id}
        <form method="POST" action="?/update" use:enhance={() => async ({ result, update }) => {
          if (result.type === 'success') { toast.success('Gespeichert'); cancelEdit(); } else toast.error('Fehler');
          await update();
        }}>
          <input type="hidden" name="id" value={company.id} />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 min-w-[280px]">
            <input name="name" bind:value={editName} required placeholder="Name"
              class="px-2 py-1.5 bg-cream border border-terracotta/40 rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
            <input name="website" bind:value={editWebsite} placeholder="Website"
              class="px-2 py-1.5 bg-cream border border-line rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
            <input name="telefon" bind:value={editTelefon} placeholder="Telefon"
              class="px-2 py-1.5 bg-cream border border-line rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
            <input name="ort" bind:value={editOrt} placeholder="Ort"
              class="px-2 py-1.5 bg-cream border border-line rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
            <input name="notizen" bind:value={editNotizen} placeholder="Notizen" class="sm:col-span-2 px-2 py-1.5 bg-cream border border-line rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
          </div>
          <div class="mb-2"><TagInput bind:tags={editTags} placeholder="steuerberater, wien … Enter" /></div>
          <div class="flex gap-1.5">
            <button type="submit" class="flex items-center gap-1 px-2.5 py-1 bg-terracotta text-white rounded text-xs font-medium"><Check class="w-3 h-3" /> Speichern</button>
            <button type="button" onclick={cancelEdit} class="flex items-center gap-1 px-2.5 py-1 border border-line rounded text-xs text-ink/60"><X class="w-3 h-3" /> Abbrechen</button>
          </div>
        </form>
      {:else}
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
            <Building2 class="w-4 h-4 text-sage" />
          </div>
          <div class="min-w-0">
            <a href="/companies/{company.id}" onclick={(e) => { e.preventDefault(); openCompany(company.id); }} class="text-sm font-medium text-ink hover:text-terracotta transition-colors block truncate">{company.name}</a>
            {#if company.website}
              <a href={company.website} target="_blank" rel="noopener" class="flex items-center gap-1 text-xs text-terracotta hover:underline font-mono">
                <ExternalLink class="w-3 h-3" /> {company.website.replace(/^https?:\/\//, '')}
              </a>
            {/if}
          </div>
        </div>
      {/if}
    </td>
    {#if editId !== company.id}
      <td class="px-3 py-2 hidden md:table-cell">
        <span class="text-sm text-ink/60">{company.notizen ?? '—'}</span>
        {#if company.tags?.length}
          <div class="flex flex-wrap gap-1 mt-1">
            {#each company.tags as t}<span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium border {tagColor(t)}">{t}</span>{/each}
          </div>
        {/if}
      </td>
      <td class="px-3 py-2 hidden lg:table-cell">
        {#if company.contact_count > 0}
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cream text-ink"><Users class="w-3 h-3" /> {company.contact_count} Kontakt{company.contact_count === 1 ? '' : 'e'}</span>
          <span class="block text-[11px] text-ink/40 mt-0.5 truncate">{(company.contact_names ?? []).join(', ')}</span>
        {:else}
          <span class="text-ink/20 text-xs">—</span>
        {/if}
      </td>
      <td class="px-3 py-2">
        {#if company.telefon}
          <a href="tel:{company.telefon}" class="flex items-center gap-1 text-sm text-terracotta font-mono font-bold hover:underline"><Phone class="w-3.5 h-3.5" /> {company.telefon}</a>
        {:else}
          <span class="text-ink/20 text-xs">—</span>
        {/if}
      </td>
      <td class="px-3 py-2">
        <div class="flex items-center justify-end gap-1">
          <button onclick={() => startEdit(company)} class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded"><Pencil class="w-3.5 h-3.5" /></button>
          {#if deleteConfirm === company.id}
            <form method="POST" action="?/delete" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Gelöscht'); deleteConfirm = null; await update(); }} class="flex items-center gap-1">
              <input type="hidden" name="id" value={company.id} />
              <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
              <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
            </form>
          {:else}
            <button onclick={() => (deleteConfirm = company.id)} class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded"><Trash2 class="w-3.5 h-3.5" /></button>
          {/if}
        </div>
      </td>
    {/if}
  </tr>
{/snippet}

{#snippet outreachCompanyRow(c: { key: string; name: string; website: string | null; prospects: { id: string; name: string }[]; telefon: string | null; status: string })}
  <tr class="hover:bg-cream/50 transition-colors">
    <td class="px-3 py-2">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-terracotta/10 flex items-center justify-center flex-shrink-0">
          <Building2 class="w-4 h-4 text-terracotta" />
        </div>
        <div class="min-w-0">
          <span class="text-sm font-medium text-ink block truncate">{c.name}</span>
          {#if c.website}
            <a href={c.website} target="_blank" rel="noopener" class="flex items-center gap-1 text-xs text-terracotta hover:underline font-mono">
              <ExternalLink class="w-3 h-3" /> {c.website.replace(/^https?:\/\//, '')}
            </a>
          {/if}
        </div>
      </div>
    </td>
    <td class="px-3 py-2 hidden lg:table-cell">
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cream text-ink"><Users class="w-3 h-3" /> {c.prospects.length} Kontakt{c.prospects.length === 1 ? '' : 'e'}</span>
      <span class="block text-[11px] text-ink/40 mt-0.5 truncate">{c.prospects.map((p: any) => p.name).join(', ')}</span>
    </td>
    <td class="px-3 py-2">
      <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border {STATUS_COLORS[c.status] ?? 'bg-ink/5 text-ink/40 border-line'}">{STATUS_LABELS[c.status] ?? c.status}</span>
    </td>
    <td class="px-3 py-2">
      {#if c.telefon}
        <a href="tel:{c.telefon}" class="flex items-center gap-1 text-sm text-terracotta font-mono font-bold hover:underline"><Phone class="w-3.5 h-3.5" /> {c.telefon}</a>
      {:else}
        <span class="text-ink/20 text-xs">—</span>
      {/if}
    </td>
    <td class="px-3 py-2 text-right">
      <a href="/prospects?q={encodeURIComponent(c.name)}" class="inline-flex items-center gap-1 px-2.5 py-1 border border-line rounded text-xs text-ink/60 hover:bg-cream transition-colors">
        <Target class="w-3.5 h-3.5" /> Prospects ansehen
      </a>
    </td>
  </tr>
{/snippet}

<div class="p-6 max-w-[1400px] mx-auto overflow-x-hidden">
  <div class="flex items-start justify-between mb-4 flex-wrap gap-3">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">
        Firmen ({activeDb === 'crm' ? 'Mein Netzwerk' : 'Outreach-Firmen'})
      </h1>
      <div class="flex gap-1.5 mt-2.5 bg-cream p-1 rounded-lg w-fit">
        <button onclick={() => setDb('crm')}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors {activeDb === 'crm' ? 'bg-surface text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}">
          <Users class="w-3.5 h-3.5" /> Mein Netzwerk (CRM)
        </button>
        <button onclick={() => setDb('outreach')}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors {activeDb === 'outreach' ? 'bg-surface text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}">
          <Target class="w-3.5 h-3.5" /> Outreach-Firmen (DB)
        </button>
      </div>
    </div>
    {#if activeDb === 'crm'}
      <button onclick={() => (showCreateForm = !showCreateForm)}
        class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
        <Plus class="w-4 h-4" /> Neue Firma
      </button>
    {/if}
  </div>

  {#if activeDb === 'crm'}
    <ViewTabs seite="firmen" views={data.views} currentFilter={currentFilter} onselect={applyView} />

    <!-- Filterleiste -->
    <div class="bg-surface rounded-xl border border-line p-3 mb-3">
      <div class="mb-2">
        <p class="text-[11px] font-bold text-ink/40 uppercase tracking-wide mb-1">🔍 Live-Suche</p>
        <div class="relative max-w-sm">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30" />
          <input type="text" bind:value={searchValue} oninput={handleCrmSearch}
            placeholder="Name, Website, Telefon, Notiz, Kontakt…"
            class="w-full pl-8 pr-3 py-1 bg-cream border border-line rounded-lg text-xs text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
      </div>
      {#if data.allTags.length > 0}
        <p class="text-[11px] font-bold text-ink/40 uppercase tracking-wide mb-1">🏷 Tags</p>
        <div class="flex flex-wrap gap-1">
          {#each data.allTags as tag}
            <EditableTagChip
              tag={tag}
              active={selectedTags.includes(tag)}
              activeClass={tagColor(tag) + ' ring-2 ring-offset-1 ring-terracotta/40'}
              inactiveClass="bg-cream text-ink/50 border-line hover:border-ink/30"
              onToggle={() => toggleTag(tag)}
              onRename={(newTag) => renameTag(tag, newTag)}
            />
          {/each}
        </div>
        <p class="text-[11px] font-bold text-red-400/70 uppercase tracking-wide mb-1 mt-1.5">🚫 Tags ausschließen</p>
        <div class="flex flex-wrap gap-1">
          {#each data.allTags as tag}
            <EditableTagChip
              tag={tag}
              active={excludedTags.includes(tag)}
              activeClass="bg-red-50 text-red-600 border-red-300 ring-2 ring-offset-1 ring-red-300/50"
              inactiveClass="bg-cream text-ink/50 border-line hover:border-red-300/50"
              onToggle={() => toggleExcludeTag(tag)}
              onRename={(newTag) => renameTag(tag, newTag)}
            />
          {/each}
        </div>
      {/if}

      <!-- Sortierung/Gruppierung/Ort — dünne, immer sichtbare Zeile -->
      <div class="mt-2 pt-2 border-t border-line flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <label class="flex items-center gap-1 text-ink/50">
          Sortieren
          <select value={sortBy} onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as 'name' | 'contacts' | 'tags')}
            class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
            <option value="name">Name (A-Z)</option>
            <option value="contacts">Anzahl Kontakte</option>
            <option value="tags">Anzahl Tags</option>
          </select>
        </label>
        <label class="flex items-center gap-1 text-ink/50">
          Gruppieren
          <select value={group} onchange={(e) => setGroup((e.currentTarget as HTMLSelectElement).value as '' | 'tags')}
            class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
            <option value="">Keine</option>
            <option value="tags">Nach Tags</option>
          </select>
        </label>
        {#if data.allOrte.length > 0}
          <label class="flex items-center gap-1 text-ink/50">
            Ort
            <select value={ort} onchange={(e) => setOrt((e.currentTarget as HTMLSelectElement).value)}
              class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
              <option value="">Alle</option>
              {#each data.allOrte as o}<option value={o}>{o}</option>{/each}
            </select>
          </label>
        {/if}
        {#if hasFilter}
          <button onclick={clearFilter} class="text-ink/40 hover:text-terracotta transition-colors ml-auto">Filter löschen</button>
        {/if}
      </div>
    </div>

    <!-- Create form -->
    {#if showCreateForm}
      <form method="POST" action="?/create" class="bg-surface rounded-xl border border-terracotta/30 p-5 mb-6"
        use:enhance={() => async ({ result, update }) => {
          if (result.type === 'success') { toast.success('Firma erstellt'); showCreateForm = false; createTags = []; }
          else if (result.type === 'failure') toast.error((result.data as any)?.error ?? 'Fehler');
          await update();
        }}>
        <h3 class="font-display font-semibold text-base text-ink mb-4">Neue Firma</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-ink/60 mb-1">Name *</label>
            <input name="name" type="text" required placeholder="Firmenname"
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
          <div><label class="block text-xs font-medium text-ink/60 mb-1">Website</label>
            <input name="website" type="url" placeholder="https://..." class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" /></div>
          <div><label class="block text-xs font-medium text-ink/60 mb-1">Telefon</label>
            <input name="telefon" type="tel" placeholder="+43 1 234567" class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" /></div>
          <div><label class="block text-xs font-medium text-ink/60 mb-1">Ort</label>
            <input name="ort" type="text" placeholder="Wien" class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" /></div>
          <div><label class="block text-xs font-medium text-ink/60 mb-1">Notizen</label>
            <input name="notizen" type="text" placeholder="Optional..." class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" /></div>
          <div class="sm:col-span-2"><label class="block text-xs font-medium text-ink/60 mb-1">Tags</label>
            <TagInput bind:tags={createTags} placeholder="steuerberater, wien … Enter" /></div>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick={() => (showCreateForm = false)} class="px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream transition-colors">Abbrechen</button>
          <button type="submit" class="px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">Erstellen</button>
        </div>
      </form>
    {/if}

    <!-- CRM-Tabelle -->
    {#if data.companies.length === 0}
      <div class="bg-surface rounded-xl border border-line py-16 text-center">
        <Building2 class="w-10 h-10 text-ink/15 mx-auto mb-3" />
        <p class="text-sm font-medium text-ink/50">
          {#if data.q}Keine Ergebnisse für „{data.q}"
          {:else if hasFilter}Keine Firmen für diesen Filter
          {:else}Noch keine Firmen{/if}
        </p>
      </div>
    {:else if companyGroups}
      <div class="space-y-4">
        {#each companyGroups as g (g.tag)}
          <div class="bg-surface rounded-xl border border-line overflow-hidden">
            <button type="button" onclick={() => toggleGroup(g.tag)}
              class="w-full px-4 py-2.5 bg-cream/70 {collapsedGroups.has(g.tag) ? '' : 'border-b border-line'} flex items-center gap-2 text-left hover:bg-cream transition-colors">
              <ChevronDown class="w-3.5 h-3.5 text-ink/40 transition-transform duration-150 {collapsedGroups.has(g.tag) ? '-rotate-90' : ''}" />
              <span class="px-2 py-0.5 rounded-full text-xs font-medium border {g.tag === 'Ohne Tags' ? 'bg-cream text-ink/40 border-line' : tagColor(g.tag)}">{g.tag}</span>
              <span class="text-xs text-ink/40">{g.items.length}</span>
            </button>
            {#if !collapsedGroups.has(g.tag)}
              <div class="overflow-x-auto"><table class="w-full"><tbody class="divide-y divide-line">{#each g.items as company}{@render companyRow(company)}{/each}</tbody></table></div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="bg-surface rounded-xl border border-line overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-line bg-cream/50">
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2">Firma / Website</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden md:table-cell">Details</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden lg:table-cell">Verknüpfte Kontakte</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2">Telefon</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-ink/50">Aktion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">{#each data.companies as company}{@render companyRow(company)}{/each}</tbody>
          </table>
        </div>
      </div>
    {/if}
  {:else}
    <!-- Outreach-Firmen -->
    <ViewTabs seite="firmen-outreach" views={data.views} currentFilter={outreachFilter} onselect={applyOutreachView} />

    <div class="bg-surface rounded-xl border border-line p-3 mb-3">
      <div class="relative max-w-sm">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30" />
        <input type="text" bind:value={outreachSearch} oninput={handleOutreachSearch} placeholder="Firma suchen…"
          class="w-full pl-8 pr-3 py-1 bg-cream border border-line rounded-lg text-xs text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
      </div>
      <div class="mt-2 pt-2 border-t border-line flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <label class="flex items-center gap-1 text-ink/50">
          Sortieren
          <select value={osort} onchange={(e) => setOSort((e.currentTarget as HTMLSelectElement).value as 'name' | 'status' | 'versandt')}
            class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
            <option value="name">Name (A-Z)</option>
            <option value="status">Phase</option>
            <option value="versandt">Zuletzt versandt</option>
          </select>
        </label>
        <label class="flex items-center gap-1 text-ink/50">
          Gruppieren
          <select value={ogroup} onchange={(e) => setOGroup((e.currentTarget as HTMLSelectElement).value as '' | 'status')}
            class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
            <option value="">Keine</option>
            <option value="status">Nach Phase</option>
          </select>
        </label>
        {#if osort !== 'name' || ogroup}
          <button onclick={clearOutreachExtraFilter} class="text-ink/40 hover:text-terracotta transition-colors ml-auto">Filter löschen</button>
        {/if}
      </div>
    </div>

    {#if data.outreachCompanies.length === 0}
      <div class="bg-surface rounded-xl border border-line py-16 text-center">
        <Target class="w-10 h-10 text-ink/15 mx-auto mb-3" />
        <p class="text-sm font-medium text-ink/50">Keine Outreach-Firmen gefunden</p>
      </div>
    {:else if outreachCompanyGroups}
      <div class="space-y-4">
        {#each outreachCompanyGroups as g (g.tag)}
          <div class="bg-surface rounded-xl border border-line overflow-hidden">
            <button type="button" onclick={() => toggleGroup(g.tag)}
              class="w-full px-4 py-2.5 bg-cream/70 {collapsedGroups.has(g.tag) ? '' : 'border-b border-line'} flex items-center gap-2 text-left hover:bg-cream transition-colors">
              <ChevronDown class="w-3.5 h-3.5 text-ink/40 transition-transform duration-150 {collapsedGroups.has(g.tag) ? '-rotate-90' : ''}" />
              <span class="px-2 py-0.5 rounded-full text-xs font-medium border bg-cream text-ink/70 border-line">{g.tag}</span>
              <span class="text-xs text-ink/40">{g.items.length}</span>
            </button>
            {#if !collapsedGroups.has(g.tag)}
              <div class="overflow-x-auto">
                <table class="w-full"><tbody class="divide-y divide-line">{#each g.items as c (c.key)}{@render outreachCompanyRow(c)}{/each}</tbody></table>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="bg-surface rounded-xl border border-line overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-line bg-cream/50">
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2">Firma / Website</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden lg:table-cell">Verknüpfte Kontakte</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2">Outreach-Status</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2">Telefon</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-ink/50">Aktion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              {#each data.outreachCompanies as c (c.key)}{@render outreachCompanyRow(c)}{/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>
