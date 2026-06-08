<script lang="ts">
  import type { TimelineEntry } from '$lib/types';
  import { formatDate } from '$lib/utils';
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

  let { entry }: { entry: TimelineEntry } = $props();

  let expanded = $state(false);

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
</script>

<div class="flex gap-3 py-3 border-b border-line last:border-0">
  <div class="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-cream flex items-center justify-center border border-line">
    <Icon class="w-4 h-4 {iconColor}" />
  </div>
  <div class="flex-1 min-w-0">
    <div class="flex items-start justify-between gap-2">
      <div>
        <span class="text-xs font-medium text-ink/60 uppercase tracking-wide">{label()}</span>
        {#if entry.titel}
          <p class="text-sm font-medium text-ink mt-0.5">{entry.titel}</p>
        {/if}
      </div>
      <span class="text-xs text-ink/40 flex-shrink-0">{formatDate(entry.datum)}</span>
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
  </div>
</div>
