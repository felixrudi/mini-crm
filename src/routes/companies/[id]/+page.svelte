<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { invalidateAll } from '$app/navigation';
  import TimelineItem from '$lib/components/TimelineItem.svelte';
  import InteractionDialog from '$lib/components/InteractionDialog.svelte';
  import EmailDialog from '$lib/components/EmailDialog.svelte';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Building2 from '@lucide/svelte/icons/building-2';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Users from '@lucide/svelte/icons/users';
  import User from '@lucide/svelte/icons/user';
  import Phone from '@lucide/svelte/icons/phone';
  import Mail from '@lucide/svelte/icons/mail';
  import Plus from '@lucide/svelte/icons/plus';
  import MessagesSquare from '@lucide/svelte/icons/messages-square';

  let { data }: { data: PageData } = $props();

  let editing = $state(false);
  let editName = $state('');
  let editWebsite = $state('');
  let editTelefon = $state('');
  let editStrasse = $state('');
  let editPlz = $state('');
  let editOrt = $state('');
  let editLand = $state('');
  let editNotizen = $state('');

  let activeTab = $state<'timeline' | 'kontakte'>('timeline');
  let showInteractionDialog = $state(false);
  let showEmailDialog = $state(false);

  function startEdit() {
    editName = data.company.name;
    editWebsite = data.company.website ?? '';
    editTelefon = data.company.telefon ?? '';
    editStrasse = data.company.strasse ?? '';
    editPlz = data.company.plz ?? '';
    editOrt = data.company.ort ?? '';
    editLand = data.company.land ?? '';
    editNotizen = data.company.notizen ?? '';
    editing = true;
  }
</script>

<div class="px-4 py-4 md:px-6 md:py-6 max-w-[1400px] mx-auto overflow-x-hidden">
  <a href="/companies" class="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink transition-colors mb-6">
    <ArrowLeft class="w-4 h-4" />
    Alle Firmen
  </a>

  <!-- Header Card -->
  <div class="bg-surface rounded-xl border border-line p-6 mb-6">
    {#if editing}
      <form
        method="POST"
        action="?/update"
        use:enhance={() => async ({ result, update }) => {
          if (result.type === 'success') { toast.success('Gespeichert'); editing = false; }
          else toast.error('Fehler');
          await update();
        }}
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-ink/60 mb-1">Name *</label>
            <input name="name" type="text" bind:value={editName} required
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Website</label>
            <input name="website" type="text" bind:value={editWebsite}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="https://…" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Telefon</label>
            <input name="telefon" type="tel" bind:value={editTelefon}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="+43 1 234567" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Straße</label>
            <input name="strasse" type="text" bind:value={editStrasse}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="Musterstraße 1" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">PLZ</label>
            <input name="plz" type="text" bind:value={editPlz}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="1010" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Ort</label>
            <input name="ort" type="text" bind:value={editOrt}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="Wien" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Land</label>
            <input name="land" type="text" bind:value={editLand}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="Österreich" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-ink/60 mb-1">Notizen</label>
            <textarea name="notizen" rows="2" bind:value={editNotizen}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
              placeholder="Interne Notizen…"></textarea>
          </div>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="flex items-center gap-1.5 px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
            <Check class="w-3.5 h-3.5" /> Speichern
          </button>
          <button type="button" onclick={() => editing = false} class="flex items-center gap-1.5 px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream transition-colors">
            <X class="w-3.5 h-3.5" /> Abbrechen
          </button>
        </div>
      </form>
    {:else}
      <div class="flex items-center gap-4 min-w-0">
        <div class="w-14 h-14 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
          <Building2 class="w-7 h-7 text-sage" />
        </div>
        <div class="min-w-0">
          <h1 class="font-display font-bold text-xl text-ink">{data.company.name}</h1>
          <span class="flex items-center gap-1 text-sm text-ink/50 mt-1">
            <Users class="w-3.5 h-3.5" />
            {data.contacts.length} Kontakt{data.contacts.length !== 1 ? 'e' : ''}
            {#if data.timeline.length > 0}
              <span class="text-ink/25">·</span>
              <MessagesSquare class="w-3.5 h-3.5" />
              {data.timeline.length} Eintrag{data.timeline.length !== 1 ? 'e' : ''}
            {/if}
          </span>
        </div>
      </div>

      <!-- Firmendetails — immer sichtbar -->
      <div class="mt-5 pt-5 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide">Website</p>
          {#if data.company.website}
            <a href={data.company.website} target="_blank" rel="noopener"
              class="flex items-center gap-1 text-sm text-terracotta hover:underline mt-0.5">
              <ExternalLink class="w-3.5 h-3.5" />
              {data.company.website.replace(/^https?:\/\//, '')}
            </a>
          {:else}
            <p class="text-sm text-ink/30 mt-0.5">—</p>
          {/if}
        </div>
        <div>
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide">Telefon</p>
          {#if data.company.telefon}
            <a href="tel:{data.company.telefon}"
              class="flex items-center gap-1 text-sm text-terracotta hover:underline mt-0.5">
              <Phone class="w-3.5 h-3.5" />
              {data.company.telefon}
            </a>
          {:else}
            <p class="text-sm text-ink/30 mt-0.5">—</p>
          {/if}
        </div>
        <div>
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide">Adresse</p>
          {#if data.company.strasse || data.company.ort}
            <p class="text-sm text-ink mt-0.5">{data.company.strasse ?? ''}</p>
            <p class="text-sm text-ink">{[data.company.plz, data.company.ort, data.company.land].filter(Boolean).join(' ')}</p>
          {:else}
            <p class="text-sm text-ink/30 mt-0.5">—</p>
          {/if}
        </div>
        <div class="sm:col-span-2">
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide">Notizen</p>
          <p class="text-sm text-ink/70 mt-0.5 whitespace-pre-wrap">{data.company.notizen || '—'}</p>
        </div>
      </div>

      <div class="mt-4">
        <button
          onclick={startEdit}
          class="flex items-center gap-1.5 px-3 py-1.5 border border-line text-ink/60 rounded-lg text-sm hover:bg-cream hover:text-terracotta transition-colors"
        >
          <Pencil class="w-3.5 h-3.5" /> Angaben bearbeiten
        </button>
      </div>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 bg-surface border border-line rounded-lg p-1 mb-6 w-full overflow-x-auto">
    {#each [
      ['timeline', 'Timeline'],
      ['kontakte', `Kontakte (${data.contacts.length})`]
    ] as [tab, label]}
      <button
        onclick={() => activeTab = tab as typeof activeTab}
        class="px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap {activeTab === tab ? 'bg-terracotta text-white font-medium' : 'text-ink/60 hover:text-ink hover:bg-cream'}"
      >
        {label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'timeline'}
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        onclick={() => showInteractionDialog = true}
        class="flex items-center gap-1.5 px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
      >
        <Plus class="w-3.5 h-3.5" /> Interaktion
      </button>
      <button
        onclick={() => showEmailDialog = true}
        class="flex items-center gap-1.5 px-3 py-1.5 border border-line text-ink/70 rounded-lg text-sm hover:bg-cream transition-colors"
      >
        <Plus class="w-3.5 h-3.5" /> E-Mail
      </button>
    </div>

    <div class="bg-surface rounded-xl border border-line">
      {#if data.timeline.length === 0}
        <div class="py-16 text-center">
          <MessagesSquare class="w-8 h-8 text-ink/15 mx-auto mb-2" />
          <p class="text-sm text-ink/40">Noch keine Einträge in der Timeline</p>
          <p class="text-xs text-ink/30 mt-1">Service-Anrufe, Notizen, Mails — ohne Dummy-Kontakt</p>
        </div>
      {:else}
        <div class="px-5 py-2 divide-y divide-line">
          {#each data.timeline as entry}
            <TimelineItem {entry} basePath="/companies/{data.company.id}" />
          {/each}
        </div>
      {/if}
    </div>

  {:else}
    <!-- Kontakte -->
    <div class="bg-surface rounded-xl border border-line">
      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="font-display font-semibold text-base text-ink flex items-center gap-2">
          <Users class="w-4 h-4 text-sage" />
          Kontakte ({data.contacts.length})
        </h2>
        <a href="/contacts?company={data.company.id}" class="text-xs text-terracotta hover:underline">+ Neuer Kontakt</a>
      </div>

      {#if data.contacts.length === 0}
        <div class="py-12 text-center">
          <User class="w-8 h-8 text-ink/15 mx-auto mb-2" />
          <p class="text-sm text-ink/40">Noch keine Kontakte zugeordnet</p>
        </div>
      {:else}
        <div class="divide-y divide-line">
          {#each data.contacts as contact}
            <a href="/contacts/{contact.id}" class="flex items-center gap-3 px-5 py-3 hover:bg-cream transition-colors">
              <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                {#if contact.photo}
                  <img src={contact.photo} alt="" class="w-full h-full object-cover" />
                {:else}
                  <div class="w-full h-full bg-terracotta/10 flex items-center justify-center">
                    <span class="text-sm font-semibold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-ink truncate">{contact.name}</p>
                {#if contact.rolle}
                  <p class="text-xs text-ink/50 truncate">{contact.rolle}</p>
                {/if}
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                {#if contact.email}
                  <span class="text-ink/30" title={contact.email}><Mail class="w-3.5 h-3.5" /></span>
                {/if}
                {#if contact.telefon}
                  <span class="text-ink/30" title={contact.telefon}><Phone class="w-3.5 h-3.5" /></span>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showInteractionDialog}
  <InteractionDialog
    action="?/add_interaction"
    onclose={() => showInteractionDialog = false}
    onsuccess={() => { showInteractionDialog = false; invalidateAll(); }}
  />
{/if}

{#if showEmailDialog}
  <EmailDialog
    action="?/add_email"
    onclose={() => showEmailDialog = false}
    onsuccess={() => { showEmailDialog = false; invalidateAll(); }}
  />
{/if}
