<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Users from '@lucide/svelte/icons/users';
  import Building2 from '@lucide/svelte/icons/building-2';
  import CheckSquare from '@lucide/svelte/icons/check-square';
  import Send from '@lucide/svelte/icons/send';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import Menu from '@lucide/svelte/icons/menu';
  import X from '@lucide/svelte/icons/x';
  import Search from '@lucide/svelte/icons/search';

  let { children } = $props();

  let mobileMenuOpen = $state(false);
  let paletteOpen = $state(false);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/contacts', label: 'Kontakte', icon: Users },
    { href: '/companies', label: 'Firmen', icon: Building2 },
    { href: '/actions', label: 'Aufgaben', icon: CheckSquare },
    { href: '/prospects', label: 'Prospects', icon: Send },
    { href: '/#scan', label: 'Scan & Import', icon: ScanLine },
  ];

  function isActive(href: string): boolean {
    if (href.includes('#')) return false;
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }
</script>

<ToastContainer />
{#if browser}
  <CommandPalette bind:open={paletteOpen} />
{/if}

<div class="flex h-screen bg-cream overflow-hidden">
  <!-- Sidebar Desktop -->
  <aside class="hidden md:flex flex-col w-56 bg-surface border-r border-line flex-shrink-0">
    <div class="px-4 py-4 border-b border-line">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-terracotta flex items-center justify-center flex-shrink-0">
          <span class="text-white font-bold text-sm font-display">H</span>
        </div>
        <div>
          <div class="font-display font-bold text-sm text-ink leading-tight tracking-tight">Hirschfeld</div>
          <div class="text-[10px] text-ink/40 leading-tight tracking-wide uppercase">CRM</div>
        </div>
      </div>
    </div>

    <nav class="flex-1 py-3 px-3 space-y-0.5">
      {#each navItems as item}
        {@const Icon = item.icon}
        <a
          href={item.href}
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {isActive(item.href) ? 'bg-terracotta text-white font-medium' : 'text-ink/70 hover:bg-cream hover:text-ink'}"
        >
          <Icon class="w-4 h-4 flex-shrink-0" />
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="px-3 py-3 border-t border-line">
      <button
        onclick={() => paletteOpen = true}
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink/40 hover:bg-cream hover:text-ink transition-colors border border-line"
      >
        <Search class="w-4 h-4" />
        <span class="flex-1 text-left">Suchen...</span>
        <kbd class="text-xs bg-cream border border-line rounded px-1">⌘K</kbd>
      </button>
    </div>
  </aside>

  <!-- Mobile Header -->
  <div class="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-line flex items-center justify-between px-4 py-3">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-md bg-terracotta flex items-center justify-center">
        <span class="text-white font-bold text-xs font-display">H</span>
      </div>
      <span class="font-display font-bold text-sm text-ink">Hirschfeld CRM</span>
    </div>
    <div class="flex items-center gap-2">
      <button onclick={() => paletteOpen = true} class="p-2 text-ink/60 hover:text-ink">
        <Search class="w-5 h-5" />
      </button>
      <button onclick={() => mobileMenuOpen = !mobileMenuOpen} class="p-2 text-ink/60 hover:text-ink">
        {#if mobileMenuOpen}
          <X class="w-5 h-5" />
        {:else}
          <Menu class="w-5 h-5" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile Menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden fixed inset-0 z-30 bg-ink/20" onclick={() => mobileMenuOpen = false}></div>
    <div class="md:hidden fixed top-[57px] left-0 right-0 z-40 bg-surface border-b border-line py-2 px-3 shadow-lg">
      {#each navItems as item}
        {@const Icon = item.icon}
        <a
          href={item.href}
          onclick={() => mobileMenuOpen = false}
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors {isActive(item.href) ? 'bg-terracotta text-white font-medium' : 'text-ink/70 hover:bg-cream'}"
        >
          <Icon class="w-4 h-4" />
          {item.label}
        </a>
      {/each}
    </div>
  {/if}

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto overflow-x-hidden md:pt-0 pt-[57px]">
    {@render children()}
  </main>
</div>
