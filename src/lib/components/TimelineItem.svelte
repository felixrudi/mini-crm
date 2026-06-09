<script lang="ts">
  import type { TimelineEntry } from '$lib/types';
  import { formatDate } from '$lib/utils';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { marked } from 'marked';
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
  import Maximize2 from '@lucide/svelte/icons/maximize-2';

  let { entry, contactId }: { entry: TimelineEntry; contactId: string } = $props();

  let expanded = $state(false);
  let showModal = $state(false);
  let editing = $state(false);

  const isLongNote = $derived(entry.art === 'interaction' && (entry.inhalt?.length ?? 0) > 120);
  const renderedMarkdown = $derived(entry.inhalt ? marked(entry.inhalt) as string : '');
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
        <div class="mt-1.5">
          {#if isLongNote}
            <button
              onclick={() => showModal = true}
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              <Maximize2 class="w-3.5 h-3.5" /> Memo lesen
            </button>
          {:else}
            <p class="text-sm text-ink/70">{entry.inhalt}</p>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    onclick={(e) => { if (e.target === e.currentTarget) showModal = false; }}
  >
    <div class="bg-[#faf8f5] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
      <div class="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
        <div>
          <span class="text-xs font-medium text-ink/50 uppercase tracking-wide">Notiz</span>
          {#if entry.titel}
            <h2 class="text-base font-semibold text-ink mt-0.5">{entry.titel}</h2>
          {/if}
          <p class="text-xs text-ink/40 mt-0.5">{formatDate(entry.datum)}</p>
        </div>
        <button
          onclick={() => showModal = false}
          class="p-2 rounded-lg text-ink/40 hover:text-ink hover:bg-line/50 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="overflow-y-auto px-6 py-5 flex-1">
        <div class="md-body">
          {@html renderedMarkdown}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .md-body :global(h1) { font-size: 1.25rem; font-weight: 700; color: #2c2416; margin: 1.25rem 0 0.5rem; }
  .md-body :global(h2) { font-size: 1rem; font-weight: 600; color: #2c2416; margin: 1rem 0 0.4rem; border-bottom: 1px solid #e8e2d9; padding-bottom: 0.25rem; }
  .md-body :global(h3) { font-size: 0.875rem; font-weight: 600; color: #2c2416; margin: 0.75rem 0 0.25rem; }
  .md-body :global(p) { font-size: 0.875rem; color: rgba(44,36,22,0.8); line-height: 1.6; margin: 0.5rem 0; }
  .md-body :global(ul), .md-body :global(ol) { padding-left: 1.25rem; margin: 0.5rem 0; }
  .md-body :global(li) { font-size: 0.875rem; color: rgba(44,36,22,0.8); line-height: 1.6; margin: 0.2rem 0; }
  .md-body :global(strong) { font-weight: 600; color: #2c2416; }
  .md-body :global(hr) { border: none; border-top: 1px solid #e8e2d9; margin: 1rem 0; }
  .md-body :global(blockquote) { border-left: 3px solid #c17c5a; padding-left: 0.75rem; color: rgba(44,36,22,0.6); font-style: italic; margin: 0.75rem 0; }
  .md-body :global(code) { background: #f0ebe3; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.8rem; font-family: monospace; }
</style>
