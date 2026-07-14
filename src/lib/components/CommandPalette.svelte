<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Contact } from '$lib/types';
  import X from '@lucide/svelte/icons/x';
  import Search from '@lucide/svelte/icons/search';
  import User from '@lucide/svelte/icons/user';
  import Building2 from '@lucide/svelte/icons/building-2';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let query = $state('');
  let results = $state<Contact[]>([]);
  let selectedIndex = $state(0);
  let loading = $state(false);
  let inputEl: HTMLInputElement;

  $effect(() => {
    if (open && inputEl) {
      setTimeout(() => inputEl?.focus(), 50);
    }
    if (!open) {
      query = '';
      results = [];
      selectedIndex = 0;
    }
  });

  let debounceTimer: ReturnType<typeof setTimeout>;

  function handleInput() {
    clearTimeout(debounceTimer);
    if (!query.trim()) {
      results = [];
      return;
    }
    loading = true;
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          results = data.contacts ?? [];
          selectedIndex = 0;
        }
      } catch {
        // ignore
      } finally {
        loading = false;
      }
    }, 200);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) {
        goto(`/contacts/${results[selectedIndex].id}`);
        open = false;
      }
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  function selectContact(contact: Contact) {
    goto(`/contacts/${contact.id}`);
    open = false;
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
          placeholder="Kontakt suchen..."
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
        <ul class="py-2 max-h-72 overflow-y-auto">
          {#each results as contact, i}
            <li>
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-cream transition-colors {i === selectedIndex ? 'bg-cream' : ''}"
                onclick={() => selectContact(contact)}
              >
                <div class="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                  <User class="w-4 h-4 text-terracotta" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink truncate">{contact.name}</p>
                  {#if contact.company_name}
                    <p class="text-xs text-ink/50 flex items-center gap-1 truncate">
                      <Building2 class="w-3 h-3" />
                      {contact.company_name}
                    </p>
                  {/if}
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {:else if query.trim() && !loading}
        <div class="py-8 text-center">
          <p class="text-sm text-ink/40">Keine Kontakte gefunden für „{query}"</p>
        </div>
      {:else if !query.trim()}
        <div class="py-6 text-center">
          <p class="text-xs text-ink/30 px-4">Tippe um zu suchen<span class="hidden sm:inline"> · ↑↓ navigieren · Enter öffnen · Esc schließen</span></p>
        </div>
      {/if}
    </div>
  </div>
{/if}
