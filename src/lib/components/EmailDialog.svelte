<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import X from '@lucide/svelte/icons/x';

  let {
    contactId,
    contactEmail = '',
    action = '?/add_email',
    onclose,
    onsuccess
  }: {
    contactId: string;
    contactEmail?: string;
    action?: string;
    onclose?: () => void;
    onsuccess?: () => void;
  } = $props();

  let richtung = $state<'rein' | 'raus'>('raus');
  let today = $derived(new Date().toISOString().split('T')[0]);
</script>

<div class="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
  <div class="bg-surface rounded-xl border border-line shadow-xl w-full max-w-md">
    <div class="flex items-center justify-between p-5 border-b border-line">
      <h2 class="font-display font-bold text-lg text-ink">E-Mail erfassen</h2>
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
            toast.success('E-Mail gespeichert');
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
        <label class="block text-xs font-medium text-ink/60 mb-1">Richtung *</label>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => richtung = 'raus'}
            class="flex-1 py-2 text-sm rounded-lg border transition-colors {richtung === 'raus' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/70 hover:bg-cream'}"
          >
            Gesendet
          </button>
          <button
            type="button"
            onclick={() => richtung = 'rein'}
            class="flex-1 py-2 text-sm rounded-lg border transition-colors {richtung === 'rein' ? 'bg-terracotta text-white border-terracotta' : 'border-line text-ink/70 hover:bg-cream'}"
          >
            Erhalten
          </button>
        </div>
        <input type="hidden" name="richtung" value={richtung} />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="von">Von</label>
          <input
            id="von"
            name="von"
            type="email"
            value={richtung === 'rein' ? (contactEmail ?? '') : ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="absender@..."
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1" for="an">An</label>
          <input
            id="an"
            name="an"
            type="email"
            value={richtung === 'raus' ? (contactEmail ?? '') : ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="empfaenger@..."
          />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-ink/60 mb-1" for="betreff">Betreff</label>
        <input
          id="betreff"
          name="betreff"
          type="text"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          placeholder="Betreff..."
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink/60 mb-1" for="datum">Datum *</label>
        <input
          id="datum"
          name="datum"
          type="date"
          value={today}
          required
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink/60 mb-1" for="body_text">Inhalt</label>
        <textarea
          id="body_text"
          name="body_text"
          rows="4"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
          placeholder="E-Mail-Text..."
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
