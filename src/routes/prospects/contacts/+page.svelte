<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Users from '@lucide/svelte/icons/users';
  import Search from '@lucide/svelte/icons/search';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Mail from '@lucide/svelte/icons/mail';
  import UserCheck from '@lucide/svelte/icons/user-check';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';

  let { data }: { data: PageData } = $props();

  let searchValue = $state(data.q ?? '');
  let convertConfirm = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout>;
  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = new URL($page.url);
      if (searchValue.trim()) url.searchParams.set('q', searchValue.trim());
      else url.searchParams.delete('q');
      goto(url.toString(), { replaceState: true });
    }, 300);
  }
</script>

<div class="px-4 py-4 md:px-6 md:py-6 max-w-5xl mx-auto">
  <!-- Header -->
  <div class="flex items-center gap-3 mb-1">
    <a href="/prospects" class="text-ink/40 hover:text-ink transition-colors">
      <ArrowLeft class="w-4 h-4" />
    </a>
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Outreach-Kontakte</h1>
      <p class="text-sm text-ink/50 mt-0.5">
        {data.total} importierte Prospects im Kontakte-Bereich
        {data.q ? ` · Suche: „${data.q}"` : ''}
      </p>
    </div>
  </div>

  <p class="text-xs text-ink/40 mb-5 ml-7">
    Diese Kontakte haben den Tag <code class="bg-cream px-1 rounded">prospect</code> und sind aus der regulären Kontaktliste ausgeblendet.
    Mit "In Kontakte übernehmen" wird der Tag entfernt und der Kontakt taucht in <a href="/contacts" class="text-terracotta hover:underline">/contacts</a> auf.
  </p>

  <!-- Search -->
  <div class="relative mb-5">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
    <input
      type="text"
      bind:value={searchValue}
      oninput={handleSearch}
      placeholder="Name oder E-Mail suchen…"
      class="w-full pl-9 pr-4 py-2.5 bg-surface border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
    />
  </div>

  {#if data.contacts.length === 0}
    <div class="bg-surface rounded-xl border border-line py-16 text-center">
      <Users class="w-10 h-10 text-ink/15 mx-auto mb-3" />
      <p class="text-sm font-medium text-ink/50">
        {data.q ? `Keine Treffer für „${data.q}"` : 'Keine Outreach-Kontakte vorhanden'}
      </p>
      {#if !data.q}
        <p class="text-xs text-ink/30 mt-1">Alle Prospects wurden bereits konvertiert oder gelöscht.</p>
      {/if}
    </div>
  {:else}
    <div class="bg-surface rounded-xl border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-line bg-cream/50">
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Name</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden md:table-cell">Firma</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden lg:table-cell">E-Mail</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Tags</th>
              <th class="px-4 py-3 w-32 text-right text-xs font-medium text-ink/50">Aktion</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            {#each data.contacts as contact}
              <tr class="hover:bg-cream/50 transition-colors">
                <td class="px-4 py-3">
                  <div class="min-w-0">
                    <a href="/contacts/{contact.id}" class="text-sm font-medium text-ink hover:text-terracotta transition-colors">
                      {contact.name}
                    </a>
                    {#if contact.rolle}
                      <p class="text-xs text-ink/40 truncate">{contact.rolle}</p>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  {#if contact.company_name}
                    <span class="flex items-center gap-1 text-sm text-ink/60">
                      <Building2 class="w-3 h-3 text-ink/30" />
                      {contact.company_name}
                    </span>
                  {:else}
                    <span class="text-sm text-ink/20">—</span>
                  {/if}
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  {#if contact.email}
                    <a href="mailto:{contact.email}" class="flex items-center gap-1 text-sm text-ink/50 hover:text-terracotta transition-colors">
                      <Mail class="w-3 h-3" />
                      {contact.email}
                    </a>
                  {:else}
                    <span class="text-sm text-ink/20">—</span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    {#each (contact.tags ?? []) as tag}
                      <span class="text-xs px-1.5 py-0.5 rounded bg-terracotta/10 text-terracotta/80 border border-terracotta/20">
                        {tag}
                      </span>
                    {/each}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <!-- Convert to real contact -->
                    {#if convertConfirm === contact.id}
                      <form
                        method="POST"
                        action="?/convert"
                        use:enhance={() => {
                          return async ({ result, update }) => {
                            if (result.type === 'success') {
                              toast.success(`${contact.name} ist jetzt ein regulärer Kontakt`);
                            } else {
                              toast.error('Fehler beim Konvertieren');
                            }
                            convertConfirm = null;
                            await update();
                          };
                        }}
                        class="flex items-center gap-1"
                      >
                        <input type="hidden" name="id" value={contact.id} />
                        <button type="submit" class="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">Ja</button>
                        <button type="button" onclick={() => convertConfirm = null} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
                      </form>
                    {:else}
                      <button
                        onclick={() => { convertConfirm = contact.id; deleteConfirm = null; }}
                        title="In Kontakte übernehmen"
                        class="flex items-center gap-1 px-2 py-1 text-xs text-ink/50 hover:text-green-600 hover:bg-green-50 rounded transition-colors border border-transparent hover:border-green-200"
                      >
                        <UserCheck class="w-3.5 h-3.5" />
                        Übernehmen
                      </button>
                    {/if}

                    <!-- Delete -->
                    {#if deleteConfirm === contact.id}
                      <form
                        method="POST"
                        action="?/delete"
                        use:enhance={() => {
                          return async ({ result, update }) => {
                            if (result.type === 'success') toast.success('Kontakt gelöscht');
                            else toast.error('Fehler');
                            deleteConfirm = null;
                            await update();
                          };
                        }}
                        class="flex items-center gap-1"
                      >
                        <input type="hidden" name="id" value={contact.id} />
                        <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
                        <button type="button" onclick={() => deleteConfirm = null} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
                      </form>
                    {:else}
                      <button
                        onclick={() => { deleteConfirm = contact.id; convertConfirm = null; }}
                        title="Löschen"
                        class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
