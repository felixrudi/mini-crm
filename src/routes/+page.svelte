<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { formatDate, isOverdue } from '$lib/utils';
  import Users from '@lucide/svelte/icons/users';
  import Building2 from '@lucide/svelte/icons/building-2';
  import CheckSquare from '@lucide/svelte/icons/check-square';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import User from '@lucide/svelte/icons/user';

  let { data }: { data: PageData } = $props();
</script>

<div class="p-6 max-w-5xl mx-auto">
  <div class="mb-8">
    <h1 class="font-display font-bold text-2xl text-ink">Dashboard</h1>
    <p class="text-sm text-ink/50 mt-1">Übersicht</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4 mb-8">
    <a href="/contacts" class="bg-surface rounded-xl border border-line p-5 hover:border-terracotta/30 transition-colors group">
      <div class="flex items-center justify-between mb-2">
        <Users class="w-5 h-5 text-terracotta" />
        <ArrowRight class="w-4 h-4 text-ink/20 group-hover:text-terracotta transition-colors" />
      </div>
      <p class="text-3xl font-display font-bold text-ink">{data.stats?.contacts ?? 0}</p>
      <p class="text-xs text-ink/50 mt-1">Kontakte</p>
    </a>

    <a href="/companies" class="bg-surface rounded-xl border border-line p-5 hover:border-terracotta/30 transition-colors group">
      <div class="flex items-center justify-between mb-2">
        <Building2 class="w-5 h-5 text-sage" />
        <ArrowRight class="w-4 h-4 text-ink/20 group-hover:text-sage transition-colors" />
      </div>
      <p class="text-3xl font-display font-bold text-ink">{data.stats?.companies ?? 0}</p>
      <p class="text-xs text-ink/50 mt-1">Firmen</p>
    </a>

    <a href="/actions" class="bg-surface rounded-xl border border-line p-5 hover:border-terracotta/30 transition-colors group">
      <div class="flex items-center justify-between mb-2">
        <CheckSquare class="w-5 h-5 text-amber-600" />
        <ArrowRight class="w-4 h-4 text-ink/20 group-hover:text-amber-600 transition-colors" />
      </div>
      <p class="text-3xl font-display font-bold text-ink">{data.stats?.open_actions ?? 0}</p>
      <p class="text-xs text-ink/50 mt-1">Offene Aufgaben</p>
    </a>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Offene Aufgaben -->
    <div class="bg-surface rounded-xl border border-line">
      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="font-display font-semibold text-base text-ink">Offene Aufgaben</h2>
        <a href="/actions" class="text-xs text-terracotta hover:underline">Alle →</a>
      </div>
      <div class="divide-y divide-line">
        {#if data.open_actions.length === 0}
          <div class="px-5 py-8 text-center">
            <CheckSquare class="w-8 h-8 text-ink/20 mx-auto mb-2" />
            <p class="text-sm text-ink/40">Keine offenen Aufgaben</p>
          </div>
        {:else}
          {#each data.open_actions as action}
            <div class="flex items-start gap-3 px-5 py-3">
              <form
                method="POST"
                action="/actions?/toggle"
                use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'success') toast.success('Erledigt!');
                    await update();
                  };
                }}
                class="mt-0.5"
              >
                <input type="hidden" name="id" value={action.id} />
                <button type="submit" class="w-4 h-4 rounded border-2 border-ink/20 hover:border-terracotta transition-colors flex-shrink-0"></button>
              </form>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-ink font-medium">{action.titel}</p>
                <div class="flex items-center gap-3 mt-0.5">
                  {#if action.faellig_am}
                    <span class="flex items-center gap-1 text-xs {isOverdue(action.faellig_am) ? 'text-red-500 font-medium' : 'text-ink/40'}">
                      <CalendarClock class="w-3 h-3" />
                      {formatDate(action.faellig_am)}
                    </span>
                  {/if}
                  {#if action.contact_name}
                    <a href="/contacts/{action.contact_id}" class="text-xs text-terracotta hover:underline flex items-center gap-1">
                      <User class="w-3 h-3" />
                      {action.contact_name}
                    </a>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Zuletzt aktive Kontakte -->
    <div class="bg-surface rounded-xl border border-line">
      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="font-display font-semibold text-base text-ink">Zuletzt aktiv</h2>
        <a href="/contacts" class="text-xs text-terracotta hover:underline">Alle →</a>
      </div>
      <div class="divide-y divide-line">
        {#if data.recent_contacts.length === 0}
          <div class="px-5 py-8 text-center">
            <Users class="w-8 h-8 text-ink/20 mx-auto mb-2" />
            <p class="text-sm text-ink/40">Noch keine Kontakte</p>
          </div>
        {:else}
          {#each data.recent_contacts as contact}
            <a href="/contacts/{contact.id}" class="flex items-center gap-3 px-5 py-3 hover:bg-cream transition-colors">
              <div class="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                <span class="text-sm font-semibold text-terracotta">{contact.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-ink truncate">{contact.name}</p>
                <p class="text-xs text-ink/40 truncate">{contact.company_name ?? contact.rolle ?? '—'}</p>
              </div>
              {#if contact.last_activity}
                <span class="text-xs text-ink/30 flex-shrink-0">{formatDate(contact.last_activity)}</span>
              {/if}
            </a>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
