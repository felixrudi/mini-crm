<script lang="ts">
  import type { Action } from '$lib/types';
  import { formatDate, isOverdue } from '$lib/utils';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { openContact } from '$lib/detail-panel';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import Circle from '@lucide/svelte/icons/circle';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import User from '@lucide/svelte/icons/user';

  let { action, showContact = false }: { action: Action; showContact?: boolean } = $props();

  let overdue = $derived(action.status === 'offen' && isOverdue(action.faellig_am));
</script>

<div class="flex gap-3 py-2.5 border-b border-line last:border-0 group">
  <form
    method="POST"
    action="?/toggle"
    use:enhance={() => {
      return async ({ result, update }) => {
        if (result.type === 'success') {
          toast.success(action.status === 'offen' ? 'Erledigt!' : 'Wieder offen');
        }
        await update();
      };
    }}
    class="flex-shrink-0 mt-0.5"
  >
    <input type="hidden" name="id" value={action.id} />
    <button type="submit" class="text-ink/30 hover:text-terracotta transition-colors">
      {#if action.status === 'erledigt'}
        <CheckCircle2 class="w-5 h-5 text-sage" />
      {:else}
        <Circle class="w-5 h-5" />
      {/if}
    </button>
  </form>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium {action.status === 'erledigt' ? 'line-through text-ink/40' : 'text-ink'}">{action.titel}</p>
    <div class="flex flex-wrap gap-3 mt-0.5">
      {#if action.faellig_am}
        <span class="flex items-center gap-1 text-xs {overdue ? 'text-red-500 font-medium' : 'text-ink/50'}">
          <CalendarClock class="w-3 h-3" />
          {formatDate(action.faellig_am)}
          {#if overdue}<span>(überfällig)</span>{/if}
        </span>
      {/if}
      {#if showContact && action.contact_name}
        <a href="/contacts/{action.contact_id}" onclick={(e) => { e.preventDefault(); openContact(action.contact_id); }} class="flex items-center gap-1 text-xs text-terracotta hover:underline">
          <User class="w-3 h-3" />
          {action.contact_name}
        </a>
      {/if}
    </div>
    {#if action.notizen}
      <p class="text-xs text-ink/50 mt-1">{action.notizen}</p>
    {/if}
  </div>
</div>
