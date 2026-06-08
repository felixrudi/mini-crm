<script lang="ts">
  import type { TimelineEntry } from '$lib/types';
  import { formatDate } from '$lib/utils';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import Phone from '@lucide/svelte/icons/phone';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import StickyNote from '@lucide/svelte/icons/sticky-note';
  import Users from '@lucide/svelte/icons/users';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MessagesSquare from '@lucide/svelte/icons/messages-square';
  import Linkedin from '@lucide/svelte/icons/linkedin';
  import MessageSquare from '@lucide/svelte/icons/message-square';
  import Circle from '@lucide/svelte/icons/circle';
  import MailOpen from '@lucide/svelte/icons/mail-open';
  import Send from '@lucide/svelte/icons/send';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';

  let { entry, contactId }: { entry: TimelineEntry; contactId: string } = $props();

  let expanded = $state(false);
  let editing = $state(false);
  let editTitel = $state('');
  let editInhalt = $state('');

  function startEdit() {
    editTitel = entry.titel ?? '';
    editInhalt = entry.inhalt ?? '';
    editing = true;
  }

  const iconMap: Record<string, any> = {
    telefonat: Phone,
    besuch: MapPin,
    notiz: StickyNote,
    meeting: Users,
    whatsapp: MessageCircle,
    wechat: MessagesSquare,
    linkedin: Linkedin,
    signal: MessageSquare,
    sonstiges: Circle,
    'email rein': MailOpen,
    'email raus': Send,
    rein: MailOpen,
    raus: Send,
  };

  const colorMap: Record<string, string> = {
    telefonat: 'text-terracotta',
    besuch: 'text-sage',
    notiz: 'text-amber-600',
    meeting: 'text-blue-600',
    whatsapp: 'text-green-600',
    wechat: 'text-green-700',
    linkedin: 'text-blue-700',
    signal: 'text-blue-500',
    rein: 'text-terracotta',
    raus: 'text-sage',
    'email rein': 'text-terracotta',
    'email raus': 'text-sage',
  };

  let Icon = $derived(iconMap[entry.subtyp?.toLowerCase()] ?? Circle);
  let iconColor = $derived(colorMap[entry.subtyp?.toLowerCase()] ?? 'text-ink/40');

  let label = $derived(() => {
    if (entry.art === 'email') {
      return entry.subtyp === 'rein' ? 'E-Mail erhalten' : 'E-Mail gesendet';
    }
    return entry.subtyp?.charAt(0).toUpperCase() + entry.subtyp?.slice(1);
  });

  const deleteAction = $derived(
    entry.art === 'email'
      ? `/contacts/${contactId}?/delete_email`
      : `/contacts/${contactId}?/delete_interaction`
  );
  const updateAction = $derived(
    entry.art === 'email'
      ? `/contacts/${contactId}?/update_email`
      : `/contacts/${contactId}?/update_interaction`
  );
</script>

<div class="flex gap-3 py-3 border-b border-line last:border-0 group">
  <div class="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-cream flex items-center justify-center border border-line">
    <Icon class="w-4 h-4 {iconColor}" />
  </div>
  <div class="flex-1 min-w-0">
    {#if editing}
      <form
        method="POST"
        action={updateAction}
        use:enhance={() => async ({ result, update }) => {
          if (result.type === 'success') { toast.success('Gespeichert'); editing = false; }
          else toast.error('Fehler');
          await update();
        }}
      >
        <input type="hidden" name="id" value={entry.eintrag_id} />
        <div class="space-y-2 mb-2">
          <input
            name={entry.art === 'email' ? 'betreff' : 'zusammenfassung'}
            type="text"
            bind:value={editTitel}
            placeholder={entry.art === 'email' ? 'Betreff' : 'Zusammenfassung'}
            class="w-full px-2 py-1.5 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          />
          <textarea
            name={entry.art === 'email' ? 'body_text' : 'text'}
            rows="3"
            bind:value={editInhalt}
            placeholder="Text / Notiz…"
            class="w-full px-2 py-1.5 bg-cream border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
          ></textarea>
        </div>
        <div class="flex gap-1.5">
          <button type="submit" class="flex items-center gap-1 px-2.5 py-1 bg-terracotta text-white rounded-lg text-xs font-medium hover:bg-terracotta/90 transition-colors">
            <Check class="w-3 h-3" /> Speichern
          </button>
          <button type="button" onclick={() => editing = false} class="flex items-center gap-1 px-2.5 py-1 border border-line text-ink/60 rounded-lg text-xs hover:bg-cream transition-colors">
            <X class="w-3 h-3" /> Abbrechen
          </button>
        </div>
      </form>
    {:else}
      <div class="flex items-start justify-between gap-2">
        <div>
          <span class="text-xs font-medium text-ink/60 uppercase tracking-wide">{label()}</span>
          {#if entry.titel}
            <p class="text-sm font-medium text-ink mt-0.5">{entry.titel}</p>
          {/if}
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="text-xs text-ink/40">{formatDate(entry.datum)}</span>
          <button
            type="button"
            onclick={startEdit}
            class="p-1 text-ink/20 hover:text-terracotta transition-colors opacity-0 group-hover:opacity-100"
            title="Bearbeiten"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <form
            method="POST"
            action={deleteAction}
            use:enhance={() => async ({ result, update }) => {
              if (result.type === 'success') toast.success('Gelöscht');
              else toast.error('Fehler');
              await update();
            }}
            onsubmit={(e) => { if (!confirm('Eintrag löschen?')) e.preventDefault(); }}
          >
            <input type="hidden" name="id" value={entry.eintrag_id} />
            <button type="submit" class="p-1 text-ink/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Löschen">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
      {#if entry.inhalt}
        <div class="mt-1">
          {#if expanded}
            <p class="text-sm text-ink/70 whitespace-pre-wrap">{entry.inhalt}</p>
            <button onclick={() => expanded = false} class="text-xs text-terracotta mt-1 hover:underline">
              Weniger anzeigen
            </button>
          {:else}
            <p class="text-sm text-ink/70 line-clamp-2">{entry.inhalt}</p>
            {#if entry.inhalt.length > 120}
              <button onclick={() => expanded = true} class="text-xs text-terracotta mt-1 hover:underline">
                Mehr anzeigen
              </button>
            {/if}
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
