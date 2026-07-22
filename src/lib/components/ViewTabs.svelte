<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/toast';
  import type { SavedView, ViewFilter, Seite } from '$lib/types';
  import { filtersEqual, isDefaultFilter, defaultListFilter } from '$lib/views';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import X from '@lucide/svelte/icons/x';

  let {
    seite,
    views,
    currentFilter,
    onselect
  }: {
    seite: Seite;
    views: SavedView[];
    currentFilter: ViewFilter;
    onselect: (filter: ViewFilter) => void;
  } = $props();

  let saving = $state(false);
  let newName = $state('');
  let renaming = $state<string | null>(null);
  let renameValue = $state('');
  let deleteConfirm = $state<string | null>(null);

  async function saveCurrentAsView() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seite, name, filter: currentFilter })
    });
    if (res.ok) {
      toast.success(`Ansicht „${name}" gespeichert`);
      newName = '';
      saving = false;
      await invalidateAll();
    } else {
      toast.error('Ansicht konnte nicht gespeichert werden');
    }
  }

  async function confirmRename(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    const res = await fetch('/api/views', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name })
    });
    if (res.ok) {
      toast.success('Umbenannt');
      renaming = null;
      await invalidateAll();
    } else {
      toast.error('Umbenennen fehlgeschlagen');
    }
  }

  async function confirmDelete(id: string) {
    const res = await fetch('/api/views', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      toast.success('Ansicht gelöscht');
      deleteConfirm = null;
      await invalidateAll();
    } else {
      toast.error('Löschen fehlgeschlagen');
    }
  }
</script>

<div class="flex flex-wrap items-center gap-1 mb-2">
  <button
    type="button"
    onclick={() => onselect(defaultListFilter(seite))}
    class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors {isDefaultFilter(currentFilter, seite)
      ? 'bg-terracotta text-white border-terracotta'
      : 'bg-surface text-ink/60 border-line hover:border-ink/30'}"
  >
    {seite === 'kontakte-outreach' || seite === 'firmen-outreach' ? 'Alle' : 'Aktuell'}
  </button>

  {#each views as view (view.id)}
    {#if renaming === view.id}
      <div class="flex items-center gap-1">
        <input
          bind:value={renameValue}
          onkeydown={(e) => e.key === 'Enter' && confirmRename(view.id)}
          class="px-1.5 py-0.5 bg-cream border border-terracotta/40 rounded-full text-xs w-28"
        />
        <button type="button" onclick={() => confirmRename(view.id)} class="text-xs text-terracotta">✓</button>
        <button type="button" onclick={() => (renaming = null)} class="text-xs text-ink/40">✕</button>
      </div>
    {:else if deleteConfirm === view.id}
      <div class="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs">
        <span>„{view.name}" löschen?</span>
        <button type="button" onclick={() => confirmDelete(view.id)} class="text-red-600 font-medium">Ja</button>
        <button type="button" onclick={() => (deleteConfirm = null)} class="text-ink/40">Nein</button>
      </div>
    {:else}
      <div class="group relative flex items-center">
        <button
          type="button"
          onclick={() => onselect(view.filter)}
          class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors {filtersEqual(currentFilter, view.filter)
            ? 'bg-terracotta text-white border-terracotta'
            : 'bg-surface text-ink/60 border-line hover:border-ink/30'}"
        >
          {view.name}
        </button>
        <span class="hidden group-hover:flex items-center gap-0.5 absolute -right-1 -top-1 bg-surface rounded-full border border-line shadow-sm">
          <button type="button" title="Umbenennen" onclick={() => { renaming = view.id; renameValue = view.name; }} class="p-0.5 text-ink/40 hover:text-terracotta">
            <Pencil class="w-2.5 h-2.5" />
          </button>
          <button type="button" title="Löschen" onclick={() => (deleteConfirm = view.id)} class="p-0.5 text-ink/40 hover:text-red-500">
            <Trash2 class="w-2.5 h-2.5" />
          </button>
        </span>
      </div>
    {/if}
  {/each}

  {#if saving}
    <div class="flex items-center gap-1">
      <input
        bind:value={newName}
        onkeydown={(e) => e.key === 'Enter' && saveCurrentAsView()}
        placeholder="Name der Ansicht"
        class="px-1.5 py-0.5 bg-cream border border-terracotta/40 rounded-full text-xs w-32"
      />
      <button type="button" onclick={saveCurrentAsView} class="text-xs text-terracotta">✓</button>
      <button type="button" onclick={() => (saving = false)} class="text-xs text-ink/40"><X class="w-3 h-3" /></button>
    </div>
  {:else}
    <button
      type="button"
      onclick={() => (saving = true)}
      class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-line text-ink/40 hover:border-terracotta hover:text-terracotta transition-colors"
    >
      <Plus class="w-3 h-3" /> Ansicht speichern
    </button>
  {/if}
</div>
