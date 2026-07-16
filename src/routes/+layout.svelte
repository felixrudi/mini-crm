<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { afterNavigate } from '$app/navigation';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Users from '@lucide/svelte/icons/users';
  import Building2 from '@lucide/svelte/icons/building-2';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import Menu from '@lucide/svelte/icons/menu';
  import X from '@lucide/svelte/icons/x';
  import Search from '@lucide/svelte/icons/search';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import Columns from '@lucide/svelte/icons/columns';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

  let { children } = $props();

  let mobileMenuOpen = $state(false);
  let paletteOpen = $state(false);
  let sidebarCollapsed = $state(false);
  let currentTheme = $state('light-hybrid');

  // Restore sidebar state from localStorage on mount (browser only)
  $effect(() => {
    if (browser) {
      const stored = localStorage.getItem('crm_sidebar_collapsed');
      if (stored !== null) {
        sidebarCollapsed = stored === 'true';
      }
    }
  });

  // Persist sidebar state to localStorage whenever it changes
  $effect(() => {
    if (browser) {
      localStorage.setItem('crm_sidebar_collapsed', String(sidebarCollapsed));
    }
  });

  // Restore theme from localStorage on mount (browser only)
  $effect(() => {
    if (browser) {
      const stored = localStorage.getItem('theme');
      if (stored !== null) {
        currentTheme = stored;
      }
    }
  });

  // Apply theme to document element and persist when it changes
  $effect(() => {
    if (browser) {
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
    }
  });

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/contacts', label: 'Kontakte', icon: Users },
    { href: '/companies', label: 'Firmen', icon: Building2 },
    { href: '/outreach', label: 'Outreach-Überblick', icon: Columns },
    { href: '/versand-uebersicht', label: 'Versand-Übersicht', icon: CheckCircle2 },
    { href: '/scan', label: 'Scan & Import', icon: ScanLine },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }

  // Bug-Fix (2026-07-14): mobiles Dropdown-Menü + CommandPalette leben im
  // Root-Layout, das wegen ssr=false (SPA-Mode) über SPA-Navigationen hinweg
  // bestehen bleibt. Ohne diesen Reset kann ein offen gebliebenes Overlay auf
  // der neu geladenen Unterseite hängen bleiben ("Fenster, das ich mit X
  // schließen muss" bei jedem Routenwechsel auf iPhone). afterNavigate feuert
  // bei jeder Navigation (auch der initialen) und garantiert den Reset,
  // unabhängig davon, ob der einzelne Link-Klick-Handler zuverlässig lief.
  afterNavigate(() => {
    mobileMenuOpen = false;
    paletteOpen = false;
  });
</script>

<ToastContainer />
{#if browser}
  <CommandPalette bind:open={paletteOpen} />
{/if}

<div class="h-app-shell flex bg-cream overflow-hidden">
  <!-- Sidebar Desktop -->
  <aside class="hidden md:flex flex-col bg-surface border-r border-line flex-shrink-0 transition-all duration-200 {sidebarCollapsed ? 'w-0 overflow-hidden border-r-0 opacity-0' : 'w-56'}">
    <div class="px-4 py-4 border-b border-line flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-terracotta flex items-center justify-center flex-shrink-0">
          <span class="text-white font-bold text-sm font-display">H</span>
        </div>
        <div>
          <div class="font-display font-bold text-sm text-ink leading-tight tracking-tight">Hirschfeld</div>
          <div class="text-[10px] text-ink/40 leading-tight tracking-wide uppercase">CRM</div>
        </div>
      </div>
      <button
        onclick={() => sidebarCollapsed = true}
        class="p-1 rounded-lg text-ink/40 hover:bg-cream hover:text-ink transition-colors ml-auto"
        title="Sidebar einklappen"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
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

    <div class="px-3 py-3 border-t border-line space-y-3">
      <!-- Theme Switcher -->
      <div class="flex items-center justify-between px-1">
        <span class="text-[10px] text-ink/40 uppercase font-semibold tracking-wider">Theme</span>
        <div class="flex gap-1.5">
          {#each [
            { id: 'light-hybrid', color: 'bg-[#f9f6f2] border-[#e6c5a8]', title: 'Hirschfeld Cream' },
            { id: 'dark-hirschfeld', color: 'bg-[#1a1410] border-[#3a302a]', title: 'Dunkel (Hirschfeld)' },
            { id: 'light-neumorphic', color: 'bg-[#eef0f3] border-[#dfe2e7]', title: 'Hell (Neumorphic)' },
            { id: 'light-flat', color: 'bg-[#ffffff] border-[#eeeeee]', title: 'Hell (Flat)' }
          ] as t}
            <button
              onclick={() => currentTheme = t.id}
              class="w-4 h-4 rounded-full border {t.color} {currentTheme === t.id ? 'ring-2 ring-terracotta ring-offset-2 ring-offset-surface' : 'opacity-70 hover:opacity-100'} transition-all cursor-pointer"
              title={t.title}
              aria-label={t.title}
            ></button>
          {/each}
        </div>
      </div>

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
  <div class="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-line flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
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
    <div class="md:hidden fixed top-[calc(57px+env(safe-area-inset-top))] left-0 right-0 z-40 bg-surface border-b border-line py-2 px-3 shadow-lg">
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
  <main class="flex-1 overflow-y-auto overflow-x-hidden md:pt-0 pt-[calc(57px+env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] relative">
    {#if sidebarCollapsed}
      <button
        onclick={() => sidebarCollapsed = false}
        class="hidden md:flex absolute top-4 left-4 z-30 p-2 bg-surface rounded-lg border border-line text-ink/60 hover:text-ink shadow-sm hover:bg-cream transition-colors"
        title="Sidebar ausklappen"
      >
        <Menu class="w-4 h-4" />
      </button>
    {/if}
    <div class="{sidebarCollapsed ? 'md:pl-16' : ''} transition-all duration-200">
      {@render children()}
    </div>
  </main>
</div>
