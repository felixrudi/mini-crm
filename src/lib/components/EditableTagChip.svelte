<script lang="ts">
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  let {
    tag,
    active,
    activeClass,
    inactiveClass,
    onToggle,
    onRename,
    onDelete
  }: {
    tag: string;
    active: boolean;
    activeClass: string;
    inactiveClass: string;
    onToggle: () => void;
    onRename: (newTag: string) => Promise<void>;
    onDelete: (tag: string) => Promise<void>;
  } = $props();

  let editing = $state(false);
  let confirmingDelete = $state(false);
  let deleting = $state(false);
  // Wird bei jedem startEdit() frisch aus der aktuellen tag-Prop befüllt —
  // kein $state(tag) hier, das würde nur den Initialwert beim Erstmount
  // einfrieren (Svelte-Warnung state_referenced_locally).
  let value = $state('');
  let saving = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  function startEdit(e: MouseEvent) {
    e.stopPropagation();
    value = tag;
    editing = true;
    queueMicrotask(() => inputEl?.focus());
  }
  function cancel() {
    editing = false;
    value = tag;
  }
  async function confirm() {
    const next = value.trim().toLowerCase();
    if (saving) return;
    if (!next || next === tag) {
      editing = false;
      return;
    }
    saving = true;
    try {
      await onRename(next);
      editing = false;
    } catch {
      // Fehler-Toast kommt vom Aufrufer — Edit-Feld offen lassen, damit nichts verloren geht.
    } finally {
      saving = false;
    }
  }
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  function startDelete(e: MouseEvent) {
    e.stopPropagation();
    confirmingDelete = true;
  }
  function cancelDelete(e: MouseEvent) {
    e.stopPropagation();
    confirmingDelete = false;
  }
  async function confirmDelete(e: MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    deleting = true;
    try {
      await onDelete(tag);
      confirmingDelete = false;
    } catch {
      // Fehler-Toast kommt vom Aufrufer — Bestätigung offen lassen zum erneuten Versuch.
    } finally {
      deleting = false;
    }
  }
</script>

{#if confirmingDelete}
  <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-red-300 bg-red-50 shadow-sm">
    <span class="text-xs text-red-600">„{tag}" löschen?</span>
    <button
      type="button"
      onclick={confirmDelete}
      disabled={deleting}
      title="Ja, löschen"
      class="text-xs text-red-600 font-bold px-0.5 disabled:opacity-40"
    >
      Ja
    </button>
    <button
      type="button"
      onclick={cancelDelete}
      disabled={deleting}
      title="Abbrechen"
      class="text-xs text-ink-soft px-0.5 disabled:opacity-40"
    >
      Nein
    </button>
  </div>
{:else if editing}
  <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-terracotta/40 bg-surface shadow-sm">
    <input
      bind:this={inputEl}
      bind:value
      onkeydown={handleKeydown}
      onclick={(e) => e.stopPropagation()}
      disabled={saving}
      class="w-24 px-1.5 py-0.5 bg-cream border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-terracotta/40"
    />
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        confirm();
      }}
      disabled={saving}
      title="Speichern"
      class="text-xs text-terracotta font-bold px-0.5 disabled:opacity-40"
    >
      ✓
    </button>
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        cancel();
      }}
      disabled={saving}
      title="Abbrechen"
      class="text-xs text-ink-soft px-0.5 disabled:opacity-40"
    >
      ✕
    </button>
  </div>
{:else}
  <div class="relative inline-flex group/chip">
    <button
      type="button"
      onclick={onToggle}
      class="px-2 py-0.5 rounded-full text-xs font-medium border transition-all {active ? activeClass : inactiveClass}"
    >
      {tag}
    </button>
    <span class="absolute -right-2 -top-2 flex items-center gap-0.5 rounded-full bg-surface border border-line shadow-sm opacity-70 hover:opacity-100 transition-opacity">
      <button
        type="button"
        onclick={startEdit}
        title="Tag umbenennen"
        class="w-5 h-5 rounded-full flex items-center justify-center hover:text-terracotta text-ink-soft"
      >
        <Pencil class="w-3 h-3" />
      </button>
      <button
        type="button"
        onclick={startDelete}
        title="Tag löschen"
        class="w-5 h-5 rounded-full flex items-center justify-center hover:text-red-500 text-ink-soft"
      >
        <Trash2 class="w-3 h-3" />
      </button>
    </span>
  </div>
{/if}
