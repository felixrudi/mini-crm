<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { invalidateAll } from '$app/navigation';
  import { formatDate, isOverdue } from '$lib/utils';
  import TimelineItem from '$lib/components/TimelineItem.svelte';
  import InteractionDialog from '$lib/components/InteractionDialog.svelte';
  import EmailDialog from '$lib/components/EmailDialog.svelte';
  import ContactForm from '$lib/components/ContactForm.svelte';
  import type { Action } from '$lib/types';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Mail from '@lucide/svelte/icons/mail';
  import Phone from '@lucide/svelte/icons/phone';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MessagesSquare from '@lucide/svelte/icons/messages-square';
  import Linkedin from '@lucide/svelte/icons/linkedin';
  import Plus from '@lucide/svelte/icons/plus';
  import Download from '@lucide/svelte/icons/download';
  import Pencil from '@lucide/svelte/icons/pencil';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import Circle from '@lucide/svelte/icons/circle';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'timeline' | 'actions' | 'details'>('timeline');
  let showInteractionDialog = $state(false);
  let showEmailDialog = $state(false);
  let showEditContact = $state(false);
  let showAddAction = $state(false);
  let newActionTitel = $state('');
  let newActionDate = $state('');
  let newActionNotes = $state('');

  let openActions = $derived(data.actions_list.filter((a: Action) => a.status === 'offen'));
  let doneActions = $derived(data.actions_list.filter((a: Action) => a.status === 'erledigt'));

  let photo = $state(data.contact.photo ?? null);
  let photoFileInput: HTMLInputElement;

  async function handlePhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const resized = await resizeImage(file, 400);
    const fd = new FormData();
    fd.append('image', resized, 'photo.jpg');
    const res = await fetch(`/api/contacts/${data.contact.id}/photo`, { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      photo = d.photo;
      toast.success('Foto gespeichert');
    } else {
      toast.error('Upload fehlgeschlagen');
    }
    (e.target as HTMLInputElement).value = '';
  }

  function resizeImage(file: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  }
</script>

<div class="px-4 py-4 md:px-6 md:py-6 max-w-4xl mx-auto">
  <!-- Back -->
  <a href="/contacts" class="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink transition-colors mb-6">
    <ArrowLeft class="w-4 h-4" />
    Alle Kontakte
  </a>

  <!-- Header -->
  <div class="bg-surface rounded-xl border border-line p-6 mb-6">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <input
          bind:this={photoFileInput}
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          onchange={handlePhotoChange}
        />
        <button
          type="button"
          title="Foto ändern"
          onclick={() => photoFileInput.click()}
          class="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-terracotta/40 transition-all"
        >
          {#if photo}
            <img src={photo} alt="" class="w-full h-full object-cover" />
          {:else}
            <div class="w-full h-full bg-terracotta/10 flex items-center justify-center">
              <span class="text-3xl font-display font-bold text-terracotta">{data.contact.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          {/if}
        </button>
        <div class="min-w-0">
          <h1 class="font-display font-bold text-xl text-ink truncate">{data.contact.name}</h1>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            {#if data.contact.rolle}
              <span class="text-sm text-ink/60">{data.contact.rolle}</span>
            {/if}
            {#if data.contact.company_name}
              <span class="text-ink/30">·</span>
              <span class="flex items-center gap-1 text-sm text-ink/60">
                <Building2 class="w-3.5 h-3.5" />
                {data.contact.company_name}
              </span>
            {/if}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <a href="/contacts/{data.contact.id}/vcard" class="p-2 text-ink/40 hover:text-terracotta transition-colors border border-line rounded-lg" title="vCard exportieren">
          <Download class="w-4 h-4" />
        </a>
        <button onclick={() => showEditContact = true} class="p-2 text-ink/40 hover:text-terracotta transition-colors border border-line rounded-lg" title="Bearbeiten">
          <Pencil class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Contact links -->
    <div class="flex flex-wrap gap-3 mt-4 pt-4 border-t border-line">
      {#if data.contact.email}
        <a href="mailto:{data.contact.email}" class="flex items-center gap-1.5 text-sm text-terracotta hover:underline">
          <Mail class="w-3.5 h-3.5" /> {data.contact.email}
        </a>
      {/if}
      {#if data.contact.telefon}
        <a href="tel:{data.contact.telefon}" class="flex items-center gap-1.5 text-sm text-ink/60 hover:text-terracotta transition-colors">
          <Phone class="w-3.5 h-3.5" /> {data.contact.telefon}
        </a>
      {/if}
      {#if data.contact.whatsapp}
        <span class="flex items-center gap-1.5 text-sm text-ink/60">
          <MessageCircle class="w-3.5 h-3.5 text-green-500" /> {data.contact.whatsapp}
        </span>
      {/if}
      {#if data.contact.wechat_id}
        <span class="flex items-center gap-1.5 text-sm text-ink/60">
          <MessagesSquare class="w-3.5 h-3.5 text-green-600" /> {data.contact.wechat_id}
        </span>
      {/if}
      {#if data.contact.linkedin_url}
        <a href={data.contact.linkedin_url} target="_blank" rel="noopener" class="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
          <Linkedin class="w-3.5 h-3.5" /> LinkedIn
        </a>
      {/if}
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 bg-surface border border-line rounded-lg p-1 mb-6 w-fit max-w-full overflow-x-auto">
    {#each [['timeline', 'Timeline'], ['actions', `Aufgaben (${openActions.length})`], ['details', 'Details']] as [tab, label]}
      <button
        onclick={() => activeTab = tab as typeof activeTab}
        class="px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap {activeTab === tab ? 'bg-terracotta text-white font-medium' : 'text-ink/60 hover:text-ink hover:bg-cream'}"
      >
        {label}
      </button>
    {/each}
  </div>

  <!-- Action Buttons -->
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
  {/if}

  {#if activeTab === 'actions'}
    <div class="flex justify-end mb-4">
      <button
        onclick={() => showAddAction = !showAddAction}
        class="flex items-center gap-1.5 px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
      >
        <Plus class="w-3.5 h-3.5" /> Aufgabe
      </button>
    </div>
  {/if}

  <!-- Tab Content -->
  {#if activeTab === 'timeline'}
    <div class="bg-surface rounded-xl border border-line">
      {#if data.timeline.length === 0}
        <div class="py-16 text-center">
          <p class="text-sm text-ink/40">Noch keine Einträge in der Timeline</p>
          <p class="text-xs text-ink/30 mt-1">Erfasse die erste Interaktion oder E-Mail</p>
        </div>
      {:else}
        <div class="px-5 py-2 divide-y divide-line">
          {#each data.timeline as entry}
            <TimelineItem {entry} />
          {/each}
        </div>
      {/if}
    </div>

  {:else if activeTab === 'actions'}
    {#if showAddAction}
      <form
        method="POST"
        action="?/add_action"
        class="bg-surface rounded-xl border border-terracotta/30 p-4 mb-4"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') {
              toast.success('Aufgabe erstellt');
              showAddAction = false;
              newActionTitel = '';
              newActionDate = '';
              newActionNotes = '';
            }
            await update();
          };
        }}
      >
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="col-span-2">
            <input
              type="text"
              name="titel"
              bind:value={newActionTitel}
              required
              placeholder="Aufgabe beschreiben..."
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
          </div>
          <div>
            <label class="block text-xs text-ink/50 mb-1">Fällig am</label>
            <input
              type="date"
              name="faellig_am"
              bind:value={newActionDate}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
          </div>
          <div>
            <label class="block text-xs text-ink/50 mb-1">Notizen</label>
            <input
              type="text"
              name="notizen"
              bind:value={newActionNotes}
              placeholder="Optional..."
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick={() => showAddAction = false} class="px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream transition-colors">Abbrechen</button>
          <button type="submit" class="px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">Erstellen</button>
        </div>
      </form>
    {/if}

    <div class="bg-surface rounded-xl border border-line">
      {#if openActions.length === 0 && doneActions.length === 0}
        <div class="py-16 text-center">
          <p class="text-sm text-ink/40">Keine Aufgaben</p>
        </div>
      {:else}
        <div class="px-5 py-2">
          {#if openActions.length > 0}
            <p class="text-xs font-medium text-ink/40 uppercase tracking-wide py-2">Offen ({openActions.length})</p>
            {#each openActions as action}
              <div class="flex items-start gap-3 py-2.5 border-b border-line last:border-0">
                <form method="POST" action="?/toggle_action" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Erledigt!'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-ink/30 hover:text-terracotta transition-colors">
                    <Circle class="w-5 h-5" />
                  </button>
                </form>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{action.titel}</p>
                  {#if action.faellig_am}
                    <span class="flex items-center gap-1 text-xs mt-0.5 {isOverdue(action.faellig_am) ? 'text-red-500 font-medium' : 'text-ink/40'}">
                      <CalendarClock class="w-3 h-3" />
                      {formatDate(action.faellig_am)}
                      {#if isOverdue(action.faellig_am)}<span>(überfällig)</span>{/if}
                    </span>
                  {/if}
                  {#if action.notizen}
                    <p class="text-xs text-ink/50 mt-0.5">{action.notizen}</p>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}

          {#if doneActions.length > 0}
            <p class="text-xs font-medium text-ink/40 uppercase tracking-wide py-2 mt-2">Erledigt ({doneActions.length})</p>
            {#each doneActions as action}
              <div class="flex items-start gap-3 py-2.5 border-b border-line last:border-0 opacity-60">
                <form method="POST" action="?/toggle_action" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Wieder offen'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-sage hover:text-terracotta transition-colors">
                    <CheckCircle2 class="w-5 h-5" />
                  </button>
                </form>
                <p class="text-sm text-ink/50 line-through">{action.titel}</p>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

  {:else if activeTab === 'details'}
    <div class="bg-surface rounded-xl border border-line p-5">
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each [
          ['Name', data.contact.name],
          ['Rolle', data.contact.rolle],
          ['E-Mail', data.contact.email],
          ['Telefon', data.contact.telefon],
          ['WhatsApp', data.contact.whatsapp],
          ['WeChat ID', data.contact.wechat_id],
          ['LinkedIn', data.contact.linkedin_url],
          ['Firma', data.contact.company_name],
          ['Erstellt', formatDate(data.contact.created_at)],
        ] as [label, value]}
          {#if value}
            <div>
              <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide">{label}</dt>
              <dd class="text-sm text-ink mt-0.5 break-all">{value}</dd>
            </div>
          {/if}
        {/each}
      </dl>

      {#if data.contact.notizen}
        <div class="mt-4 pt-4 border-t border-line">
          <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-1">Notizen</dt>
          <dd class="text-sm text-ink/70 whitespace-pre-wrap">{data.contact.notizen}</dd>
        </div>
      {/if}

      <div class="mt-4 pt-4 border-t border-line">
        <button
          onclick={() => showEditContact = true}
          class="flex items-center gap-2 px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream hover:text-ink transition-colors"
        >
          <Pencil class="w-3.5 h-3.5" /> Kontakt bearbeiten
        </button>
      </div>
    </div>
  {/if}
</div>

{#if showInteractionDialog}
  <InteractionDialog
    contactId={data.contact.id}
    action="?/add_interaction"
    onclose={() => showInteractionDialog = false}
    onsuccess={() => { showInteractionDialog = false; invalidateAll(); }}
  />
{/if}

{#if showEmailDialog}
  <EmailDialog
    contactId={data.contact.id}
    contactEmail={data.contact.email ?? ''}
    action="?/add_email"
    onclose={() => showEmailDialog = false}
    onsuccess={() => { showEmailDialog = false; invalidateAll(); }}
  />
{/if}

{#if showEditContact}
  <ContactForm
    contact={data.contact}
    companies={data.companies}
    action="?/update_contact"
    onclose={() => showEditContact = false}
    onsuccess={() => { showEditContact = false; invalidateAll(); }}
  />
{/if}
