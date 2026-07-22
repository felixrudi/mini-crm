<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import X from '@lucide/svelte/icons/x';

  let {
    contactId = '',
    action = '?/add_interaction',
    onclose,
    onsuccess
  }: {
    contactId?: string;
    action?: string;
    onclose?: () => void;
    onsuccess?: () => void;
  } = $props();

  const typen = [
    'telefonat', 'besuch', 'notiz', 'meeting',
    'whatsapp', 'wechat', 'linkedin', 'signal', 'sonstiges'
  ];

  let today = $derived(new Date().toISOString().split('T')[0]);
</script>

<div class="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
  <div class="bg-surface rounded-xl border border-line shadow-xl w-full max-w-md">
    <div class="flex items-center justify-between p-5 border-b border-line">
      <h2 class="font-display font-bold text-lg text-ink">Interaktion erfassen</h2>
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
            toast.success('Interaktion gespeichert');
            onsuccess?.();
            onclose?.();
          } else {
            toast.error('Fehler beim Speichern');
          }
          await update();
        };
      }}
    >
      <input type="hidden" name="contact_id" value={contactId} />

      <div>
        <label class="block text-xs font-medium text-ink/60 mb-1" for="typ">Typ *</label>
        <select
          id="typ"
          name="typ"
          required
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta capitalize"
        >
          {#each typen as typ}
            <option value={typ} class="capitalize">{typ.charAt(0).toUpperCase() + typ.slice(1)}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-ink/60 mb-1" for="datum">Datum *</label>
        <input
          id="datum"
          name="datum"
          type="date"
          value={today}
          required
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink/60 mb-1" for="zusammenfassung">Zusammenfassung</label>
        <input
          id="zusammenfassung"
          name="zusammenfassung"
          type="text"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          placeholder="Kurze Zusammenfassung..."
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink/60 mb-1" for="text">Details</label>
        <textarea
          id="text"
          name="text"
          rows="4"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
          placeholder="Ausführliche Notizen..."
        ></textarea>
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
          Speichern
        </button>
      </div>
    </form>
  </div>
</div>
