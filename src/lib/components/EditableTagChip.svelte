<script lang="ts">
  import Pencil from '@lucide/svelte/icons/pencil';

  let {
    tag,
    active,
    activeClass,
    inactiveClass,
    onToggle,
    onRename
  }: {
    tag: string;
    active: boolean;
    activeClass: string;
    inactiveClass: string;
    onToggle: () => void;
    onRename: (newTag: string) => Promise<void>;
  } = $props();

  let editing = $state(false);
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
</script>

{#if editing}
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
      class="text-xs text-ink/40 px-0.5 disabled:opacity-40"
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
    <button
      type="button"
      onclick={startEdit}
      title="Tag umbenennen"
      class="absolute -right-1.5 -top-1.5 w-4 h-4 rounded-full bg-surface border border-line flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity hover:border-terracotta hover:text-terracotta text-ink/40"
    >
      <Pencil class="w-2.5 h-2.5" />
    </button>
  </div>
{/if}
