<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { openContact } from '$lib/detail-panel';
  import ContactForm from '$lib/components/ContactForm.svelte';
  import ViewTabs from '$lib/components/ViewTabs.svelte';
  import EditableTagChip from '$lib/components/EditableTagChip.svelte';
  import { groupByTags, tagColor, DEFAULT_TAGS_EXCLUDE } from '$lib/tags';
  import type { Contact, Prospect, ProspectStatus, ViewFilter } from '$lib/types';
  import Users from '@lucide/svelte/icons/users';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Mail from '@lucide/svelte/icons/mail';
  import Phone from '@lucide/svelte/icons/phone';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Target from '@lucide/svelte/icons/target';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';

  let { data }: { data: PageData } = $props();

  let showForm = $state(false);
  let editContact = $state<Contact | null>(null);
  let searchValue = $state(data.q ?? '');
  let prospectSearch = $state(data.pq ?? '');
  let deleteConfirm = $state<string | null>(null);
  let photoCache = $state<Record<string, string>>({});
  let avatarUploadId = $state<string | null>(null);
  let avatarFileInput: HTMLInputElement;

  let debounceTimer: ReturnType<typeof setTimeout>;

  // --- Tab (Mein Netzwerk / Outreach-Marketing) ---
  let activeDb = $state(data.db);
  function setDb(db: 'crm' | 'outreach') {
    activeDb = db;
    const url = new URL($page.url);
    if (db === 'outreach') url.searchParams.set('db', 'outreach');
    else url.searchParams.delete('db');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  const STATUS_LABELS: Record<ProspectStatus, string> = {
    gesendet: 'Gesendet',
    geantwortet: 'Geantwortet',
    termin: 'Termin',
    kein_interesse: 'Kein Interesse',
    bounce: 'Bounce',
    abgesagt: 'Abgesagt'
  };
  const STATUS_COLORS: Record<ProspectStatus, string> = {
    gesendet: 'bg-blue-50 text-blue-600 border-blue-200',
    geantwortet: 'bg-amber-50 text-amber-600 border-amber-200',
    termin: 'bg-green-50 text-green-700 border-green-200',
    kein_interesse: 'bg-ink/5 text-ink/40 border-line',
    bounce: 'bg-red-50 text-red-500 border-red-200',
    abgesagt: 'bg-ink/5 text-ink/40 border-line'
  };

  // --- CRM-Filter, Sortierung, Gruppierung (bestehende Funktion, in "Mehr Filter") ---
  let selectedTags = $state<string[]>(data.tags ?? []);
  let excludedTags = $state<string[]>(data.tagsExclude ?? []);
  let tagMode = $state<'or' | 'and'>(data.tagMode === 'and' ? 'and' : 'or');
  let ort = $state(data.ort ?? '');
  let sortBy = $state<'name' | 'company' | 'tags'>(data.sort ?? 'name');
  let group = $state<'' | 'tags'>(data.group === 'tags' ? 'tags' : '');
  // „Filter aktiv“ nur wenn mehr als der Standard-Archiv-Ausschluss gesetzt ist
  let hasTagFilter = $derived(
    selectedTags.length > 0 ||
      ort !== '' ||
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

  let currentFilter = $derived<ViewFilter>({ tags: selectedTags, tagsExclude: excludedTags, tagMode, sort: sortBy, ort, group });

  function updateUrl() {
    const url = new URL($page.url);
    if (selectedTags.length > 0) url.searchParams.set('tags', selectedTags.join(','));
    else url.searchParams.delete('tags');
    url.searchParams.delete('tag');
    // Immer setzen: leer = bewusst alle inkl. Archiv; Default archiv kommt nur wenn Param fehlt
    url.searchParams.set('tagsExclude', excludedTags.join(','));
    if (tagMode === 'and') url.searchParams.set('mode', 'and');
    else url.searchParams.delete('mode');
    if (sortBy !== 'name') url.searchParams.set('sort', sortBy);
    else url.searchParams.delete('sort');
    if (ort) url.searchParams.set('ort', ort);
    else url.searchParams.delete('ort');
    if (group === 'tags') url.searchParams.set('group', 'tags');
    else url.searchParams.delete('group');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true, invalidateAll: true });
  }

  // Bulk-Rename eines Tags über alle CRM-Kontakte (Tags sind reine Strings,
  // dupliziert je Record — kein eigenes Tag-Objekt). War der alte Name gerade
  // als Include- oder Exclude-Filter aktiv, wird er im Filter-State durch den
  // neuen ersetzt, damit die Ansicht nicht plötzlich leer/falsch wirkt.
  async function renameTag(oldTag: string, newTag: string) {
    const fd = new FormData();
    fd.append('oldTag', oldTag);
    fd.append('newTag', newTag);
    // x-sveltekit-action: /contacts hat zusätzlich zu +page.server.ts auch ein
    // +server.ts (GET-JSON für die CommandPalette-Suche) auf derselben Route —
    // ohne diesen Header (den use:enhance normalerweise automatisch setzt)
    // würde SvelteKit den POST an das GET-only +server.ts routen -> 405.
    const res = await fetch('?/rename_tag', {
      method: 'POST',
      body: fd,
      headers: { 'x-sveltekit-action': 'true' }
    });
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
    // Ein Tag kann nicht gleichzeitig ein- und ausgeschlossen sein.
    if (excludedTags.includes(tag)) excludedTags = excludedTags.filter((t) => t !== tag);
    updateUrl();
  }
  function toggleExcludeTag(tag: string) {
    excludedTags = excludedTags.includes(tag) ? excludedTags.filter((t) => t !== tag) : [...excludedTags, tag];
    if (selectedTags.includes(tag)) selectedTags = selectedTags.filter((t) => t !== tag);
    updateUrl();
  }
  function setTagMode(mode: 'or' | 'and') { tagMode = mode; updateUrl(); }
  function setSort(s: 'name' | 'company' | 'tags') { sortBy = s; updateUrl(); }
  function setOrt(o: string) { ort = o; updateUrl(); }
  function setGroup(g: '' | 'tags') { group = g; updateUrl(); }
  function clearTagFilter() {
    selectedTags = [];
    excludedTags = [...DEFAULT_TAGS_EXCLUDE];
    tagMode = 'or';
    ort = '';
    updateUrl();
  }
  function applyView(filter: ViewFilter) {
    selectedTags = filter.tags ?? [];
    // Gespeicherte Ansicht ohne tagsExclude → Default (ohne Archiv)
    excludedTags = filter.tagsExclude !== undefined ? (filter.tagsExclude ?? []) : [...DEFAULT_TAGS_EXCLUDE];
    tagMode = filter.tagMode === 'and' ? 'and' : 'or';
    sortBy = filter.sort === 'company' || filter.sort === 'tags' ? filter.sort : 'name';
    ort = filter.ort ?? '';
    group = filter.group === 'tags' ? 'tags' : '';
    updateUrl();
  }

  let contactGroups = $derived(group === 'tags' ? groupByTags(data.contacts, (c) => c.tags ?? []) : null);

  // --- Outreach-Marketing Filter ---
  // Prospects haben kein Tags-/Ort-Feld in Teable — Gruppierung läuft hier
  // daher über die Outreach-Phase (Status) statt über Tags, sonst gleiches
  // Muster wie beim CRM-Tab (gleiche groupByTags-Funktion, gleiche UI).
  let pstatus = $state(data.pstatus ?? '');
  let psort = $state<'versandt' | 'name' | 'status'>(data.psort ?? 'versandt');
  let pgroup = $state<'' | 'status'>(data.pgroup === 'status' ? 'status' : '');
  let outreachFilter = $derived<ViewFilter>({ pstatus, psort, pgroup });

  function updateOutreachUrl() {
    const url = new URL($page.url);
    if (pstatus) url.searchParams.set('pstatus', pstatus);
    else url.searchParams.delete('pstatus');
    if (psort !== 'versandt') url.searchParams.set('psort', psort);
    else url.searchParams.delete('psort');
    if (pgroup === 'status') url.searchParams.set('pgroup', 'status');
    else url.searchParams.delete('pgroup');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true, invalidateAll: true });
  }
  function setPStatus(s: string) { pstatus = s; updateOutreachUrl(); }
  function setPSort(s: 'versandt' | 'name' | 'status') { psort = s; updateOutreachUrl(); }
  function setPGroup(g: '' | 'status') { pgroup = g; updateOutreachUrl(); }
  function clearOutreachFilter() { pstatus = ''; psort = 'versandt'; pgroup = ''; updateOutreachUrl(); }
  function applyOutreachView(filter: ViewFilter) {
    pstatus = filter.pstatus ?? '';
    psort = filter.psort === 'name' || filter.psort === 'status' ? filter.psort : 'versandt';
    pgroup = filter.pgroup === 'status' ? 'status' : '';
    updateOutreachUrl();
  }

  const PSTATUS_GROUP_LABEL = (status: string) => STATUS_LABELS[status as ProspectStatus] ?? status ?? 'Unbekannt';
  let prospectGroups = $derived(pgroup === 'status' ? groupByTags(data.prospects, (p) => [PSTATUS_GROUP_LABEL(p.status)]) : null);

  function handleProspectSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = new URL($page.url);
      if (prospectSearch.trim()) url.searchParams.set('pq', prospectSearch.trim());
      else url.searchParams.delete('pq');
      goto(url.toString(), { replaceState: true });
    }, 300);
  }

  async function quickFollowup(prospectId: string) {
    const followup = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fd = new FormData();
    fd.append('id', prospectId);
    fd.append('followup_am', followup);
    const res = await fetch('/prospects?/set_followup', { method: 'POST', body: fd });
    if (res.ok) {
      toast.success('Wiedervorlage in 3 Tagen gesetzt');
      goto($page.url.toString(), { invalidateAll: true });
    } else {
      toast.error('Fehler');
    }
  }

  async function handleAvatarChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !avatarUploadId) return;
    const targetId = avatarUploadId;
    avatarUploadId = null;
    const resized = await resizeImage(file, 400);
    const fd = new FormData();
    fd.append('image', resized, 'photo.jpg');
    const res = await fetch(`/api/contacts/${targetId}/photo`, { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      photoCache[targetId] = d.photo;
      toast.success('Foto gespeichert');
    } else {
      toast.error('Upload fehlgeschlagen');
    }
    (e.target as HTMLInputElement).value = '';
  }

  function resizeImage(file: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  }

  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = new URL($page.url);
      if (searchValue.trim()) url.searchParams.set('q', searchValue.trim());
      else url.searchParams.delete('q');
      goto(url.toString(), { replaceState: true });
    }, 300);
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
</script>

{#snippet avatar(name: string, photo?: string | null)}
  <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-terracotta/10 flex items-center justify-center">
    {#if photo}
      <img src={photo} alt="" class="w-full h-full object-cover" />
    {:else}
      <span class="text-xs font-semibold text-terracotta">{name?.charAt(0)?.toUpperCase()}</span>
    {/if}
  </div>
{/snippet}

{#snippet contactRow(contact: Contact & { last_activity: string | null })}
  <tr class="hover:bg-cream/50 transition-colors">
    <td class="px-3 py-2">
      <div class="flex items-center gap-3">
        <button type="button" title="Foto hinzufügen"
          onclick={() => { avatarUploadId = contact.id; avatarFileInput.click(); }}
          class="rounded-full cursor-pointer hover:ring-2 hover:ring-terracotta/40 transition-all">
          {@render avatar(contact.name, contact.photo || photoCache[contact.id])}
        </button>
        <div class="min-w-0">
          <a href="/contacts/{contact.id}" onclick={(e) => { e.preventDefault(); openContact(contact.id); }} class="text-sm font-medium text-ink hover:text-terracotta transition-colors block truncate">{contact.name}</a>
          <span class="text-xs text-ink/40 truncate block">{contact.company_name ?? '—'}</span>
        </div>
      </div>
    </td>
    <td class="px-3 py-2 hidden md:table-cell">
      <span class="text-sm text-ink/60 font-mono">{contact.rolle ?? '—'}</span>
    </td>
    <td class="px-3 py-2 hidden lg:table-cell">
      <div class="flex flex-wrap gap-1">
        {#each contact.tags ?? [] as t}
          <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cream text-ink/70">{t}</span>
        {/each}
        {#if !contact.tags?.length}<span class="text-ink/20 text-xs">—</span>{/if}
      </div>
    </td>
    <td class="px-3 py-2 hidden lg:table-cell">
      <span class="text-xs text-ink/50">{formatDate(contact.last_activity)}</span>
    </td>
    <td class="px-3 py-2">
      <div class="flex items-center justify-end gap-1.5">
        {#if contact.telefon}
          <a href="tel:{contact.telefon}" class="px-2 py-1 border border-line rounded text-xs font-mono font-bold text-terracotta hover:bg-cream transition-colors whitespace-nowrap">
            📞 {contact.telefon}
          </a>
        {/if}
        <button onclick={() => { editContact = contact; showForm = true; }} class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded" title="Bearbeiten">
          <Pencil class="w-3.5 h-3.5" />
        </button>
        {#if deleteConfirm === contact.id}
          <form method="POST" action="?/delete" use:enhance={() => async ({ result, update }) => {
            if (result.type === 'success') toast.success('Kontakt gelöscht'); else toast.error('Fehler');
            deleteConfirm = null; await update();
          }} class="flex items-center gap-1">
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
            <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
          </form>
        {:else}
          <button onclick={() => (deleteConfirm = contact.id)} class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded" title="Löschen">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </td>
  </tr>
{/snippet}

{#snippet prospectRow(p: Prospect)}
  <tr class="hover:bg-cream/50 transition-colors">
    <td class="px-3 py-2">
      <div class="flex items-center gap-3">
        {@render avatar(p.name)}
        <div class="min-w-0">
          <span class="text-sm font-medium text-ink block truncate">{p.name}</span>
          <span class="text-xs text-ink/40 truncate block">{p.company_name ?? p.firma ?? '—'}</span>
        </div>
      </div>
    </td>
    <td class="px-3 py-2 hidden md:table-cell">
      <span class="text-sm text-ink/60 font-mono">{p.rolle ?? '—'}</span>
    </td>
    <td class="px-3 py-2 hidden lg:table-cell">
      <span class="text-ink/20 text-xs">—</span>
    </td>
    <td class="px-3 py-2">
      <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border {STATUS_COLORS[p.status as ProspectStatus] ?? 'bg-ink/5 text-ink/40 border-line'}">{STATUS_LABELS[p.status as ProspectStatus] ?? (p.status || '—')}</span>
      {#if p.kanal}<span class="text-[10px] text-ink/40 block mt-0.5">via {p.kanal}</span>{/if}
    </td>
    <td class="px-3 py-2 hidden lg:table-cell">
      <span class="text-xs text-ink/50">{formatDate(p.versandt_am)}</span>
    </td>
    <td class="px-3 py-2">
      <div class="flex items-center justify-end gap-1.5">
        {#if p.email}
          <a href="mailto:{p.email}" class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded" title="Mail an {p.email}">
            <Mail class="w-3.5 h-3.5" />
          </a>
        {/if}
        <button onclick={() => quickFollowup(p.id)} class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded" title="Wiedervorlage in 3 Tagen">
          <CalendarClock class="w-3.5 h-3.5" />
        </button>
        <a href="/prospects?edit={p.id}" class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded" title="Bearbeiten">
          <Pencil class="w-3.5 h-3.5" />
        </a>
        {#if deleteConfirm === p.id}
          <form method="POST" action="/prospects?/delete" use:enhance={() => async ({ result, update }) => {
            if (result.type === 'success') { toast.success('Gelöscht'); goto($page.url.toString(), { invalidateAll: true }); }
            else toast.error('Fehler');
            deleteConfirm = null; await update();
          }} class="flex items-center gap-1">
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
            <button type="button" onclick={() => (deleteConfirm = null)} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
          </form>
        {:else}
          <button onclick={() => (deleteConfirm = p.id)} class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded" title="Löschen">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </td>
  </tr>
{/snippet}

<div class="px-4 py-4 md:px-6 md:py-6 max-w-[1400px] mx-auto overflow-x-hidden">
  <div class="flex items-start justify-between mb-4 flex-wrap gap-3">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">
        Kontakte ({activeDb === 'crm' ? 'Mein Netzwerk' : 'Outreach-Marketing'})
      </h1>
      <div class="flex gap-1.5 mt-2.5 bg-cream p-1 rounded-lg w-fit">
        <button onclick={() => setDb('crm')}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors {activeDb === 'crm' ? 'bg-surface text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}">
          <Users class="w-3.5 h-3.5" /> Mein Netzwerk (CRM)
        </button>
        <button onclick={() => setDb('outreach')}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors {activeDb === 'outreach' ? 'bg-surface text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}">
          <Target class="w-3.5 h-3.5" /> Outreach-Marketing (DB)
        </button>
      </div>
    </div>
    {#if activeDb === 'crm'}
      <button onclick={() => { editContact = null; showForm = true; }}
        class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
        <Plus class="w-4 h-4" /> Neuer Kontakt
      </button>
    {:else}
      <a href="/prospects?new=1" class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
        <Plus class="w-4 h-4" /> Neuer Prospect
      </a>
    {/if}
  </div>

  <!-- Ansichten — immer sichtbar, dünn -->
  {#if activeDb === 'crm'}
    <ViewTabs seite="kontakte" views={data.views} currentFilter={currentFilter} onselect={applyView} />
  {:else}
    <ViewTabs seite="kontakte-outreach" views={data.views} currentFilter={outreachFilter} onselect={applyOutreachView} />
  {/if}

  <!-- Schlanke Filterleiste (1:1 Mockup) -->
  <div class="bg-surface rounded-xl border border-line p-3 mb-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <p class="text-[11px] font-bold text-ink/40 uppercase tracking-wide mb-1">🔍 Live-Suche</p>
        {#if activeDb === 'crm'}
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30" />
            <input type="text" bind:value={searchValue} oninput={handleSearch} placeholder="Name, Firma oder Rolle…"
              class="w-full pl-8 pr-3 py-1 bg-cream border border-line rounded-lg text-xs text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
        {:else}
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30" />
            <input type="text" bind:value={prospectSearch} oninput={handleProspectSearch} placeholder="Name, E-Mail oder Firma…"
              class="w-full pl-8 pr-3 py-1 bg-cream border border-line rounded-lg text-xs text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
        {/if}
      </div>
      {#if activeDb === 'crm'}
        <div>
          <p class="text-[11px] font-bold text-ink/40 uppercase tracking-wide mb-1">🏷 Tags (Mehrfachauswahl)</p>
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
          {#if data.allTags.length > 0}
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
        </div>
      {:else}
        <div>
          <p class="text-[11px] font-bold text-ink/40 uppercase tracking-wide mb-1">🎯 Outreach-Phase</p>
          <select value={data.pstatus} onchange={(e) => setPStatus((e.currentTarget as HTMLSelectElement).value)}
            class="px-2 py-1 bg-cream border border-line rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta">
            <option value="">Alle Phasen</option>
            {#each Object.entries(STATUS_LABELS) as [val, label]}
              <option value={val}>{label}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <!-- Sortierung/Gruppierung/Ort — dünne, immer sichtbare Zeile -->
    {#if activeDb === 'crm'}
      <div class="mt-2 pt-2 border-t border-line flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <label class="flex items-center gap-1 text-ink/50">
          Sortieren
          <select value={sortBy} onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as 'name' | 'company' | 'tags')}
            class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
            <option value="name">Name (A-Z)</option>
            <option value="company">Firma (A-Z)</option>
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
        {#if selectedTags.length > 1}
          <div class="flex items-center gap-1">
            <button type="button" onclick={() => setTagMode('or')} class="px-1.5 py-0.5 rounded-full border transition-colors {tagMode === 'or' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}">ODER</button>
            <button type="button" onclick={() => setTagMode('and')} class="px-1.5 py-0.5 rounded-full border transition-colors {tagMode === 'and' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/50 hover:border-ink/30'}">UND</button>
          </div>
        {/if}
        {#if hasTagFilter}
          <button onclick={clearTagFilter} class="text-ink/40 hover:text-terracotta transition-colors ml-auto">Filter löschen</button>
        {/if}
      </div>
    {:else}
      <div class="mt-2 pt-2 border-t border-line flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <label class="flex items-center gap-1 text-ink/50">
          Sortieren
          <select value={psort} onchange={(e) => setPSort((e.currentTarget as HTMLSelectElement).value as 'versandt' | 'name' | 'status')}
            class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
            <option value="versandt">Zuletzt versandt</option>
            <option value="name">Name (A-Z)</option>
            <option value="status">Phase</option>
          </select>
        </label>
        <label class="flex items-center gap-1 text-ink/50">
          Gruppieren
          <select value={pgroup} onchange={(e) => setPGroup((e.currentTarget as HTMLSelectElement).value as '' | 'status')}
            class="px-1.5 py-0.5 bg-cream border border-line rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40">
            <option value="">Keine</option>
            <option value="status">Nach Phase</option>
          </select>
        </label>
        {#if pstatus || pgroup}
          <button onclick={clearOutreachFilter} class="text-ink/40 hover:text-terracotta transition-colors ml-auto">Filter löschen</button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Tabelle -->
  {#if activeDb === 'crm'}
    {#if data.contacts.length === 0}
      <div class="bg-surface rounded-xl border border-line py-16 text-center">
        <Users class="w-10 h-10 text-ink/15 mx-auto mb-3" />
        <p class="text-sm font-medium text-ink/50">{data.q ? `Keine Ergebnisse für „${data.q}"` : 'Noch keine Kontakte'}</p>
      </div>
    {:else if contactGroups}
      <div class="space-y-4">
        {#each contactGroups as g (g.tag)}
          <div class="bg-surface rounded-xl border border-line overflow-hidden">
            <button type="button" onclick={() => toggleGroup(g.tag)}
              class="w-full px-4 py-2.5 bg-cream/70 {collapsedGroups.has(g.tag) ? '' : 'border-b border-line'} flex items-center gap-2 text-left hover:bg-cream transition-colors">
              <ChevronDown class="w-3.5 h-3.5 text-ink/40 transition-transform duration-150 {collapsedGroups.has(g.tag) ? '-rotate-90' : ''}" />
              <span class="px-2 py-0.5 rounded-full text-xs font-medium border {g.tag === 'Ohne Tags' ? 'bg-cream text-ink/40 border-line' : tagColor(g.tag)}">{g.tag}</span>
              <span class="text-xs text-ink/40">{g.items.length}</span>
            </button>
            {#if !collapsedGroups.has(g.tag)}
              <div class="overflow-x-auto">
                <table class="w-full table-fixed"><tbody class="divide-y divide-line">{#each g.items as contact}{@render contactRow(contact)}{/each}</tbody></table>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="bg-surface rounded-xl border border-line overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full table-fixed">
            <thead>
              <tr class="border-b border-line bg-cream/50">
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2">Name / Details</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden md:table-cell w-[22%]">Rolle</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden lg:table-cell w-[18%]">Tags</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden lg:table-cell">Letzte Info / Kontakt</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-ink/50 w-[76px]">Aktion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              {#each data.contacts as contact}{@render contactRow(contact)}{/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {:else}
    {#if data.prospects.length === 0}
      <div class="bg-surface rounded-xl border border-line py-16 text-center">
        <Target class="w-10 h-10 text-ink/15 mx-auto mb-3" />
        <p class="text-sm font-medium text-ink/50">{data.pq ? `Keine Treffer für „${data.pq}"` : 'Noch keine Outreach-Kontakte'}</p>
      </div>
    {:else if prospectGroups}
      <div class="space-y-4">
        {#each prospectGroups as g (g.tag)}
          <div class="bg-surface rounded-xl border border-line overflow-hidden">
            <button type="button" onclick={() => toggleGroup(g.tag)}
              class="w-full px-4 py-2.5 bg-cream/70 {collapsedGroups.has(g.tag) ? '' : 'border-b border-line'} flex items-center gap-2 text-left hover:bg-cream transition-colors">
              <ChevronDown class="w-3.5 h-3.5 text-ink/40 transition-transform duration-150 {collapsedGroups.has(g.tag) ? '-rotate-90' : ''}" />
              <span class="px-2 py-0.5 rounded-full text-xs font-medium border bg-cream text-ink/70 border-line">{g.tag}</span>
              <span class="text-xs text-ink/40">{g.items.length}</span>
            </button>
            {#if !collapsedGroups.has(g.tag)}
              <div class="overflow-x-auto">
                <table class="w-full table-fixed"><tbody class="divide-y divide-line">{#each g.items as p}{@render prospectRow(p)}{/each}</tbody></table>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="bg-surface rounded-xl border border-line overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full table-fixed">
            <thead>
              <tr class="border-b border-line bg-cream/50">
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2">Name / Details</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden md:table-cell w-[22%]">Rolle</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden lg:table-cell w-[18%]">Tags</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 w-[132px] hidden sm:table-cell">Outreach-Phase &amp; Letzte Interaktion</th>
                <th class="text-left text-xs font-medium text-ink/50 px-3 py-2 hidden lg:table-cell">Letzte Info / Kontakt</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-ink/50 w-[76px]">Aktion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              {#each data.prospects as p}{@render prospectRow(p)}{/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>

<input bind:this={avatarFileInput} type="file" accept="image/*" capture="environment" class="hidden" onchange={handleAvatarChange} />

{#if showForm}
  <ContactForm
    contact={editContact}
    companies={data.companies}
    action={editContact ? '?/update' : '?/create'}
    onclose={() => (showForm = false)}
    onsuccess={() => { showForm = false; goto($page.url.toString(), { invalidateAll: true }); }}
  />
{/if}
