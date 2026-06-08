<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import type { Company } from '$lib/types';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Plus from '@lucide/svelte/icons/plus';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Users from '@lucide/svelte/icons/users';

  let { data }: { data: PageData } = $props();

  let showCreateForm = $state(false);
  let editId = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);

  // Inline edit state
  let editName = $state('');
  let editWebsite = $state('');
  let editNotizen = $state('');

  function startEdit(company: Company & { contact_count?: number }) {
    editId = company.id;
    editName = company.name;
    editWebsite = company.website ?? '';
    editNotizen = company.notizen ?? '';
  }

  function cancelEdit() {
    editId = null;
  }
</script>

<div class="p-6 max-w-4xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Firmen</h1>
      <p class="text-sm text-ink/50 mt-1">{data.companies.length} Firmen</p>
    </div>
    <button
      onclick={() => showCreateForm = !showCreateForm}
      class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
    >
      <Plus class="w-4 h-4" />
      Neue Firma
    </button>
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
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Website</label>
          <input name="website" type="url" placeholder="https://..."
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Notizen</label>
          <input name="notizen" type="text" placeholder="Optional..."
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick={() => showCreateForm = false}
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
      <p class="text-sm font-medium text-ink/50">Noch keine Firmen</p>
      <button
        onclick={() => showCreateForm = true}
        class="mt-4 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
      >
        Erste Firma anlegen
      </button>
    </div>
  {:else}
    <div class="bg-surface rounded-xl border border-line overflow-hidden">
      <div class="divide-y divide-line">
        {#each data.companies as company}
          <div class="p-4">
            {#if editId === company.id}
              <!-- Inline edit form -->
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
                    class="px-2 py-1.5 bg-cream border border-terracotta/40 rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
                  <input name="website" bind:value={editWebsite} placeholder="Website"
                    class="px-2 py-1.5 bg-cream border border-line rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
                  <input name="notizen" bind:value={editNotizen} placeholder="Notizen"
                    class="px-2 py-1.5 bg-cream border border-line rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-terracotta" />
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
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-ink">{company.name}</p>
                      {#if company.contact_count > 0}
                        <span class="flex items-center gap-0.5 text-xs text-ink/40">
                          <Users class="w-3 h-3" /> {company.contact_count}
                        </span>
                      {/if}
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
                      <button type="button" onclick={() => deleteConfirm = null} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
                    </form>
                  {:else}
                    <button onclick={() => deleteConfirm = company.id}
                      class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded">
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
