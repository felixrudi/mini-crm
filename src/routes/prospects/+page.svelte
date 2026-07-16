<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/toast';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { Prospect, ProspectStatus } from '$lib/types';
  import Send from '@lucide/svelte/icons/send';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import Upload from '@lucide/svelte/icons/upload';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import UserCheck from '@lucide/svelte/icons/user-check';
  import Pencil from '@lucide/svelte/icons/pencil';
  import X from '@lucide/svelte/icons/x';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData & { companies: {id:string, name:string}[] } } = $props();

  const STATUS_LABELS: Record<ProspectStatus, string> = {
    gesendet: 'Gesendet',
    geantwortet: 'Geantwortet',
    termin: 'Termin',
    kein_interesse: 'Kein Interesse',
    bounce: 'Bounce',
    abgesagt: 'Abgesagt',
  };

  const STATUS_COLORS: Record<ProspectStatus, string> = {
    gesendet: 'bg-blue-50 text-blue-600 border-blue-200',
    geantwortet: 'bg-amber-50 text-amber-600 border-amber-200',
    termin: 'bg-green-50 text-green-700 border-green-200',
    kein_interesse: 'bg-ink/5 text-ink/40 border-line',
    bounce: 'bg-red-50 text-red-500 border-red-200',
    abgesagt: 'bg-ink/5 text-ink/40 border-line',
  };

  let searchValue = $state(data.q ?? '');
  let showForm = $state(false);
  let editProspect = $state<Prospect | null>(null);
  let deleteConfirm = $state<string | null>(null);
  let promoteConfirm = $state<string | null>(null);
  let csvInput: HTMLInputElement;
  let importing = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout>;
  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = new URL($page.url);
      if (searchValue.trim()) url.searchParams.set('q', searchValue.trim());
      else url.searchParams.delete('q');
      goto(url.toString(), { replaceState: true });
    }, 300);
  }

  function setFilter(status: string) {
    const url = new URL($page.url);
    if (status) url.searchParams.set('status', status);
    else url.searchParams.delete('status');
    goto(url.toString(), { replaceState: true });
  }

  function countFor(s: string) {
    return (data.counts as any[]).find((c: any) => c.status === s)?.count ?? 0;
  }

  async function handleCsvFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    importing = true;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      }).filter(r => Object.values(r).some(v => v));

      const fd = new FormData();
      fd.append('rows', JSON.stringify(rows));
      const res = await fetch('?/import_csv', { method: 'POST', body: fd });
      if (res.ok) {
        toast.success(`${rows.length} Prospects importiert`);
        goto($page.url.toString(), { invalidateAll: true });
      } else {
        toast.error('Import fehlgeschlagen');
      }
    } catch {
      toast.error('Fehler beim Lesen der Datei');
    } finally {
      importing = false;
      (e.target as HTMLInputElement).value = '';
    }
  }

  // Deep-Link von der Kontakte-Seite (Tab "Outreach-Marketing"): ?edit=<id> öffnet
  // direkt die Bearbeiten-Form, ?new=1 die Neuanlage — Form bleibt hier die einzige
  // Quelle, statt sie auf der Kontakte-Seite zu duplizieren.
  $effect(() => {
    const editId = $page.url.searchParams.get('edit');
    if (editId) {
      const p = data.prospects.find((pr) => pr.id === editId);
      if (p) { editProspect = p; showForm = true; }
    } else if ($page.url.searchParams.get('new') === '1') {
      editProspect = null;
      showForm = true;
    }
  });

  function isOverdue(date: string | null) {
    if (!date) return false;
    return new Date(date) < new Date();
  }
</script>

<input bind:this={csvInput} type="file" accept=".csv" class="hidden" onchange={handleCsvFile} />

<div class="px-4 py-4 md:px-6 md:py-6 max-w-[1400px] mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
    <div>
      <h1 class="font-display font-bold text-2xl text-ink">Prospects</h1>
      <p class="text-sm text-ink/50 mt-1">{data.total} gesamt</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={() => csvInput.click()}
        disabled={importing}
        class="flex items-center gap-2 px-3 py-2 border border-line text-ink/60 rounded-lg text-sm hover:bg-cream transition-colors disabled:opacity-50"
      >
        <Upload class="w-4 h-4" />
        {importing ? 'Importiert…' : 'CSV Import'}
      </button>
      <button
        onclick={() => { editProspect = null; showForm = true; }}
        class="flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
      >
        <Plus class="w-4 h-4" />
        Neuer Prospect
      </button>
    </div>
  </div>

  <!-- Filter Chips -->
  <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
    {#each [['', 'Alle', data.total], ['gesendet', 'Gesendet', countFor('gesendet')], ['geantwortet', 'Geantwortet', countFor('geantwortet')], ['termin', 'Termin', countFor('termin')], ['kein_interesse', 'Kein Interesse', countFor('kein_interesse')], ['bounce', 'Bounce', countFor('bounce')]] as [val, label, count]}
      <button
        onclick={() => setFilter(val)}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors
          {data.status === val ? 'bg-terracotta text-white border-terracotta' : 'bg-surface border-line text-ink/60 hover:bg-cream'}"
      >
        {label}
        <span class="opacity-70">{count}</span>
      </button>
    {/each}
  </div>

  <!-- Search -->
  <div class="relative mb-4">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
    <input
      type="text"
      bind:value={searchValue}
      oninput={handleSearch}
      placeholder="Name, E-Mail oder Firma suchen…"
      class="w-full pl-9 pr-4 py-2.5 bg-surface border border-line rounded-lg text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
    />
  </div>

  <!-- Table -->
  {#if data.prospects.length === 0}
    <div class="bg-surface rounded-xl border border-line py-16 text-center">
      <Send class="w-10 h-10 text-ink/15 mx-auto mb-3" />
      <p class="text-sm font-medium text-ink/50">
        {data.q ? `Keine Treffer für „${data.q}"` : 'Noch keine Prospects'}
      </p>
      <p class="text-xs text-ink/30 mt-1">Prospect manuell anlegen oder CSV importieren</p>
    </div>
  {:else}
    <div class="bg-surface rounded-xl border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-line bg-cream/50">
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Name</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden md:table-cell">Firma</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3">Status</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden lg:table-cell">Versandt</th>
              <th class="text-left text-xs font-medium text-ink/50 px-4 py-3 hidden lg:table-cell">Follow-up</th>
              <th class="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            {#each data.prospects as prospect}
              <tr class="hover:bg-cream/50 transition-colors">
                <td class="px-4 py-3">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-ink truncate">{prospect.name}</p>
                    {#if prospect.email}
                      <p class="text-xs text-ink/40 truncate">{prospect.email}</p>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  <span class="text-sm text-ink/60">{prospect.company_name ?? prospect.firma ?? '—'}</span>
                </td>
                <td class="px-4 py-3">
                  <form method="POST" action="?/update_status" use:enhance={() => async ({ result, update }) => {
                    if (result.type === 'success') toast.success('Status geändert');
                    await update();
                  }}>
                    <input type="hidden" name="id" value={prospect.id} />
                    <select
                      name="status"
                      onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}
                      class="text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:outline-none {STATUS_COLORS[prospect.status as ProspectStatus]}"
                    >
                      {#each Object.entries(STATUS_LABELS) as [val, label]}
                        <option value={val} selected={prospect.status === val}>{label}</option>
                      {/each}
                    </select>
                  </form>
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  <span class="text-xs text-ink/50">{prospect.versandt_am ? new Date(prospect.versandt_am).toLocaleDateString('de-AT') : '—'}</span>
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  {#if prospect.followup_am}
                    <span class="text-xs {isOverdue(prospect.followup_am) ? 'text-red-500 font-medium' : 'text-ink/50'}">
                      {new Date(prospect.followup_am).toLocaleDateString('de-AT')}
                      {#if isOverdue(prospect.followup_am)} ⚠{/if}
                    </span>
                  {:else}
                    <span class="text-xs text-ink/20">—</span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <!-- Promote -->
                    {#if promoteConfirm === prospect.id}
                      <form method="POST" action="?/promote" use:enhance={() => async ({ result, update }) => {
                        if (result.type === 'success') { toast.success(`${prospect.name} ist jetzt ein Kontakt`); }
                        else toast.error('Fehler beim Promoten');
                        promoteConfirm = null;
                        await update();
                      }}>
                        <input type="hidden" name="id" value={prospect.id} />
                        <button type="submit" class="px-2 py-1 bg-green-500 text-white rounded text-xs">Ja</button>
                      </form>
                      <button onclick={() => promoteConfirm = null} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
                    {:else}
                      <button
                        onclick={() => promoteConfirm = prospect.id}
                        title="Zu Kontakt machen"
                        class="p-1.5 text-ink/30 hover:text-green-600 transition-colors rounded"
                      >
                        <UserCheck class="w-3.5 h-3.5" />
                      </button>
                    {/if}

                    <button
                      onclick={() => { editProspect = prospect; showForm = true; }}
                      class="p-1.5 text-ink/30 hover:text-terracotta transition-colors rounded"
                      title="Bearbeiten"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>

                    {#if deleteConfirm === prospect.id}
                      <form method="POST" action="?/delete" use:enhance={() => async ({ result, update }) => {
                        if (result.type === 'success') toast.success('Gelöscht');
                        deleteConfirm = null;
                        await update();
                      }}>
                        <input type="hidden" name="id" value={prospect.id} />
                        <button type="submit" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Ja</button>
                      </form>
                      <button onclick={() => deleteConfirm = null} class="px-2 py-1 border border-line rounded text-xs">Nein</button>
                    {:else}
                      <button
                        onclick={() => deleteConfirm = prospect.id}
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

<!-- Prospect Form Drawer -->
{#if showForm}
  <div class="fixed inset-0 bg-ink/20 z-40" onclick={() => showForm = false}></div>
  <div
    class="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-surface shadow-2xl flex flex-col"
    transition:fly={{ x: 520, duration: 250 }}
  >
    <div class="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
      <h2 class="font-display font-bold text-lg text-ink">
        {editProspect ? 'Prospect bearbeiten' : 'Neuer Prospect'}
      </h2>
      <button onclick={() => showForm = false} class="text-ink/40 hover:text-ink p-1">
        <X class="w-5 h-5" />
      </button>
    </div>

    <form
      method="POST"
      action={editProspect ? '?/update' : '?/create'}
      class="flex-1 overflow-y-auto"
      use:enhance={() => async ({ result, update }) => {
        if (result.type === 'success') {
          toast.success(editProspect ? 'Gespeichert' : 'Prospect angelegt');
          showForm = false;
        } else {
          toast.error('Fehler');
        }
        await update();
      }}
    >
      {#if editProspect}<input type="hidden" name="id" value={editProspect.id} />{/if}

      <div class="px-6 py-5 space-y-4">

        <div class="grid grid-cols-2 gap-3">
          {#each [['titel', 'Titel', 'Dr., Mag. …'], ['anrede', '', ''], ['vorname', 'Vorname', 'Felix'], ['nachname', 'Nachname', 'Hirschfeld']] as [field, label, ph]}
            {#if field === 'anrede'}
              <div>
                <label class="block text-xs font-medium text-ink/60 mb-1">Anrede</label>
                <div class="flex gap-3 pt-1">
                  {#each ['Herr', 'Frau'] as opt}
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="anrede" value={opt} checked={editProspect?.anrede === opt} class="accent-terracotta" />
                      <span class="text-sm">{opt}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {:else}
              <div>
                <label class="block text-xs font-medium text-ink/60 mb-1">{label}</label>
                <input name={field} type="text" value={editProspect ? (editProspect as any)[field] ?? '' : ''}
                  placeholder={ph}
                  class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
              </div>
            {/if}
          {/each}
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Name (automatisch oder manuell)</label>
          <input name="name" type="text" value={editProspect?.name ?? ''}
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="Mag. Gabriele Bauer" required />
        </div>

        <!-- Firma: Selector für bestehende Companies + Freitext -->
        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Firma (bestehende verknüpfen)</label>
          <select name="company_id" class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta">
            <option value="">— Keine / Neue Firma —</option>
            {#each data.companies as co}
              <option value={co.id} selected={editProspect?.company_id === co.id}>{co.name}</option>
            {/each}
          </select>
        </div>

        {#each [['email', 'E-Mail', 'name@kanzlei.at', 'email'], ['firma', 'Firma / Kanzlei (Freitext)', 'Bauer & Partner StB', 'text'], ['rolle', 'Rolle', 'Steuerberaterin', 'text'], ['telefon', 'Telefon', '+43 …', 'tel'], ['website', 'Website', 'www.kanzlei.at', 'url']] as [name, label, ph, type]}
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">{label}</label>
            <input {name} type={type} value={editProspect ? (editProspect as any)[name] ?? '' : ''}
              placeholder={ph}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
        {/each}

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Status</label>
            <select name="status" class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta">
              {#each Object.entries(STATUS_LABELS) as [val, label]}
                <option value={val} selected={editProspect?.status === val || (!editProspect && val === 'gesendet')}>{label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Kanal</label>
            <select name="kanal" class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta">
              {#each ['email', 'linkedin', 'telefon', 'event', 'sonstiges'] as k}
                <option value={k} selected={editProspect?.kanal === k || (!editProspect && k === 'email')}>{k}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Versandt am</label>
            <input name="versandt_am" type="date" value={editProspect?.versandt_am?.slice(0,10) ?? ''}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Follow-up</label>
            <input name="followup_am" type="date" value={editProspect?.followup_am?.slice(0,10) ?? ''}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-ink/60 mb-1">Notizen</label>
          <textarea name="notizen" rows="3"
            class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="Interne Notizen…">{editProspect?.notizen ?? ''}</textarea>
        </div>

      </div>

      <div class="flex gap-3 px-6 py-4 border-t border-line bg-surface flex-shrink-0">
        <button type="button" onclick={() => showForm = false}
          class="flex-1 px-4 py-2.5 border border-line rounded-lg text-sm text-ink/70 hover:bg-cream transition-colors">
          Abbrechen
        </button>
        <button type="submit"
          class="flex-1 px-4 py-2.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors">
          {editProspect ? 'Speichern' : 'Anlegen'}
        </button>
      </div>
    </form>
  </div>
{/if}
