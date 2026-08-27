<script lang="ts">
  import type { Contact, TimelineEntry, Company } from '$lib/types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { openContact } from '$lib/detail-panel';
  import TimelineItem from '$lib/components/TimelineItem.svelte';
  import InteractionDialog from '$lib/components/InteractionDialog.svelte';
  import EmailDialog from '$lib/components/EmailDialog.svelte';
  import Building2 from '@lucide/svelte/icons/building-2';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Users from '@lucide/svelte/icons/users';
  import Phone from '@lucide/svelte/icons/phone';
  import Mail from '@lucide/svelte/icons/mail';
  import Plus from '@lucide/svelte/icons/plus';
  import MessagesSquare from '@lucide/svelte/icons/messages-square';
  import TagInput from '$lib/components/TagInput.svelte';
  import { tagColor } from '$lib/tags';

  let {
    companyId,
    onupdated
  }: {
    companyId: string;
    onupdated?: () => void;
  } = $props();

  let loading = $state(true);
  let errorMsg = $state('');
  let company = $state<(Company & { contact_count?: number }) | null>(null);
  let contacts = $state<Contact[]>([]);
  let timeline = $state<TimelineEntry[]>([]);
  let activeTab = $state<'timeline' | 'kontakte'>('timeline');
  let showInteractionDialog = $state(false);
  let showEmailDialog = $state(false);
  let editing = $state(false);

  let editName = $state('');
  let editWebsite = $state('');
  let editTelefon = $state('');
  let editStrasse = $state('');
  let editPlz = $state('');
  let editOrt = $state('');
  let editLand = $state('');
  let editNotizen = $state('');
  let editTags = $state<string[]>([]);

  const basePath = $derived(`/companies/${companyId}`);

  async function load() {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/companies/${companyId}/detail`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Firma nicht gefunden' : 'Laden fehlgeschlagen');
      const d = await res.json();
      company = d.company;
      contacts = d.contacts ?? [];
      timeline = d.timeline ?? [];
      activeTab = 'timeline';
      editing = false;
    } catch (e: any) {
      errorMsg = e?.message || 'Fehler';
      company = null;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    companyId;
    load();
  });

  async function reload() {
    await load();
    onupdated?.();
  }

  function startEdit() {
    if (!company) return;
    editName = company.name;
    editWebsite = company.website ?? '';
    editTelefon = company.telefon ?? '';
    editStrasse = company.strasse ?? '';
    editPlz = company.plz ?? '';
    editOrt = company.ort ?? '';
    editLand = company.land ?? '';
    editNotizen = company.notizen ?? '';
    editTags = company.tags ?? [];
    editing = true;
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <div class="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else if errorMsg || !company}
  <div class="px-5 py-16 text-center">
    <p class="text-sm text-ink/50">{errorMsg || 'Nicht gefunden'}</p>
  </div>
{:else}
  <div class="px-4 py-4 space-y-4">
    {#if editing}
      <form
        method="POST"
        action={`${basePath}?/update`}
        use:enhance={() => async ({ result }) => {
          if (result.type === 'success') { toast.success('Gespeichert'); editing = false; await reload(); }
          else toast.error('Fehler');
        }}
        class="space-y-2"
      >
        <input name="name" bind:value={editName} required placeholder="Name" class="w-full px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm" />
        <input name="website" bind:value={editWebsite} placeholder="Website" class="w-full px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm" />
        <input name="telefon" bind:value={editTelefon} placeholder="Telefon" class="w-full px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm" />
        <input name="strasse" bind:value={editStrasse} placeholder="Straße" class="w-full px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm" />
        <div class="grid grid-cols-2 gap-2">
          <input name="plz" bind:value={editPlz} placeholder="PLZ" class="px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm" />
          <input name="ort" bind:value={editOrt} placeholder="Ort" class="px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm" />
        </div>
        <input name="land" bind:value={editLand} placeholder="Land" class="w-full px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm" />
        <textarea name="notizen" bind:value={editNotizen} rows="2" placeholder="Notizen" class="w-full px-2.5 py-1.5 bg-cream border border-line rounded-lg text-sm resize-none"></textarea>
        <div class="mt-1">
          <label class="block text-xs font-medium text-ink/60 mb-1">Tags</label>
          <TagInput bind:tags={editTags} placeholder="steuerberater, wien … Enter" />
        </div>
        <div class="flex gap-2">
          <button type="submit" class="flex items-center gap-1 px-2.5 py-1.5 bg-terracotta text-white rounded-lg text-xs font-medium"><Check class="w-3 h-3" /> Speichern</button>
          <button type="button" onclick={() => (editing = false)} class="flex items-center gap-1 px-2.5 py-1.5 border border-line rounded-lg text-xs"><X class="w-3 h-3" /> Abbrechen</button>
        </div>
      </form>
    {:else}
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
          <Building2 class="w-6 h-6 text-sage" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="font-display font-bold text-lg text-ink">{company.name}</h2>
          <p class="text-xs text-ink/45 mt-0.5 flex items-center gap-1">
            <Users class="w-3 h-3" /> {contacts.length} Kontakt{contacts.length !== 1 ? 'e' : ''}
            {#if timeline.length}
              <span class="text-ink/25">·</span>
              <MessagesSquare class="w-3 h-3" /> {timeline.length}
            {/if}
          </p>
        </div>
        <button type="button" onclick={startEdit} class="p-1.5 text-ink/40 hover:text-terracotta border border-line rounded-lg" title="Bearbeiten">
          <Pencil class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="grid grid-cols-1 gap-2 text-sm border-t border-line pt-3">
        {#if company.website}
          <a href={company.website} target="_blank" rel="noopener" class="flex items-center gap-1.5 text-terracotta hover:underline text-xs">
            <ExternalLink class="w-3 h-3" /> {company.website.replace(/^https?:\/\//, '')}
          </a>
        {/if}
        {#if company.telefon}
          <a href="tel:{company.telefon}" class="flex items-center gap-1.5 text-xs text-ink/70 hover:text-terracotta">
            <Phone class="w-3 h-3" /> {company.telefon}
          </a>
        {/if}
        {#if company.strasse || company.ort}
          <p class="text-xs text-ink/50">
            {[company.strasse, [company.plz, company.ort, company.land].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
          </p>
        {/if}
        {#if company.notizen}
          <p class="text-xs text-ink/55 whitespace-pre-wrap">{company.notizen}</p>
        {/if}
        {#if company.tags?.length}
          <div class="flex flex-wrap gap-1 mt-1">
            {#each company.tags as tag}
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium border {tagColor(tag)}">{tag}</span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div class="flex gap-1 bg-cream border border-line rounded-lg p-1">
      <button type="button" onclick={() => (activeTab = 'timeline')} class="flex-1 px-2 py-1.5 text-xs rounded-md {activeTab === 'timeline' ? 'bg-terracotta text-white font-medium' : 'text-ink/60'}">Timeline</button>
      <button type="button" onclick={() => (activeTab = 'kontakte')} class="flex-1 px-2 py-1.5 text-xs rounded-md {activeTab === 'kontakte' ? 'bg-terracotta text-white font-medium' : 'text-ink/60'}">Kontakte ({contacts.length})</button>
    </div>

    {#if activeTab === 'timeline'}
      <div class="flex flex-wrap gap-2">
        <button type="button" onclick={() => (showInteractionDialog = true)} class="flex items-center gap-1 px-2.5 py-1.5 bg-terracotta text-white rounded-lg text-xs font-medium">
          <Plus class="w-3 h-3" /> Interaktion
        </button>
        <button type="button" onclick={() => (showEmailDialog = true)} class="flex items-center gap-1 px-2.5 py-1.5 border border-line text-ink/70 rounded-lg text-xs">
          <Plus class="w-3 h-3" /> E-Mail
        </button>
      </div>
      <div class="bg-cream/40 rounded-xl border border-line">
        {#if timeline.length === 0}
          <div class="py-10 text-center">
            <p class="text-xs text-ink/40">Noch keine Einträge</p>
            <p class="text-[10px] text-ink/30 mt-1">Service-Anrufe ohne Dummy-Kontakt</p>
          </div>
        {:else}
          <div class="px-3 py-1 divide-y divide-line">
            {#each timeline as entry}
              <TimelineItem {entry} basePath={basePath} />
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <div class="border border-line rounded-xl divide-y divide-line overflow-hidden">
        {#if contacts.length === 0}
          <div class="py-10 text-center text-xs text-ink/40">Keine Kontakte</div>
        {:else}
          {#each contacts as c}
            <button type="button" onclick={() => openContact(c.id)} class="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-cream text-left transition-colors">
              <div class="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-semibold text-terracotta">{c.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink truncate">{c.name}</p>
                {#if c.rolle}<p class="text-[11px] text-ink/45 truncate">{c.rolle}</p>{/if}
              </div>
              <div class="flex gap-1 text-ink/30">
                {#if c.email}<Mail class="w-3 h-3" />{/if}
                {#if c.telefon}<Phone class="w-3 h-3" />{/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}

{#if showInteractionDialog}
  <InteractionDialog
    action={`${basePath}?/add_interaction`}
    onclose={() => (showInteractionDialog = false)}
    onsuccess={() => { showInteractionDialog = false; reload(); }}
  />
{/if}

{#if showEmailDialog}
  <EmailDialog
    action={`${basePath}?/add_email`}
    onclose={() => (showEmailDialog = false)}
    onsuccess={() => { showEmailDialog = false; reload(); }}
  />
{/if}
