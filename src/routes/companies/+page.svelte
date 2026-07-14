<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from '$lib/toast';
  import type { Company, ViewFilter } from '$lib/types';
  import { groupByTags, tagColor } from '$lib/tags';
  import TagInput from '$lib/components/TagInput.svelte';
  import ViewTabs from '$lib/components/ViewTabs.svelte';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Plus from '@lucide/svelte/icons/plus';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Users from '@lucide/svelte/icons/users';
  import Filter from '@lucide/svelte/icons/filter';

  let { data }: { data: PageData } = $props();

  let showCreateForm = $state(false);
  let editId = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);

  let editName = $state('');
  let editWebsite = $state('');
  let editOrt = $state('');
  let editNotizen = $state('');
  let editTags = $state<string[]>([]);
  let createTags = $state<string[]>([]);

  function startEdit(company: Company) {
    editId = company.id;
    editName = company.name;
    editWebsite = company.website ?? '';
    editOrt = company.ort ?? '';
    editNotizen = company.notizen ?? '';
    editTags = company.tags ?? [];
  }

  function cancelEdit() {
    editId = null;
  }

  // --- Filter, Sortierung, Gruppierung ---
  let selectedTags = $state<string[]>(data.tags ?? []);
  let tagMode = $state<'or' | 'and'>(data.tagMode === 'and' ? 'and' : 'or');
  let ort = $state(data.ort ?? '');
  let sortBy = $state<'name' | 'contacts' | 'tags'>(data.sort ?? 'name');
  let group = $state<'' | 'tags'>(data.group === 'tags' ? 'tags' : '');
  let hasFilter = $derived(selectedTags.length > 0 || ort !== '');

  let currentFilter = $derived<ViewFilter>({
    tags: selectedTags,
    tagMode,
    sort: sortBy,
    ort,
    group
  });

  function updateUrl() {
    const url = new URL($page.url);
    if (selectedTags.length > 0) url.searchParams.set('tags', selectedTags.join(','));
    else url.searchParams.delete('tags');
    if (tagMode === 'and') url.searchParams.set('mode', 'and');
    else url.searchParams.delete('mode');
    if (ort) url.searchParams.set('ort', ort);
    else url.searchParams.delete('ort');
    if (sortBy !== 'name') url.searchParams.set('sort', sortBy);
    else url.searchParams.delete('sort');
    if (group === 'tags') url.searchParams.set('group', 'tags');
    else url.searchParams.delete('group');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  function toggleTag(tag: string) {
    selectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    updateUrl();
  }

  function setTagMode(mode: 'or' | 'and') {
    tagMode = mode;
    updateUrl();
  }

  function setOrt(o: string) {
    ort = o;
    updateUrl();
  }

  function setSort(s: 'name' | 'contacts' | 'tags') {
    sortBy = s;
    updateUrl();
  }

  function setGroup(g: '' | 'tags') {
    group = g;
    updateUrl();
  }

  function clearFilter() {
    selectedTags = [];
    tagMode = 'or';
    ort = '';
    updateUrl();
  }

  function applyView(filter: ViewFilter) {
    selectedTags = filter.tags ?? [];
    tagMode = filter.tagMode === 'and' ? 'and' : 'or';
    ort = filter.ort ?? '';
    sortBy = filter.sort === 'contacts' || filter.sort === 'tags' ? filter.sort : 'name';
    group = filter.group === 'tags' ? 'tags' : '';
    updateUrl();
  }

  let companyGroups = $derived(group === 'tags' ? groupByTags(data.companies, (c) => c.tags ?? []) : null);
</script>

{#snippet companyRow(company: Company)}
  <div class="p-4">
    {#if editId === company.id}
      <form
        method="POST"
        action="?/update"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') { toast.success('Gespeichert'); cancelEdit(); }
            else toast.error('Fehler');
            await update();
          };
        }}
      >
        <input type="hidden" name="id" value={company.id} />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <input name="name" bind:value={editName} required placeholder="Name"
            class="px-2 py-1.5 bg-cream border border-terracotta/40 rounded text-base text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
          <input name="website" bind:value={editWebsite} placeholder="Website"
            class="px-2 py-1.5 bg-cream border border-line rounded text-base text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
          <input name="ort" bind:value={editOrt} placeholder="Ort"
            class="px-2 py-1.5 bg-cream border border-line rounded text-base text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
          <input name="notizen" bind:value={editNotizen} placeholder="Notizen"
            class="px-2 py-1.5 bg-cream border border-line rounded text-base text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
        </div>
        <div class="mb-2">
          <TagInput bind:tags={editTags} placeholder="steuerberater, wien … Enter" />
        </div>
        <div class="flex gap-1.5">
          <button type="submit" class="flex items-center gap-1 px-2.5 py-1 bg-terracotta text-white rounded text-xs font-medium">
            <Check class="w-3 h-3" /> Speichern
          </button>
          <button type="button" onclick={cancelEdit} class="flex items-center gap-1 px-2.5 py-1 border border-line rounded text-xs text-ink/60">
            <X class="w-3 h-3" /> Abbrechen
          </button>
        </div>
      </form>
    {:else}
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
            <Building2 class="w-4 h-4 text-sage" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <a href="/companies/{company.id}" class="text-sm font-medium text-ink hover:text-terracotta transition-colors">{company.name}</a>
              {#if company.contact_count > 0}
                <span class="flex items-center gap-0.5 text-xs text-ink/40">
                  <Users class="w-3 h-3" /> {company.contact_count}
                </span>
              {/if}
              {#each company.tags ?? [] as t}
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium border {tagColor(t)}">{t}</span>
              {/each}
            </div>
            {#if company.website}
              <a href={company.website} target="_blank" rel="noopener"
                class="flex items-center gap-1 text-xs text-terracotta hover:underline mt-0.5">
                <ExternalLink class="w-3 h-3" /> {company.website.replace(/^https?:\/\//, '')}
              </a>
            {/if}
            {#if company.notizen}
              <p class="text-xs text-ink/50 mt-0.5">{company.notizen}</p>
            {/if}
          </div>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button onclick={() => startEdit(company)}
            class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded">
            <Pencil class="w-3.5 h-3.5" />
          </button>
          {#if deleteConfirm === company.id}
            <form method="POST" action="?/delete"
              use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Gelöscht'); deleteConfirm = null; await update(); }}
              class="flex items-center gap-1">
              <input type="hidden" name="id" value={company.id} />
              <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
              <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
            </form>
          {:else}
            <button onclick={() => (deleteConfirm = company.id)}
              class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/snippet}

<div class="p-6 max-w-4xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Firmen</h1>
      <p class="text-sm text-ink/50 mt-1">{data.companies.length} Firmen</p>
    </div>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
    >
      <Plus class="w-4 h-4" />
      Neue Firma
    </button>
  </div>

  <ViewTabs seite="firmen" views={data.views} currentFilter={currentFilter} onselect={applyView} />

  <!-- Filter + Sortierung -->
  <div class="bg-surface rounded-xl border border-line p-4 mb-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-display font-semibold text-sm text-ink flex items-center gap-2">
        <Filter class="w-3.5 h-3.5 text-sage" /> Filter &amp; Sortierung
      </h2>
      {#if hasFilter}
        <button onclick={clearFilter} class="text-xs text-ink/40 hover:text-terracotta transition-colors flex items-center gap-1">
          <X class="w-3 h-3" /> Filter löschen
        </button>
      {/if}
    </div>

    {#if data.allTags.length > 0}
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide">Tags</p>
          {#if selectedTags.length > 1}
            <div class="flex items-center gap-1 text-xs">
              <button type="button" onclick={() => setTagMode('or')}
                class="px-2 py-0.5 rounded-full border transition-colors {tagMode === 'or' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}">ODER</button>
              <button type="button" onclick={() => setTagMode('and')}
                class="px-2 py-0.5 rounded-full border transition-colors {tagMode === 'and' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}">UND</button>
            </div>
          {/if}
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each data.allTags as tag}
            <button type="button" onclick={() => toggleTag(tag)}
              class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all {selectedTags.includes(tag)
                ? tagColor(tag) + ' ring-2 ring-offset-1 ring-terracotta/40'
                : 'bg-cream text-ink/50 border-line hover:border-ink/30'}">
              {tag}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if data.allOrte.length > 0}
      <div class="mb-3">
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Ort</p>
        <select
          value={ort}
          onchange={(e) => setOrt((e.currentTarget as HTMLSelectElement).value)}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="">Alle Orte</option>
          {#each data.allOrte as o}
            <option value={o}>{o}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="flex flex-wrap gap-4">
      <div>
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Sortieren nach</p>
        <select
          value={sortBy}
          onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as 'name' | 'contacts' | 'tags')}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="name">Name (A-Z)</option>
          <option value="contacts">Anzahl Kontakte</option>
          <option value="tags">Anzahl Tags</option>
        </select>
      </div>
      <div>
        <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Gruppieren</p>
        <select
          value={group}
          onchange={(e) => setGroup((e.currentTarget as HTMLSelectElement).value as '' | 'tags')}
          class="px-3 py-1.5 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        >
          <option value="">Keine</option>
          <option value="tags">Nach Tags</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Create form -->
  {#if showCreateForm}
    <form
      method="POST"
      action="?/create"
      class="bg-surface rounded-xl border border-terracotta/30 p-5 mb-6"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            toast.success('Firma erstellt');
            showCreateForm = false;
            createTags = [];
          } else if (result.type === 'failure') {
            toast.error((result.data as any)?.error ?? 'Fehler');
          }
          await update();
        };
      }}
    >
      <h3 class="font-display font-semibold text-base text-ink mb-4">Neue Firma</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1">Name *</label>
          <input name="name" type="text" required placeholder="Firmenname"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Website</label>
          <input name="website" type="url" placeholder="https://..."
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Ort</label>
          <input name="ort" type="text" placeholder="Wien"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Notizen</label>
          <input name="notizen" type="text" placeholder="Optional..."
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1">Tags</label>
          <TagInput bind:tags={createTags} placeholder="steuerberater, wien … Enter" />
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick={() => (showCreateForm = false)}
          class="px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream transition-colors">Abbrechen</button>
        <button type="submit"
          class="px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">Erstellen</button>
      </div>
    </form>
  {/if}

  <!-- List -->
  {#if data.companies.length === 0}
    <div class="bg-surface rounded-xl border border-line py-16 text-center">
      <Building2 class="w-10 h-10 text-ink/15 mx-auto mb-3" />
      <p class="text-sm font-medium text-ink/50">
        {hasFilter ? 'Keine Firmen für diesen Filter' : 'Noch keine Firmen'}
      </p>
      {#if !hasFilter}
        <button
          onclick={() => (showCreateForm = true)}
          class="mt-4 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
        >
          Erste Firma anlegen
        </button>
      {/if}
    </div>
  {:else if companyGroups}
    <div class="space-y-4">
      {#each companyGroups as g (g.tag)}
        <div class="bg-surface rounded-xl border border-line overflow-hidden">
          <div class="px-4 py-2.5 bg-cream/70 border-b border-line flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium border {g.tag === 'Ohne Tags' ? 'bg-cream text-ink/40 border-line' : tagColor(g.tag)}">{g.tag}</span>
            <span class="text-xs text-ink/40">{g.items.length}</span>
          </div>
          <div class="divide-y divide-line">
            {#each g.items as company}
              {@render companyRow(company)}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="bg-surface rounded-xl border border-line overflow-hidden">
      <div class="divide-y divide-line">
        {#each data.companies as company}
          {@render companyRow(company)}
        {/each}
      </div>
    </div>
  {/if}
</div>
