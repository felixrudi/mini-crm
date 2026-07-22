<script lang="ts">
  import { page } from '$app/state';
  import { fly } from 'svelte/transition';
  import { parseDetailParam, closeDetail, type DetailTarget } from '$lib/detail-panel';
  import ContactDetailView from '$lib/components/ContactDetailView.svelte';
  import CompanyDetailView from '$lib/components/CompanyDetailView.svelte';
  import X from '@lucide/svelte/icons/x';
  import ExternalLink from '@lucide/svelte/icons/external-link';

  let detail = $derived(parseDetailParam(page.url.searchParams.get('detail')));

  let title = $derived(
    detail?.type === 'contact' ? 'Kontakt' : detail?.type === 'company' ? 'Firma' : ''
  );

  let fullHref = $derived(
    detail?.type === 'contact'
      ? `/contacts/${detail.id}`
      : detail?.type === 'company'
        ? `/companies/${detail.id}`
        : '#'
  );

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && detail) {
      e.preventDefault();
      closeDetail();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if detail}
  <!-- Mobile backdrop -->
  <button
    type="button"
    class="md:hidden fixed inset-0 z-40 bg-ink/25"
    aria-label="Panel schließen"
    onclick={closeDetail}
  ></button>

  <aside
    class="fixed md:static inset-y-0 right-0 z-50 md:z-auto flex flex-col w-full sm:w-[min(28rem,100%)] md:w-[min(32rem,42vw)] lg:w-[min(36rem,40vw)] flex-shrink-0 bg-surface border-l border-line shadow-2xl md:shadow-none h-full max-h-full"
    transition:fly={{ x: 40, duration: 200 }}
    aria-label="{title}-Details"
  >
    <header class="flex items-center justify-between gap-2 px-4 py-3 border-b border-line flex-shrink-0 bg-surface">
      <div class="min-w-0">
        <p class="text-[10px] font-semibold text-ink/40 uppercase tracking-wider">{title}</p>
      </div>
      <div class="flex items-center gap-1">
        <a
          href={fullHref}
          class="p-1.5 text-ink/40 hover:text-ink rounded-lg hover:bg-cream transition-colors"
          title="Als eigene Seite öffnen"
        >
          <ExternalLink class="w-4 h-4" />
        </a>
        <button
          type="button"
          onclick={closeDetail}
          class="p-1.5 text-ink/40 hover:text-ink rounded-lg hover:bg-cream transition-colors"
          title="Schließen (Esc)"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </header>

    <div class="flex-1 min-h-0 overflow-y-auto">
      {#key `${detail.type}:${detail.id}`}
        {#if detail.type === 'contact'}
          <ContactDetailView contactId={detail.id} />
        {:else}
          <CompanyDetailView companyId={detail.id} />
        {/if}
      {/key}
    </div>
  </aside>
{/if}
