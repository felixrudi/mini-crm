<script lang="ts">
  import { toasts } from '$lib/toast';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
  {#each $toasts as t (t.id)}
    <div class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
      {t.type === 'success' ? 'bg-[#e6c5a8] text-[#2b221d]' : t.type === 'error' ? 'bg-[#904446] text-white' : 'bg-[#2b221d] text-white'}"
      role={t.type === 'error' ? 'alert' : 'status'}>
      {t.message}
    </div>
  {/each}
</div>
