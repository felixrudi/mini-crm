<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { formatDate, isOverdue } from '$lib/utils';
  import type { Action } from '$lib/types';
  import CheckSquare from '@lucide/svelte/icons/check-square';
  import Plus from '@lucide/svelte/icons/plus';
  import Circle from '@lucide/svelte/icons/circle';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import User from '@lucide/svelte/icons/user';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

  let { data }: { data: PageData } = $props();

  let showCreate = $state(false);

  // Group by due date
  type GroupedActions = {
    overdue: Action[];
    today: Action[];
    upcoming: Action[];
    undated: Action[];
  };

  let grouped = $derived<GroupedActions>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result: GroupedActions = { overdue: [], today: [], upcoming: [], undated: [] };

    for (const action of data.actions_open) {
      if (!action.faellig_am) {
        result.undated.push(action);
      } else {
        const d = new Date(action.faellig_am);
        d.setHours(0, 0, 0, 0);
        if (d < today) result.overdue.push(action);
        else if (d.getTime() === today.getTime()) result.today.push(action);
        else result.upcoming.push(action);
      }
    }
    return result;
  });
</script>

<div class="p-6 max-w-3xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Aufgaben</h1>
      <p class="text-sm text-ink/50 mt-1">{data.actions_open.length} offene Aufgaben</p>
    </div>
    <button
      onclick={() => showCreate = !showCreate}
      class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
    >
      <Plus class="w-4 h-4" />
      Neue Aufgabe
    </button>
  </div>

  <!-- Create form -->
  {#if showCreate}
    <form
      method="POST"
      action="?/create"
      class="bg-surface rounded-xl border border-terracotta/30 p-5 mb-6"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            toast.success('Aufgabe erstellt');
            showCreate = false;
          }
          await update();
        };
      }}
    >
      <h3 class="font-display font-semibold text-base text-ink mb-4">Neue Aufgabe</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1">Titel *</label>
          <input name="titel" type="text" required placeholder="Was muss erledigt werden?"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Kontakt</label>
          <select name="contact_id"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta">
            <option value="">— Kein Kontakt —</option>
            {#each data.contacts as contact}
              <option value={contact.id}>{contact.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Fällig am</label>
          <input name="faellig_am" type="date"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-ink/60 mb-1">Notizen</label>
          <input name="notizen" type="text" placeholder="Optional..."
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick={() => showCreate = false}
          class="px-3 py-1.5 border border-line rounded-lg text-sm text-ink/60 hover:bg-cream transition-colors">Abbrechen</button>
        <button type="submit"
          class="px-3 py-1.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">Erstellen</button>
      </div>
    </form>
  {/if}

  {#if data.actions_open.length === 0}
    <div class="bg-surface rounded-xl border border-line py-16 text-center">
      <CheckSquare class="w-10 h-10 text-ink/15 mx-auto mb-3" />
      <p class="text-sm font-medium text-ink/50">Keine offenen Aufgaben</p>
      <p class="text-xs text-ink/30 mt-1">Alles erledigt — prima.</p>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Überfällig -->
      {#if grouped().overdue.length > 0}
        <div>
          <div class="flex items-center gap-2 mb-2">
            <AlertTriangle class="w-4 h-4 text-red-500" />
            <h2 class="text-xs font-semibold text-red-500 uppercase tracking-wide">Überfällig ({grouped().overdue.length})</h2>
          </div>
          <div class="bg-surface rounded-xl border border-red-200 overflow-hidden">
            {#each grouped().overdue as action}
              <div class="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
                <form method="POST" action="?/toggle" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Erledigt!'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-ink/30 hover:text-terracotta transition-colors"><Circle class="w-5 h-5" /></button>
                </form>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{action.titel}</p>
                  <div class="flex flex-wrap gap-3 mt-0.5">
                    <span class="flex items-center gap-1 text-xs text-red-500 font-medium">
                      <CalendarClock class="w-3 h-3" /> {formatDate(action.faellig_am)} (überfällig)
                    </span>
                    {#if action.contact_name}
                      <a href="/contacts/{action.contact_id}" class="flex items-center gap-1 text-xs text-terracotta hover:underline">
                        <User class="w-3 h-3" /> {action.contact_name}
                      </a>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Heute -->
      {#if grouped().today.length > 0}
        <div>
          <h2 class="text-xs font-semibold text-terracotta uppercase tracking-wide mb-2">Heute ({grouped().today.length})</h2>
          <div class="bg-surface rounded-xl border border-terracotta/20 overflow-hidden">
            {#each grouped().today as action}
              <div class="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
                <form method="POST" action="?/toggle" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Erledigt!'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-ink/30 hover:text-terracotta transition-colors"><Circle class="w-5 h-5" /></button>
                </form>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{action.titel}</p>
                  {#if action.contact_name}
                    <a href="/contacts/{action.contact_id}" class="flex items-center gap-1 text-xs text-terracotta hover:underline mt-0.5">
                      <User class="w-3 h-3" /> {action.contact_name}
                    </a>
                  {/if}
                  {#if action.notizen}<p class="text-xs text-ink/50 mt-0.5">{action.notizen}</p>{/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Kommende -->
      {#if grouped().upcoming.length > 0}
        <div>
          <h2 class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Kommend ({grouped().upcoming.length})</h2>
          <div class="bg-surface rounded-xl border border-line overflow-hidden">
            {#each grouped().upcoming as action}
              <div class="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
                <form method="POST" action="?/toggle" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Erledigt!'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-ink/30 hover:text-terracotta transition-colors"><Circle class="w-5 h-5" /></button>
                </form>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{action.titel}</p>
                  <div class="flex flex-wrap gap-3 mt-0.5">
                    <span class="flex items-center gap-1 text-xs text-ink/40">
                      <CalendarClock class="w-3 h-3" /> {formatDate(action.faellig_am)}
                    </span>
                    {#if action.contact_name}
                      <a href="/contacts/{action.contact_id}" class="flex items-center gap-1 text-xs text-terracotta hover:underline">
                        <User class="w-3 h-3" /> {action.contact_name}
                      </a>
                    {/if}
                  </div>
                  {#if action.notizen}<p class="text-xs text-ink/50 mt-0.5">{action.notizen}</p>{/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Ohne Datum -->
      {#if grouped().undated.length > 0}
        <div>
          <h2 class="text-xs font-semibold text-ink/30 uppercase tracking-wide mb-2">Ohne Datum ({grouped().undated.length})</h2>
          <div class="bg-surface rounded-xl border border-line overflow-hidden">
            {#each grouped().undated as action}
              <div class="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
                <form method="POST" action="?/toggle" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') toast.success('Erledigt!'); await update(); }}>
                  <input type="hidden" name="id" value={action.id} />
                  <button type="submit" class="mt-0.5 text-ink/30 hover:text-terracotta transition-colors"><Circle class="w-5 h-5" /></button>
                </form>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{action.titel}</p>
                  {#if action.contact_name}
                    <a href="/contacts/{action.contact_id}" class="flex items-center gap-1 text-xs text-terracotta hover:underline mt-0.5">
                      <User class="w-3 h-3" /> {action.contact_name}
                    </a>
                  {/if}
                  {#if action.notizen}<p class="text-xs text-ink/50 mt-0.5">{action.notizen}</p>{/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
