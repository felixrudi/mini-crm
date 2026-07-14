<script lang="ts">
  import type { Contact, Company } from '$lib/types';
  import { enhance } from '$app/forms';
  import { fly } from 'svelte/transition';
  import { toast } from '$lib/toast';
  import X from '@lucide/svelte/icons/x';
  import Camera from '@lucide/svelte/icons/camera';
  import Loader from '@lucide/svelte/icons/loader';
  import TagInput from './TagInput.svelte';

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

  let vorname = $state(contact?.vorname ?? '');
  let nachname = $state(contact?.nachname ?? '');
  let titel = $state(contact?.titel ?? '');
  let anrede = $state(contact?.anrede ?? '');
  let email = $state(contact?.email ?? '');
  let telefon = $state(contact?.telefon ?? '');
  let rolle = $state(contact?.rolle ?? '');
  let strasse = $state(contact?.strasse ?? '');
  let plz = $state(contact?.plz ?? '');
  let ort = $state(contact?.ort ?? '');
  let tags = $state<string[]>(contact?.tags ?? []);
  let displayName = $state(contact?.name ?? '');

  let scanning = $state(false);
  let fileInput: HTMLInputElement;

  function syncName() {
    const computed = [vorname, nachname].filter(Boolean).join(' ');
    if (computed) displayName = computed;
  }

  async function handleCardScan(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    scanning = true;
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/extract-card', { method: 'POST', body: fd });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      const d = await res.json();
      if (d.vorname) vorname = d.vorname;
      if (d.nachname) nachname = d.nachname;
      if (d.titel) titel = d.titel;
      if (d.anrede) anrede = d.anrede;
      if (d.email) email = d.email;
      if (d.telefon) telefon = d.telefon;
      if (d.rolle) rolle = d.rolle;
      if (d.strasse) strasse = d.strasse;
      if (d.plz) plz = d.plz;
      if (d.ort) ort = d.ort;
      const computed = [d.vorname, d.nachname].filter(Boolean).join(' ');
      if (computed) displayName = computed;
      else if (d.name) displayName = d.name;
      toast.success('Visitenkarte erkannt');
    } catch (err: any) {
      toast.error(err?.message?.slice(0, 120) || 'Erkennung fehlgeschlagen');
    } finally {
      scanning = false;
    }
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 bg-ink/20 z-40"
  onclick={() => onclose?.()}
></div>

<!-- Drawer -->
<div
  class="fixed inset-y-0 right-0 z-50 w-full sm:w-[640px] bg-surface shadow-2xl flex flex-col"
  transition:fly={{ x: 640, duration: 250 }}
>
  <!-- Hidden file input for camera/upload -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    capture="environment"
    class="hidden"
    onchange={handleCardScan}
  />

  <!-- Header -->
  <div class="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
    <h2 class="font-display font-bold text-lg text-ink">
      {contact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
    </h2>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => fileInput.click()}
        disabled={scanning}
        title="Visitenkarte scannen"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-line text-ink/70 hover:bg-cream hover:text-terracotta transition-colors disabled:opacity-50"
      >
        {#if scanning}
          <Loader class="w-4 h-4 animate-spin" />
          <span>Scannen…</span>
        {:else}
          <Camera class="w-4 h-4" />
          <span>Visitenkarte</span>
        {/if}
      </button>
      <button onclick={() => onclose?.()} class="text-ink/40 hover:text-ink transition-colors p-1">
        <X class="w-5 h-5" />
      </button>
    </div>
  </div>

  <!-- Scrollable Form -->
  <form
    method="POST"
    {action}
    class="flex-1 overflow-y-auto"
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
    <div class="px-6 py-5 space-y-6">

      <!-- Persönlich -->
      <section>
        <h3 class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Persönlich</h3>
        <div class="space-y-3">

          <!-- Anrede -->
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1.5">Anrede</label>
            <div class="flex gap-2">
              {#each ['Herr', 'Frau'] as option}
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="anrede" value={option} checked={anrede === option}
                    onchange={() => anrede = option} class="accent-terracotta" />
                  <span class="text-sm text-ink">{option}</span>
                </label>
              {/each}
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="anrede" value="" checked={!anrede}
                  onchange={() => anrede = ''} class="accent-terracotta" />
                <span class="text-sm text-ink/50">—</span>
              </label>
            </div>
          </div>

          <!-- Titel -->
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1" for="titel">Titel</label>
            <input id="titel" name="titel" type="text" bind:value={titel}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="Dr., Mag., DI …" />
          </div>

          <!-- Vorname + Nachname -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="vorname">Vorname</label>
              <input id="vorname" name="vorname" type="text" bind:value={vorname} oninput={syncName}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="Felix" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="nachname">Nachname</label>
              <input id="nachname" name="nachname" type="text" bind:value={nachname} oninput={syncName}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="Hirschfeld" />
            </div>
          </div>

          <!-- Anzeigename -->
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1" for="name_field">
              Anzeigename <span class="font-normal text-ink/30">(wird automatisch gesetzt)</span>
            </label>
            <input
              id="name_field" name="name" type="text"
              bind:value={displayName}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="Wird aus Vorname + Nachname befüllt" />
          </div>

          <!-- Geburtstag -->
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1" for="geburtstag">Geburtstag</label>
            <input
              id="geburtstag" name="geburtstag" type="date"
              value={contact?.geburtstag ? contact.geburtstag.slice(0, 10) : ''}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
          </div>
        </div>
      </section>

      <!-- Beruflich -->
      <section>
        <h3 class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Beruflich</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1" for="company_id">Firma</label>
            <select
              id="company_id" name="company_id"
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            >
              <option value="">— Keine Firma —</option>
              {#each companies as company}
                <option value={company.id} selected={contact?.company_id === company.id}>{company.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1" for="rolle">Rolle</label>
            <input id="rolle" name="rolle" type="text" bind:value={rolle}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="z.B. Geschäftsführer" />
          </div>
        </div>
      </section>

      <!-- Kontakt -->
      <section>
        <h3 class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Kontakt</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1" for="email">E-Mail</label>
            <input id="email" name="email" type="email" bind:value={email}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="name@firma.at" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="telefon">Telefon</label>
              <input id="telefon" name="telefon" type="tel" bind:value={telefon}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="+43 …" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="whatsapp">WhatsApp</label>
              <input id="whatsapp" name="whatsapp" type="text" value={contact?.whatsapp ?? ''}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="+43 …" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="wechat_id">WeChat ID</label>
              <input id="wechat_id" name="wechat_id" type="text" value={contact?.wechat_id ?? ''}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="WeChat ID" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="linkedin_url">LinkedIn</label>
              <input id="linkedin_url" name="linkedin_url" type="url" value={contact?.linkedin_url ?? ''}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="linkedin.com/in/…" />
            </div>
          </div>
        </div>
      </section>

      <!-- Adresse -->
      <section>
        <h3 class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Adresse</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1" for="strasse">Straße</label>
            <input id="strasse" name="strasse" type="text" bind:value={strasse}
              class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="Musterstraße 1/2" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="plz">PLZ</label>
              <input id="plz" name="plz" type="text" bind:value={plz}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="1010" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium text-ink/60 mb-1" for="ort">Ort</label>
              <input id="ort" name="ort" type="text" bind:value={ort}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="Wien" />
            </div>
          </div>
        </div>
      </section>

      <!-- Weiteres -->
      <section>
        <h3 class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Weiteres</h3>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="telefon2">2. Telefon</label>
              <input id="telefon2" name="telefon2" type="tel" value={contact?.telefon2 ?? ''}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="+43 …" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink/60 mb-1" for="iban">IBAN / Konto</label>
              <input id="iban" name="iban" type="text" value={contact?.iban ?? ''}
                class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="AT61 1904 3002 …" />
            </div>
          </div>
          <!-- Tags -->
          <div>
            <label class="block text-xs font-medium text-ink/60 mb-1">Tags</label>
            <TagInput bind:tags placeholder="privat, schüler … Enter" />
          </div>
        </div>
      </section>

      <!-- Notizen -->
      <section>
        <h3 class="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-3">Notizen</h3>
        <textarea
          name="notizen" rows="3"
          class="w-full px-3 py-2 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
          placeholder="Interne Notizen…"
        >{contact?.notizen ?? ''}</textarea>
      </section>

    </div>

    <!-- Footer -->
    <div class="flex gap-3 px-6 py-4 border-t border-line flex-shrink-0 bg-surface">
      <button
        type="button"
        onclick={() => onclose?.()}
        class="flex-1 px-4 py-2.5 border border-line rounded-lg text-sm text-ink/70 hover:bg-cream transition-colors"
      >
        Abbrechen
      </button>
      <button
        type="submit"
        class="flex-1 px-4 py-2.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
      >
        {contact ? 'Speichern' : 'Erstellen'}
      </button>
    </div>
  </form>
</div>
