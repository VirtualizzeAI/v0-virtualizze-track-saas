<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';

  const { user, isAuthenticated, isSuperAdmin, isManager, login, logout, updateUser } = authStore;

  let { currentPath, collapsed = false } = $props();

  const menuItems = $derived.by(() => {
    const items = [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
      },
      {
        name: 'Leads',
        path: '/leads',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
      }
    ];

    if ($user && $user.role !== 'funcionario') {
      items.push({
        name: 'Cursos e Turmas',
        path: '/cursos',
        icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222'
      });
    }

    if ($user && $user.role !== 'funcionario') {
      items.push({
        name: 'Funcionários',
        path: '/funcionarios',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
      });
    }

    items.push(
      {
        name: 'Disparo em Massa',
        path: '/disparo',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
      },
      {
        name: 'Perfil',
        path: '/perfil',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
      }
    );

    return items;
  });

  function handleLogout() {
    logout();
    goto('/');
  }
</script>

<!-- Sidebar com largura dinâmica e transição suave -->
<aside class="bg-zinc-900 h-screen flex flex-col border-r-2 border-green-600 fixed left-0 top-0 overflow-hidden transition-all duration-300 {collapsed ? 'w-20' : 'w-64'} z-50">
  <!-- Header -->
  <div class="p-6 border-b border-zinc-800 flex-shrink-0">
    <div class="flex items-center gap-3 {collapsed ? 'justify-center' : ''}">
      <!-- Logo com verde direto -->
      <div class="w-10 h-10 rounded-lg bg-green-600/10 border border-green-600/30 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      {#if !collapsed}
        <div class="flex-1 overflow-hidden">
          <h1 class="font-bold text-white text-sm truncate">Virtualizze Track</h1>
          {#if $user}
            <p class="text-xs text-zinc-400 truncate">
              {$user.companyName || 'Carregando...'}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
    {#each menuItems as item}
      <!-- Item ativo com verde direto -->
      <a
        href={item.path}
        class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {collapsed ? 'justify-center' : ''} {currentPath === item.path
          ? 'bg-green-600 text-white font-medium'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}"
        title={collapsed ? item.name : ''}
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}/>
        </svg>
        {#if !collapsed}
          <span class="text-sm truncate">{item.name}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <!-- Footer -->
  <div class="p-4 border-t border-zinc-800 flex-shrink-0 space-y-2">
    <!-- Botão Recolher com verde escuro -->
    <button
      onclick={() => collapsed = !collapsed}
      class="w-full flex items-center {collapsed ? 'justify-center' : 'justify-center'} gap-2 px-4 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-500 transition-colors"
      title={collapsed ? 'Expandir menu' : 'Recolher menu'}
    >
      {#if collapsed}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
        </svg>
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
        </svg>
        <span class="text-xs">Recolher</span>
      {/if}
    </button>

    <!-- Botão Sair com verde vibrante -->
    <button
      onclick={handleLogout}
      class="w-full flex items-center {collapsed ? 'justify-center' : 'justify-center'} gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
      title={collapsed ? 'Sair' : ''}
    >
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
      </svg>
      {#if !collapsed}
        <span class="text-sm font-medium">Sair</span>
      {/if}
    </button>
  </div>
</aside>
