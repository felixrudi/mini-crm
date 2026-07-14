<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  import Lock from '@lucide/svelte/icons/lock';

  let { form }: { form: ActionData } = $props();
  let password = $state('');
  let loading = $state(false);
</script>

<div class="min-h-screen bg-cream flex items-center justify-center p-4">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="flex items-center justify-center gap-3 mb-8">
      <div class="w-10 h-10 rounded-xl bg-terracotta flex items-center justify-center">
        <span class="text-white font-bold text-lg font-display">H</span>
      </div>
      <div>
        <div class="font-display font-bold text-lg text-ink leading-tight">Hirschfeld</div>
        <div class="text-xs text-ink/40 leading-tight tracking-wide uppercase">CRM</div>
      </div>
    </div>

    <div class="bg-surface rounded-2xl border border-line p-8 shadow-sm">
      <h1 class="font-display font-bold text-xl text-ink mb-6 text-center">Anmelden</h1>

      <form
        method="POST"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            loading = false;
            await update();
          };
        }}
      >
        <div class="mb-4">
          <label class="block text-xs font-medium text-ink/60 mb-1.5" for="password">Passwort</label>
          <div class="relative">
            <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
            <input
              id="password"
              name="password"
              type="password"
              bind:value={password}
              required
              autofocus
              class="w-full pl-9 pr-4 py-2.5 bg-cream border border-line rounded-lg text-base text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              placeholder="••••••••"
            />
          </div>
        </div>

        {#if form?.error}
          <p class="text-xs text-red-500 mb-3">{form.error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full py-2.5 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors disabled:opacity-60"
        >
          {loading ? 'Prüfen…' : 'Anmelden'}
        </button>
      </form>
    </div>
  </div>
</div>
