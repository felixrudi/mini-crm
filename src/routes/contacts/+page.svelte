<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ContactForm from '$lib/components/ContactForm.svelte';
  import type { Contact } from '$lib/types';
  import Users from '@lucide/svelte/icons/users';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Mail from '@lucide/svelte/icons/mail';
  import Phone from '@lucide/svelte/icons/phone';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ExternalLink from '@lucide/svelte/icons/external-link';

  let { data }: { data: PageData } = $props();

  let showForm = $state(false);
  let editContact = $state<Contact | null>(null);
  let searchValue = $state(data.q ?? '');
  let deleteConfirm = $state<string | null>(null);
  let photoCache = $state<Record<string, string>>({});
  let avatarUploadId = $state<string | null>(null);
  let avatarFileInput: HTMLInputElement;

  let debounceTimer: ReturnType<typeof setTimeout>;

  async function handleAvatarChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !avatarUploadId) return;
    const targetId = avatarUploadId;
    avatarUploadId = null;

    // Client-side resize to max 400px
    const resized = await resizeImage(file, 400);
    const fd = new FormData();
    fd.append('image', resized, 'photo.jpg');
    const res = await fetch(`/api/contacts/${targetId}/photo`, { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      photoCache[targetId] = d.photo;
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

  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = new URL($page.url);
      if (searchValue.trim()) {
        url.searchParams.set('q', searchValue.trim());
      } else {
        url.searchParams.delete('q');
      }
      goto(url.toString(), { replaceState: true });
    }, 300);
  }
</script>

<div class="p-6 max-w-5xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Kontakte</h1>
      <p class="text-sm text-ink/50 mt-1">{data.contacts.length} Kontakte{data.q ? ` für „${data.q}"` : ''}</p>
    </div>
    <button
      onclick={() => { editContact = null; showForm = true; }}
      class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
    >
      <Plus class="w-4 h-4" />
      Neuer Kontakt
    </button>
  </div>

  <!-- Search -->
  <div class="relative mb-6">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
    <input
      type="text"
      bind:value={searchValue}
      oninput={handleSearch}
      placeholder="Kontakte suchen..."
      class="w-full pl-9 pr-4 py-2.5 bg-surface border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
    />
  </div>

  <!-- Table -->
  {#if data.contacts.length === 0}
    <div class="bg-surface rounded-xl border border-line py-16 text-center">
      <Users class="w-10 h-10 text-ink/15 mx-auto mb-3" />
      <p class="text-sm font-medium text-ink/50">
        {data.q ? `Keine Ergebnisse für „${data.q}"` : 'Noch keine Kontakte'}
      </p>
      {#if !data.q}
        <button
          onclick={() => { editContact = null; showForm = true; }}
          class="mt-4 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
        >
          Ersten Kontakt anlegen
        </button>
      {/if}
    </div>
  {:else}
    <div class="bg-surface rounded-xl border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-line bg-cream/50">
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Name</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Firma</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden md:table-cell">Rolle</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden lg:table-cell">Kontakt</th>
              <th class="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            {#each data.contacts as contact}
              <tr class="hover:bg-cream/50 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <button
                      type="button"
                      title="Foto hinzufügen"
                      onclick={() => { avatarUploadId = contact.id; avatarFileInput.click(); }}
                      class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-terracotta/40 transition-all"
                    >
                      {#if contact.photo || photoCache[contact.id]}
                        <img src={contact.photo || photoCache[contact.id]} alt="" class="w-full h-full object-cover" />
                      {:else}
                        <div class="w-full h-full bg-terracotta/10 flex items-center justify-center">
                          <span class="text-base font-semibold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      {/if}
                    </button>
                    <a href="/contacts/{contact.id}" class="text-sm font-medium text-ink hover:text-terracotta transition-colors">
                      {contact.name}
                    </a>
                  </div>
                </td>
                <td class="px-4 py-3">
                  {#if contact.company_name}
                    <span class="flex items-center gap-1 text-sm text-ink/60">
                      <Building2 class="w-3 h-3 text-ink/30" />
                      {contact.company_name}
                    </span>
                  {:else}
                    <span class="text-sm text-ink/20">—</span>
                  {/if}
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  <span class="text-sm text-ink/60">{contact.rolle ?? '—'}</span>
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  <div class="flex items-center gap-2">
                    {#if contact.email}
                      <a href="mailto:{contact.email}" class="text-ink/40 hover:text-terracotta transition-colors" title={contact.email}>
                        <Mail class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                    {#if contact.telefon}
                      <a href="tel:{contact.telefon}" class="text-ink/40 hover:text-terracotta transition-colors" title={contact.telefon}>
                        <Phone class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                    {#if contact.linkedin_url}
                      <a href={contact.linkedin_url} target="_blank" rel="noopener" class="text-ink/40 hover:text-terracotta transition-colors">
                        <ExternalLink class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      onclick={() => { editContact = contact; showForm = true; }}
                      class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded"
                      title="Bearbeiten"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
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
                        onclick={() => deleteConfirm = contact.id}
                        class="p-1.5 text-ink/30 hover:text-red-500 transition-colors rounded"
                        title="Löschen"
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

<input
  bind:this={avatarFileInput}
  type="file"
  accept="image/*"
  capture="environment"
  class="hidden"
  onchange={handleAvatarChange}
/>

{#if showForm}
  <ContactForm
    contact={editContact}
    companies={data.companies}
    action={editContact ? '?/update' : '?/create'}
    onclose={() => showForm = false}
    onsuccess={() => { showForm = false; goto($page.url.toString(), { invalidateAll: true }); }}
  />
{/if}
