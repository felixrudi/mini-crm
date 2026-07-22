<script lang="ts">
  import type { Contact } from '$lib/types';
  import { openContact, openCompany } from '$lib/detail-panel';
  import X from '@lucide/svelte/icons/x';
  import Search from '@lucide/svelte/icons/search';
  import User from '@lucide/svelte/icons/user';
  import Building2 from '@lucide/svelte/icons/building-2';

  type SearchCompany = {
    id: string;
    name: string;
    website: string | null;
    telefon: string | null;
    ort: string | null;
    notizen: string | null;
  };

  type ResultItem =
    | { kind: 'contact'; data: Contact }
    | { kind: 'company'; data: SearchCompany };

  let { open = $bindable(false) }: { open: boolean } = $props();

  let query = $state('');
  let contacts = $state<Contact[]>([]);
  let companies = $state<SearchCompany[]>([]);
  let selectedIndex = $state(0);
  let loading = $state(false);
  let inputEl: HTMLInputElement;

  let results = $derived<ResultItem[]>([
    ...contacts.map((data) => ({ kind: 'contact' as const, data })),
    ...companies.map((data) => ({ kind: 'company' as const, data }))
  ]);

  $effect(() => {
    if (open && inputEl) {
      setTimeout(() => inputEl?.focus(), 50);
    }
    if (!open) {
      query = '';
      contacts = [];
      companies = [];
      selectedIndex = 0;
    }
  });

  let debounceTimer: ReturnType<typeof setTimeout>;

  function handleInput() {
    clearTimeout(debounceTimer);
    if (!query.trim()) {
      contacts = [];
      companies = [];
      return;
    }
    loading = true;
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          contacts = data.contacts ?? [];
          companies = data.companies ?? [];
          selectedIndex = 0;
        }
      } catch {
        // ignore
      } finally {
        loading = false;
      }
    }, 200);
  }

  function openResult(item: ResultItem) {
    if (item.kind === 'contact') openContact(item.data.id);
    else openCompany(item.data.id);
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, Math.max(results.length - 1, 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) openResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      open = !open;
    }
  }}
/>

{#if open}
  <div
    class="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4"
    onclick={(e) => { if (e.target === e.currentTarget) open = false; }}
  >
    <div class="bg-surface rounded-xl border border-line shadow-2xl w-full max-w-lg overflow-hidden">
      <div class="flex items-center gap-3 px-4 py-3 border-b border-line">
        <Search class="w-4 h-4 text-ink/40 flex-shrink-0" />
        <input
          bind:this={inputEl}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          type="text"
          placeholder="Kontakte & Firmen suchen…"
          class="flex-1 bg-transparent text-base text-ink placeholder-ink/30 focus:outline-none"
        />
        {#if loading}
          <div class="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
        {:else}
          <button onclick={() => open = false} class="text-ink/40 hover:text-ink transition-colors flex-shrink-0">
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>

      {#if results.length > 0}
        <ul class="py-2 max-h-80 overflow-y-auto">
          {#each results as item, i}
            <li>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-cream transition-colors {i === selectedIndex ? 'bg-cream' : ''}"
                onclick={() => openResult(item)}
              >
                {#if item.kind === 'contact'}
                  <div class="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                    <User class="w-4 h-4 text-terracotta" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-ink truncate">{item.data.name}</p>
                    <p class="text-xs text-ink/50 truncate">
                      {item.data.company_name ?? item.data.rolle ?? item.data.email ?? 'Kontakt'}
                    </p>
                  </div>
                  <span class="text-[10px] uppercase tracking-wide text-ink/30 flex-shrink-0">Kontakt</span>
                {:else}
                  <div class="w-8 h-8 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
                    <Building2 class="w-4 h-4 text-sage" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-ink truncate">{item.data.name}</p>
                    <p class="text-xs text-ink/50 truncate">
                      {item.data.ort ?? item.data.website?.replace(/^https?:\/\//, '') ?? item.data.telefon ?? 'Firma'}
                    </p>
                  </div>
                  <span class="text-[10px] uppercase tracking-wide text-ink/30 flex-shrink-0">Firma</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else if query.trim() && !loading}
        <div class="py-8 text-center">
          <p class="text-sm text-ink/40">Keine Treffer für „{query}"</p>
        </div>
      {:else if !query.trim()}
        <div class="py-6 text-center">
          <p class="text-xs text-ink/30 px-4">Tippe um zu suchen<span class="hidden sm:inline"> · ↑↓ navigieren · Enter öffnen · Esc schließen</span></p>
        </div>
      {/if}
    </div>
  </div>
{/if}
