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
  import Link from '@lucide/svelte/icons/link';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import FileText from '@lucide/svelte/icons/file-text';
  import Camera from '@lucide/svelte/icons/camera';
  import Loader from '@lucide/svelte/icons/loader';
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
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'timeline' | 'actions' | 'details' | 'dateien'>('timeline');
  let showInteractionDialog = $state(false);
  let showEmailDialog = $state(false);
  let showEditContact = $state(false);
  let showAddAction = $state(false);
  let newActionTitel = $state('');
  let newActionDate = $state('');
  let newActionNotes = $state('');
  let editingActionId = $state<string | null>(null);
  let editActionTitel = $state('');
  let editActionDate = $state('');
  let editActionNotes = $state('');

  // --- Dateien ---
  type CrmFile = { id: string; filename: string; mimetype: string; data: string | null; created_at: string };
  let files = $state<CrmFile[]>([]);
  let filesLoaded = $state(false);
  let filesUploading = $state(false);
  let fileInputEl: HTMLInputElement;
  let lightboxSrc = $state<string | null>(null);

  async function loadFiles() {
    if (filesLoaded) return;
    const res = await fetch(`/api/contacts/${data.contact.id}/files`);
    if (res.ok) { const d = await res.json(); files = d.files ?? []; }
    filesLoaded = true;
  }

  async function uploadFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    filesUploading = true;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/contacts/${data.contact.id}/files`, { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      files = [d.file, ...files];
      toast.success('Datei hochgeladen');
    } else {
      toast.error('Upload fehlgeschlagen');
    }
    filesUploading = false;
    input.value = '';
  }

  async function deleteFile(id: string) {
    if (!confirm('Datei löschen?')) return;
    const res = await fetch(`/api/contacts/${data.contact.id}/files/${id}`, { method: 'DELETE' });
    if (res.ok) { files = files.filter(f => f.id !== id); toast.success('Gelöscht'); }
  }

  $effect(() => {
    if (activeTab === 'dateien') loadFiles();
  });

  function startEditAction(a: Action) {
    editingActionId = a.id;
    editActionTitel = a.titel;
    editActionDate = a.faellig_am ? a.faellig_am.slice(0, 10) : '';
    editActionNotes = a.notizen ?? '';
  }

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

<div class="px-4 py-4 md:px-6 md:py-6 max-w-4xl mx-auto overflow-x-hidden">
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
        <button
          onclick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link kopiert'); }}
          class="p-2 text-ink/40 hover:text-terracotta transition-colors border border-line rounded-lg"
          title="Link kopieren"
        >
          <Link class="w-4 h-4" />
        </button>
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
        <a href="https://wa.me/{data.contact.whatsapp.replace(/[\s\-\+]/g, '')}" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-sm text-green-600 hover:underline" title="WhatsApp öffnen">
          <MessageCircle class="w-3.5 h-3.5 text-green-500" /> {data.contact.whatsapp}
        </a>
      {/if}
      {#if data.contact.wechat_id}
        <a href="weixin://dl/contacts?username={data.contact.wechat_id}" class="flex items-center gap-1.5 text-sm text-green-700 hover:underline" title="WeChat öffnen">
          <MessagesSquare class="w-3.5 h-3.5 text-green-600" /> {data.contact.wechat_id}
        </a>
      {/if}
      {#if data.contact.linkedin_url}
        <a href={data.contact.linkedin_url} target="_blank" rel="noopener" class="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
          <Linkedin class="w-3.5 h-3.5" /> LinkedIn
        </a>
      {/if}
      {#if data.contact.telefon2}
        <a href="tel:{data.contact.telefon2}" class="flex items-center gap-1.5 text-sm text-ink/60 hover:text-terracotta transition-colors">
          <Phone class="w-3.5 h-3.5" /> {data.contact.telefon2}
        </a>
      {/if}
    </div>

    <!-- Weitere Details direkt sichtbar -->
    {#if data.contact.company_name || data.contact.rolle || data.contact.strasse || data.contact.ort || data.contact.geburtstag || data.contact.tags?.length > 0 || data.contact.notizen}
      <div class="mt-3 pt-3 border-t border-line space-y-2">

        {#if data.contact.company_name || data.contact.rolle}
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            {#if data.contact.company_name}
              <span class="flex items-center gap-1.5 text-sm text-ink/60">
                <Building2 class="w-3.5 h-3.5 text-ink/30" /> {data.contact.company_name}
              </span>
            {/if}
            {#if data.contact.rolle}
              <span class="text-sm text-ink/50">{data.contact.rolle}</span>
            {/if}
          </div>
        {/if}

        {#if data.contact.strasse || data.contact.ort}
          <div class="flex items-center gap-1.5 text-sm text-ink/50">
            <MapPin class="w-3.5 h-3.5 text-ink/30 flex-shrink-0" />
            {[data.contact.strasse, [data.contact.plz, data.contact.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
          </div>
        {/if}

        {#if data.contact.geburtstag}
          <div class="flex items-center gap-1.5 text-sm text-ink/50">
            <CalendarDays class="w-3.5 h-3.5 text-ink/30" /> {formatDate(data.contact.geburtstag)}
          </div>
        {/if}

        {#if data.contact.tags?.length > 0}
          <div class="flex flex-wrap gap-1.5">
            {#each data.contact.tags as tag}
              <span class="px-2 py-0.5 rounded-full text-xs bg-terracotta/10 text-terracotta border border-terracotta/20">{tag}</span>
            {/each}
          </div>
        {/if}

        {#if data.contact.notizen}
          <p class="text-sm text-ink/60 whitespace-pre-wrap leading-relaxed">{data.contact.notizen}</p>
        {/if}

      </div>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 bg-surface border border-line rounded-lg p-1 mb-6 w-full overflow-x-auto">
    {#each [['timeline', 'Timeline'], ['actions', `Aufgaben (${openActions.length})`], ['details', 'Details'], ['dateien', 'Dateien']] as [tab, label]}
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
            <TimelineItem {entry} contactId={data.contact.id} />
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
              <div class="flex items-start gap-3 py-2.5 border-b border-line last:border-0 group">
                <form method="POST" action="?/toggle_action" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Erledigt!'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-ink/30 hover:text-terracotta transition-colors" title="Als erledigt markieren">
                    <Circle class="w-5 h-5" />
                  </button>
                </form>
                <div class="flex-1 min-w-0">
                  {#if editingActionId === action.id}
                    <form method="POST" action="?/update_action"
                      use:enhance={() => async ({ result, update }) => {
                        if (result.type === 'success') { toast.success('Gespeichert'); editingActionId = null; }
                        else toast.error('Fehler');
                        await update();
                      }}
                    >
                      <input type="hidden" name="id" value={action.id} />
                      <div class="space-y-1.5 mb-2">
                        <input type="text" name="titel" bind:value={editActionTitel} required
                          class="w-full px-2 py-1.5 bg-cream border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
                        <div class="grid grid-cols-2 gap-2">
                          <input type="date" name="faellig_am" bind:value={editActionDate}
                            class="px-2 py-1.5 bg-cream border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
                          <input type="text" name="notizen" bind:value={editActionNotes} placeholder="Notizen"
                            class="px-2 py-1.5 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
                        </div>
                      </div>
                      <div class="flex gap-1.5">
                        <button type="submit" class="flex items-center gap-1 px-2.5 py-1 bg-terracotta text-white rounded-lg text-xs font-medium hover:bg-terracotta/90 transition-colors">
                          <Check class="w-3 h-3" /> Speichern
                        </button>
                        <button type="button" onclick={() => editingActionId = null} class="flex items-center gap-1 px-2.5 py-1 border border-line text-ink/60 rounded-lg text-xs hover:bg-cream transition-colors">
                          <X class="w-3 h-3" /> Abbrechen
                        </button>
                      </div>
                    </form>
                  {:else}
                    <div class="flex items-start justify-between gap-2">
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
                      <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onclick={() => startEditAction(action)} class="p-1 text-ink/30 hover:text-terracotta transition-colors" title="Bearbeiten">
                          <Pencil class="w-3.5 h-3.5" />
                        </button>
                        <form method="POST" action="?/delete_action"
                          use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Gelöscht'); await update(); }}
                          onsubmit={(e) => { if (!confirm('Aufgabe löschen?')) e.preventDefault(); }}
                        >
                          <input type="hidden" name="id" value={action.id} />
                          <button type="submit" class="p-1 text-ink/30 hover:text-red-500 transition-colors" title="Löschen">
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}

          {#if doneActions.length > 0}
            <p class="text-xs font-medium text-ink/40 uppercase tracking-wide py-2 mt-2">Erledigt ({doneActions.length})</p>
            {#each doneActions as action}
              <div class="flex items-start gap-3 py-2.5 border-b border-line last:border-0 opacity-60 group">
                <form method="POST" action="?/toggle_action" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Wieder offen'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-sage hover:text-terracotta transition-colors" title="Wieder öffnen">
                    <CheckCircle2 class="w-5 h-5" />
                  </button>
                </form>
                <p class="text-sm text-ink/50 line-through flex-1">{action.titel}</p>
                <form method="POST" action="?/delete_action"
                  use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Gelöscht'); await update(); }}
                  onsubmit={(e) => { if (!confirm('Aufgabe löschen?')) e.preventDefault(); }}
                >
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="p-1 text-ink/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Löschen">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

  {:else if activeTab === 'details'}
    <div class="space-y-4">

      <!-- Tags -->
      {#if data.contact.tags?.length > 0}
        <div class="bg-surface rounded-xl border border-line px-5 py-4">
          <p class="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Tags</p>
          <div class="flex flex-wrap gap-1.5">
            {#each data.contact.tags as tag}
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-terracotta/10 text-terracotta border border-terracotta/20">{tag}</span>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Persönliche Daten -->
      <div class="bg-surface rounded-xl border border-line p-5">
        <p class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Persönlich</p>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {#each [
            ['Anrede', data.contact.anrede],
            ['Titel', data.contact.titel],
            ['Vorname', data.contact.vorname],
            ['Nachname', data.contact.nachname],
            ['Geburtstag', data.contact.geburtstag ? formatDate(data.contact.geburtstag) : null],
          ] as [label, value]}
            {#if value}
              <div>
                <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide">{label}</dt>
                <dd class="text-sm text-ink mt-0.5">{value}</dd>
              </div>
            {/if}
          {/each}
        </dl>
      </div>

      <!-- Beruflich -->
      <div class="bg-surface rounded-xl border border-line p-5">
        <p class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Beruflich</p>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {#each [
            ['Firma', data.contact.company_name],
            ['Rolle', data.contact.rolle],
          ] as [label, value]}
            {#if value}
              <div>
                <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide">{label}</dt>
                <dd class="text-sm text-ink mt-0.5">{value}</dd>
              </div>
            {/if}
          {/each}
        </dl>
      </div>

      <!-- Kontakt -->
      <div class="bg-surface rounded-xl border border-line p-5">
        <p class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Kontakt</p>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {#each [
            ['E-Mail', data.contact.email],
            ['Telefon', data.contact.telefon],
            ['2. Telefon', data.contact.telefon2],
            ['WhatsApp', data.contact.whatsapp],
            ['WeChat ID', data.contact.wechat_id],
            ['LinkedIn', data.contact.linkedin_url],
          ] as [label, value]}
            {#if value}
              <div>
                <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide">{label}</dt>
                <dd class="text-sm text-ink mt-0.5 break-all">{value}</dd>
              </div>
            {/if}
          {/each}
        </dl>
      </div>

      <!-- Adresse -->
      {#if data.contact.strasse || data.contact.ort}
        <div class="bg-surface rounded-xl border border-line p-5">
          <p class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Adresse</p>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#each [
              ['Straße', data.contact.strasse],
              ['PLZ / Ort', [data.contact.plz, data.contact.ort].filter(Boolean).join(' ') || null],
            ] as [label, value]}
              {#if value}
                <div>
                  <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide">{label}</dt>
                  <dd class="text-sm text-ink mt-0.5">{value}</dd>
                </div>
              {/if}
            {/each}
          </dl>
        </div>
      {/if}

      <!-- Finanzen -->
      {#if data.contact.iban}
        <div class="bg-surface rounded-xl border border-line p-5">
          <p class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Finanzen</p>
          <dl>
            <div>
              <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide">IBAN / Konto</dt>
              <dd class="text-sm text-ink mt-0.5 font-mono">{data.contact.iban}</dd>
            </div>
          </dl>
        </div>
      {/if}

      <!-- Notizen -->
      {#if data.contact.notizen}
        <div class="bg-surface rounded-xl border border-line p-5">
          <p class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">Notizen</p>
          <p class="text-sm text-ink/70 whitespace-pre-wrap">{data.contact.notizen}</p>
        </div>
      {/if}

      <!-- Meta -->
      <div class="bg-surface rounded-xl border border-line p-5">
        <p class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Meta</p>
        <dl>
          <div>
            <dt class="text-xs font-medium text-ink/40 uppercase tracking-wide">Erstellt</dt>
            <dd class="text-sm text-ink mt-0.5">{formatDate(data.contact.created_at)}</dd>
          </div>
        </dl>
        <div class="mt-4">
          <button
            onclick={() => showEditContact = true}
            class="flex items-center gap-2 px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream hover:text-ink transition-colors"
          >
            <Pencil class="w-3.5 h-3.5" /> Kontakt bearbeiten
          </button>
        </div>
      </div>

    </div>

  {:else if activeTab === 'dateien'}
    <input bind:this={fileInputEl} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" class="hidden" onchange={uploadFile} />

    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-ink/50">{files.length} {files.length === 1 ? 'Datei' : 'Dateien'}</p>
      <button
        type="button"
        onclick={() => fileInputEl.click()}
        disabled={filesUploading}
        class="flex items-center gap-1.5 px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors disabled:opacity-50"
      >
        {#if filesUploading}
          <Loader class="w-3.5 h-3.5 animate-spin" /> Hochladen…
        {:else}
          <Paperclip class="w-3.5 h-3.5" /> Datei hinzufügen
        {/if}
      </button>
    </div>

    {#if files.length === 0}
      <div class="bg-surface rounded-xl border border-line py-16 text-center">
        <Paperclip class="w-8 h-8 text-ink/15 mx-auto mb-2" />
        <p class="text-sm text-ink/40">Noch keine Dateien</p>
        <button onclick={() => fileInputEl.click()} class="mt-3 text-xs text-terracotta hover:underline">
          Erste Datei hochladen
        </button>
      </div>
    {:else}
      <!-- Bilder als Grid -->
      {#if files.some(f => f.mimetype.startsWith('image/'))}
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {#each files.filter(f => f.mimetype.startsWith('image/')) as f}
            <div class="relative group rounded-xl overflow-hidden border border-line bg-cream aspect-square">
              {#if f.data}
                <button type="button" onclick={() => lightboxSrc = f.data} class="w-full h-full">
                  <img src={f.data} alt={f.filename} class="w-full h-full object-cover" />
                </button>
              {/if}
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between">
                <span class="text-xs text-white truncate">{f.filename}</span>
                <button onclick={() => deleteFile(f.id)} class="text-white/70 hover:text-white ml-1">
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Andere Dateien als Liste -->
      {#if files.some(f => !f.mimetype.startsWith('image/'))}
        <div class="bg-surface rounded-xl border border-line divide-y divide-line">
          {#each files.filter(f => !f.mimetype.startsWith('image/')) as f}
            <div class="flex items-center gap-3 px-4 py-3">
              <FileText class="w-5 h-5 text-ink/30 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-ink truncate">{f.filename}</p>
                <p class="text-xs text-ink/40">{f.mimetype}</p>
              </div>
              <div class="flex items-center gap-1">
                <a href="/api/contacts/{data.contact.id}/files/{f.id}" download={f.filename}
                  class="p-1.5 text-ink/30 hover:text-terracotta transition-colors" title="Herunterladen">
                  <Download class="w-3.5 h-3.5" />
                </a>
                <button onclick={() => deleteFile(f.id)} class="p-1.5 text-ink/30 hover:text-red-500 transition-colors" title="Löschen">
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

  {/if}
</div>

<!-- Lightbox -->
{#if lightboxSrc}
  <div
    class="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4"
    onclick={() => lightboxSrc = null}
  >
    <img src={lightboxSrc} alt="" class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
    <button onclick={() => lightboxSrc = null} class="absolute top-4 right-4 p-2 bg-surface/20 text-white rounded-full hover:bg-surface/40 transition-colors">
      <X class="w-5 h-5" />
    </button>
  </div>
{/if}

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
