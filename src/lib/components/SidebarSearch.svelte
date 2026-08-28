<script lang="ts">
  import type { Contact } from '$lib/types';
  import { websiteLabel } from '$lib/utils';
  import { openContact, openCompany } from '$lib/detail-panel';
  import Search from '@lucide/svelte/icons/search';
  import User from '@lucide/svelte/icons/user';
  import Building2 from '@lucide/svelte/icons/building-2';
  import X from '@lucide/svelte/icons/x';

  type SearchCompany = {
    id: string;
    name: string;
    website: string | null;
    telefon: string | null;
    ort: string | null;
    notizen: string | null;
  };

  let {
    onnavigate
  }: {
    onnavigate?: () => void;
  } = $props();

  let query = $state('');
  let contacts = $state<Contact[]>([]);
  let companies = $state<SearchCompany[]>([]);
  let loading = $state(false);
  let open = $state(false);
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();
  let rootEl: HTMLDivElement | undefined = $state();
  let debounceTimer: ReturnType<typeof setTimeout>;

  type ResultItem =
    | { kind: 'contact'; data: Contact }
    | { kind: 'company'; data: SearchCompany };

  let results = $derived<ResultItem[]>([
    ...contacts.map((data) => ({ kind: 'contact' as const, data })),
    ...companies.map((data) => ({ kind: 'company' as const, data }))
  ]);

  let showPanel = $derived(open && !!query.trim());

  function runSearch() {
    clearTimeout(debounceTimer);
    const q = query.trim();
    if (!q) {
      contacts = [];
      companies = [];
      loading = false;
      return;
    }
    loading = true;
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
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

  function handleInput() {
    open = true;
    runSearch();
  }

  function clear() {
    query = '';
    contacts = [];
    companies = [];
    selectedIndex = 0;
    inputEl?.focus();
  }

  function openResult(item: ResultItem) {
    if (item.kind === 'contact') openContact(item.data.id);
    else openCompany(item.data.id);
    query = '';
    contacts = [];
    companies = [];
    open = false;
    onnavigate?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, Math.max(results.length - 1, 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) openResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (query) clear();
      else {
        open = false;
        inputEl?.blur();
      }
    }
  }

  function onDocPointer(e: PointerEvent) {
    if (!rootEl) return;
    if (!rootEl.contains(e.target as Node)) open = false;
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  });
</script>

<div class="relative" bind:this={rootEl}>
  <div class="relative">
    <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/35 pointer-events-none" />
    <input
      bind:this={inputEl}
      bind:value={query}
      oninput={handleInput}
      onfocus={() => (open = true)}
      onkeydown={handleKeydown}
      type="search"
      placeholder="Suchen…"
      autocomplete="off"
      class="w-full pl-8 pr-8 py-1.5 bg-cream border border-line rounded-lg text-xs text-ink placeholder-ink/35 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
    />
    {#if query}
      <button
        type="button"
        onclick={clear}
        class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink/35 hover:text-ink"
        aria-label="Suche leeren"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    {:else if loading}
      <div class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-terracotta border-t-transparent rounded-full animate-spin"></div>
    {/if}
  </div>

  {#if showPanel}
    <div class="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-line rounded-lg shadow-xl max-h-80 overflow-y-auto">
      {#if loading && results.length === 0}
        <div class="py-4 text-center">
          <div class="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      {:else if results.length === 0}
        <p class="px-3 py-3 text-xs text-ink/40">Keine Treffer für „{query.trim()}"</p>
      {:else}
        <ul class="py-1">
          {#each results as item, i}
            <li>
              <button
                type="button"
                class="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-cream transition-colors {i === selectedIndex ? 'bg-cream' : ''}"
                onmouseenter={() => (selectedIndex = i)}
                onclick={() => openResult(item)}
              >
                {#if item.kind === 'contact'}
                  <div class="w-7 h-7 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                    <User class="w-3.5 h-3.5 text-terracotta" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium text-ink truncate">{item.data.name}</p>
                    <p class="text-[10px] text-ink/40 truncate">
                      {item.data.company_name ?? item.data.rolle ?? item.data.email ?? 'Kontakt'}
                    </p>
                  </div>
                {:else}
                  <div class="w-7 h-7 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
                    <Building2 class="w-3.5 h-3.5 text-sage" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium text-ink truncate">{item.data.name}</p>
                    <p class="text-[10px] text-ink/40 truncate">
                      {item.data.ort ?? (item.data.website ? websiteLabel(item.data.website) : null) ?? item.data.telefon ?? 'Firma'}
                    </p>
                  </div>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
