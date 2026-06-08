<script lang="ts">
  import type { Contact, Company } from '$lib/types';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import X from '@lucide/svelte/icons/x';

  let {
    contact = null,
    companies = [],
    action = '?/create',
    onclose,
    onsuccess
  }: {
    contact?: Contact | null;
    companies?: Pick<Company, 'id' | 'name'>[];
    action?: string;
    onclose?: () => void;
    onsuccess?: () => void;
  } = $props();
</script>

<div class="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
  <div class="bg-surface rounded-xl border border-line shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between p-5 border-b border-line">
      <h2 class="font-display font-bold text-lg text-ink">
        {contact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
      </h2>
      <button onclick={() => onclose?.()} class="text-ink/40 hover:text-ink transition-colors">
        <X class="w-5 h-5" />
      </button>
    </div>

    <form
      method="POST"
      {action}
      class="p-5 space-y-4"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            toast.success(contact ? 'Kontakt aktualisiert' : 'Kontakt erstellt');
            onsuccess?.();
          } else if (result.type === 'failure') {
            toast.error((result.data as any)?.error ?? 'Fehler');
          }
          await update({ reset: false });
        };
      }}
    >
      {#if contact}
        <input type="hidden" name="id" value={contact.id} />
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1" for="name">Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={contact?.name ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="Vollständiger Name"
          />
        </div>

        <div class="col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1" for="company_id">Firma</label>
          <select
            id="company_id"
            name="company_id"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          >
            <option value="">— Keine Firma —</option>
            {#each companies as company}
              <option value={company.id} selected={contact?.company_id === company.id}>{company.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="rolle">Rolle</label>
          <input
            id="rolle"
            name="rolle"
            type="text"
            value={contact?.rolle ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="z.B. Geschäftsführer"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="email">E-Mail</label>
          <input
            id="email"
            name="email"
            type="email"
            value={contact?.email ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="name@firma.at"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="telefon">Telefon</label>
          <input
            id="telefon"
            name="telefon"
            type="tel"
            value={contact?.telefon ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="+43 ..."
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="whatsapp">WhatsApp</label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="text"
            value={contact?.whatsapp ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="+43 ..."
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="wechat_id">WeChat ID</label>
          <input
            id="wechat_id"
            name="wechat_id"
            type="text"
            value={contact?.wechat_id ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="WeChat ID"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="linkedin_url">LinkedIn</label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            value={contact?.linkedin_url ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="linkedin.com/in/..."
          />
        </div>

        <div class="col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1" for="notizen">Notizen</label>
          <textarea
            id="notizen"
            name="notizen"
            rows="3"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
            placeholder="Interne Notizen..."
          >{contact?.notizen ?? ''}</textarea>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          type="button"
          onclick={() => onclose?.()}
          class="flex-1 px-4 py-2 border border-line rounded-lg text-sm text-ink/70 hover:bg-cream transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          class="flex-1 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
        >
          {contact ? 'Speichern' : 'Erstellen'}
        </button>
      </div>
    </form>
  </div>
</div>
