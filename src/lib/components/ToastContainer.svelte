<script lang="ts">
  import { toasts } from '$lib/toast';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
  {#each $toasts as t (t.id)}
    <div class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all
      {t.type === 'success' ? 'bg-sage' : t.type === 'error' ? 'bg-red-500' : 'bg-ink'}">
      {t.message}
    </div>
  {/each}
</div>
