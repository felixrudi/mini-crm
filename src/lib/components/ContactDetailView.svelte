<script lang="ts">
  import type { Contact, TimelineEntry } from '$lib/types';
  import { toast } from '$lib/toast';
  import { formatDate } from '$lib/utils';
  import { openCompany } from '$lib/detail-panel';
  import TimelineItem from '$lib/components/TimelineItem.svelte';
  import InteractionDialog from '$lib/components/InteractionDialog.svelte';
  import EmailDialog from '$lib/components/EmailDialog.svelte';
  import ContactForm from '$lib/components/ContactForm.svelte';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Mail from '@lucide/svelte/icons/mail';
  import Phone from '@lucide/svelte/icons/phone';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MessagesSquare from '@lucide/svelte/icons/messages-square';
  import Linkedin from '@lucide/svelte/icons/linkedin';
  import Plus from '@lucide/svelte/icons/plus';
  import Download from '@lucide/svelte/icons/download';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import FileText from '@lucide/svelte/icons/file-text';
  import Loader from '@lucide/svelte/icons/loader';
  import X from '@lucide/svelte/icons/x';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import { karteUrl, adresseText } from '$lib/utils';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';

  let {
    contactId,
    onupdated
  }: {
    contactId: string;
    onupdated?: () => void;
  } = $props();

  let loading = $state(true);
  let errorMsg = $state('');
  let contact = $state<Contact | null>(null);
  let timeline = $state<TimelineEntry[]>([]);
  let companies = $state<{ id: string; name: string }[]>([]);
  let activeTab = $state<'timeline' | 'details' | 'dateien'>('timeline');
  let showInteractionDialog = $state(false);
  let showEmailDialog = $state(false);
  let showEditContact = $state(false);
  let photo = $state<string | null>(null);

  type CrmFile = { id: string; filename: string; mimetype: string; data: string | null; created_at: string };
  let files = $state<CrmFile[]>([]);
  let filesLoaded = $state(false);
  let filesUploading = $state(false);
  let fileInputEl: HTMLInputElement;
  let photoFileInput: HTMLInputElement;
  let lightboxSrc = $state<string | null>(null);

  const basePath = $derived(`/contacts/${contactId}`);

  async function load() {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/contacts/${contactId}/detail`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Kontakt nicht gefunden' : 'Laden fehlgeschlagen');
      const d = await res.json();
      contact = d.contact;
      timeline = d.timeline ?? [];
      companies = d.companies ?? [];
      photo = d.contact?.photo ?? null;
      filesLoaded = false;
      files = [];
      activeTab = 'timeline';
    } catch (e: any) {
      errorMsg = e?.message || 'Fehler';
      contact = null;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    contactId;
    load();
  });

  async function reload() {
    await load();
    onupdated?.();
  }

  async function loadFiles() {
    if (filesLoaded) return;
    const res = await fetch(`/api/contacts/${contactId}/files`);
    if (res.ok) {
      const d = await res.json();
      files = d.files ?? [];
    }
    filesLoaded = true;
  }

  $effect(() => {
    if (activeTab === 'dateien') loadFiles();
  });

  async function uploadFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    filesUploading = true;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/contacts/${contactId}/files`, { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      files = [d.file, ...files];
      toast.success('Datei hochgeladen');
    } else toast.error('Upload fehlgeschlagen');
    filesUploading = false;
    input.value = '';
  }

  async function deleteFile(id: string) {
    if (!confirm('Datei löschen?')) return;
    const res = await fetch(`/api/contacts/${contactId}/files/${id}`, { method: 'DELETE' });
    if (res.ok) {
      files = files.filter((f) => f.id !== id);
      toast.success('Gelöscht');
    }
  }

  async function handlePhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const resized = await resizeImage(file, 400);
    const fd = new FormData();
    fd.append('image', resized, 'photo.jpg');
    const res = await fetch(`/api/contacts/${contactId}/photo`, { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      photo = d.photo;
      toast.success('Foto gespeichert');
    } else toast.error('Upload fehlgeschlagen');
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
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <div class="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else if errorMsg || !contact}
  <div class="px-5 py-16 text-center">
    <p class="text-sm text-ink/50">{errorMsg || 'Nicht gefunden'}</p>
  </div>
{:else}
  <div class="px-4 py-4 space-y-4">
    <!-- Header -->
    <div class="flex items-start gap-3">
      <input bind:this={photoFileInput} type="file" accept="image/*" capture="environment" class="hidden" onchange={handlePhotoChange} />
      <button
        type="button"
        title="Foto ändern"
        onclick={() => photoFileInput.click()}
        class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-terracotta/40 transition-all"
      >
        {#if photo}
          <img src={photo} alt="" class="w-full h-full object-cover" />
        {:else}
          <div class="w-full h-full bg-terracotta/10 flex items-center justify-center">
            <span class="text-xl font-display font-bold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
          </div>
        {/if}
      </button>
      <div class="min-w-0 flex-1">
        <h2 class="font-display font-bold text-lg text-ink truncate">{contact.name}</h2>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-sm text-ink/55">
          {#if contact.rolle}<span>{contact.rolle}</span>{/if}
          {#if contact.company_name}
            {#if contact.rolle}<span class="text-ink/25">·</span>{/if}
            <button
              type="button"
              class="inline-flex items-center gap-1 text-terracotta hover:underline"
              onclick={() => contact.company_id && openCompany(contact.company_id)}
            >
              <Building2 class="w-3.5 h-3.5" /> {contact.company_name}
            </button>
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <a href="/contacts/{contact.id}/vcard" class="p-1.5 text-ink/40 hover:text-terracotta border border-line rounded-lg" title="vCard">
          <Download class="w-3.5 h-3.5" />
        </a>
        <button type="button" onclick={() => (showEditContact = true)} class="p-1.5 text-ink/40 hover:text-terracotta border border-line rounded-lg" title="Bearbeiten">
          <Pencil class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Quick links -->
    <div class="flex flex-wrap gap-2">
      {#if contact.email}
        <a href="mailto:{contact.email}" class="inline-flex items-center gap-1 text-xs text-terracotta hover:underline"><Mail class="w-3 h-3" /> {contact.email}</a>
      {/if}
      {#if contact.telefon}
        <a href="tel:{contact.telefon}" class="inline-flex items-center gap-1 text-xs text-ink/60 hover:text-terracotta"><Phone class="w-3 h-3" /> {contact.telefon}</a>
      {/if}
      {#if contact.whatsapp}
        <a href="https://wa.me/{contact.whatsapp.replace(/[\s\-\+]/g, '')}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-green-600"><MessageCircle class="w-3 h-3" /> WhatsApp</a>
      {/if}
      {#if contact.wechat_id}
        <span class="inline-flex items-center gap-1 text-xs text-green-700"><MessagesSquare class="w-3 h-3" /> {contact.wechat_id}</span>
      {/if}
      {#if contact.linkedin_url}
        <a href={contact.linkedin_url} target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-blue-600"><Linkedin class="w-3 h-3" /> LinkedIn</a>
      {/if}
    </div>

    {#if contact.strasse || contact.ort || contact.geburtstag || contact.tags?.length || contact.notizen}
      <div class="space-y-1.5 text-sm text-ink/55 border-t border-line pt-3">
        {#if contact.strasse || contact.ort}
          {@const karte = karteUrl(contact)}
          {#if karte}
            <a href={karte} target="_blank" rel="noopener" class="flex items-start gap-1.5 hover:text-terracotta hover:underline">
              <MapPin class="w-3.5 h-3.5 mt-0.5 text-ink/30 flex-shrink-0" />
              {adresseText(contact)}
            </a>
          {:else}
            <div class="flex items-start gap-1.5">
              <MapPin class="w-3.5 h-3.5 mt-0.5 text-ink/30" />
              {adresseText(contact)}
            </div>
          {/if}
        {/if}
        {#if contact.geburtstag}
          <div class="flex items-center gap-1.5"><CalendarDays class="w-3.5 h-3.5 text-ink/30" /> {formatDate(contact.geburtstag)}</div>
        {/if}
        {#if contact.tags?.length}
          <div class="flex flex-wrap gap-1">
            {#each contact.tags as tag}
              <span class="px-2 py-0.5 rounded-full text-[10px] bg-terracotta/10 text-terracotta border border-terracotta/20">{tag}</span>
            {/each}
          </div>
        {/if}
        {#if contact.notizen}
          <p class="text-xs text-ink/50 whitespace-pre-wrap leading-relaxed">{contact.notizen}</p>
        {/if}
      </div>
    {/if}

    <!-- Tabs -->
    <div class="flex gap-1 bg-cream border border-line rounded-lg p-1">
      {#each [['timeline', 'Timeline'], ['details', 'Details'], ['dateien', 'Dateien']] as [tab, label]}
        <button
          type="button"
          onclick={() => (activeTab = tab as typeof activeTab)}
          class="flex-1 px-2 py-1.5 text-xs rounded-md transition-colors {activeTab === tab ? 'bg-terracotta text-white font-medium' : 'text-ink/60 hover:text-ink'}"
        >{label}</button>
      {/each}
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
          </div>
        {:else}
          <div class="px-3 py-1 divide-y divide-line">
            {#each timeline as entry}
              <TimelineItem {entry} basePath={basePath} />
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'details'}
      <div class="space-y-3 text-sm">
        <dl class="grid grid-cols-2 gap-3">
          {#each [
            ['Anrede', contact.anrede],
            ['Titel', contact.titel],
            ['Vorname', contact.vorname],
            ['Nachname', contact.nachname],
            ['Firma', contact.company_name],
            ['Rolle', contact.rolle],
            ['E-Mail', contact.email],
            ['Telefon', contact.telefon],
            ['WhatsApp', contact.whatsapp],
            ['WeChat', contact.wechat_id],
            ['IBAN', contact.iban],
          ] as [label, value]}
            {#if value}
              <div class="min-w-0">
                <dt class="text-[10px] font-medium text-ink/40 uppercase tracking-wide">{label}</dt>
                <dd class="text-sm text-ink mt-0.5 break-all">{value}</dd>
              </div>
            {/if}
          {/each}
        </dl>
        <button type="button" onclick={() => (showEditContact = true)} class="flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-lg text-xs text-ink/60 hover:bg-cream">
          <Pencil class="w-3 h-3" /> Bearbeiten
        </button>
      </div>

    {:else}
      <input bind:this={fileInputEl} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" class="hidden" onchange={uploadFile} />
      <div class="flex items-center justify-between">
        <p class="text-xs text-ink/45">{files.length} Datei{files.length === 1 ? '' : 'en'}</p>
        <button type="button" onclick={() => fileInputEl.click()} disabled={filesUploading} class="flex items-center gap-1 px-2.5 py-1.5 bg-terracotta text-white rounded-lg text-xs font-medium disabled:opacity-50">
          {#if filesUploading}<Loader class="w-3 h-3 animate-spin" />{:else}<Paperclip class="w-3 h-3" />{/if}
          Hinzufügen
        </button>
      </div>
      {#if files.length === 0}
        <div class="py-10 text-center border border-line rounded-xl">
          <Paperclip class="w-6 h-6 text-ink/15 mx-auto mb-1" />
          <p class="text-xs text-ink/40">Keine Dateien</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each files as f}
            <div class="flex items-center gap-2 px-2.5 py-2 border border-line rounded-lg bg-cream/40">
              {#if f.mimetype.startsWith('image/') && f.data}
                <button type="button" onclick={() => (lightboxSrc = f.data)} class="w-9 h-9 rounded overflow-hidden flex-shrink-0">
                  <img src={f.data} alt="" class="w-full h-full object-cover" />
                </button>
              {:else}
                <FileText class="w-4 h-4 text-ink/30 flex-shrink-0" />
              {/if}
              <span class="text-xs text-ink truncate flex-1">{f.filename}</span>
              <button type="button" onclick={() => deleteFile(f.id)} class="p-1 text-ink/30 hover:text-red-500"><X class="w-3.5 h-3.5" /></button>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
{/if}

{#if lightboxSrc}
  <div class="fixed inset-0 bg-ink/80 z-[60] flex items-center justify-center p-4" onclick={() => (lightboxSrc = null)}>
    <img src={lightboxSrc} alt="" class="max-w-full max-h-full rounded-xl object-contain" />
  </div>
{/if}

{#if showInteractionDialog}
  <InteractionDialog
    contactId={contactId}
    action={`${basePath}?/add_interaction`}
    onclose={() => (showInteractionDialog = false)}
    onsuccess={() => { showInteractionDialog = false; reload(); }}
  />
{/if}

{#if showEmailDialog && contact}
  <EmailDialog
    contactId={contactId}
    contactEmail={contact.email ?? ''}
    action={`${basePath}?/add_email`}
    onclose={() => (showEmailDialog = false)}
    onsuccess={() => { showEmailDialog = false; reload(); }}
  />
{/if}

{#if showEditContact && contact}
  <ContactForm
    contact={contact}
    companies={companies}
    action={`${basePath}?/update_contact`}
    onclose={() => (showEditContact = false)}
    onsuccess={() => { showEditContact = false; reload(); }}
  />
{/if}
