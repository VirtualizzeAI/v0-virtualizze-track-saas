<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';

  let isAuthenticated = false;
  let sidebarCollapsed = $state(false);
  
  let isFranqueadoraValue = $state(false);
  let selectedCompanyValue = $state(null);

  onMount(() => {
    const unsubAuth = authStore.isAuthenticated.subscribe((value) => {
      isAuthenticated = value;
      if (!value) {
        goto('/');
      }
    });
    
    const unsubFranqueadora = authStore.isFranqueadora.subscribe(value => {
      isFranqueadoraValue = value;
    });
    
    const unsubSelectedCompany = authStore.selectedCompany.subscribe(value => {
      selectedCompanyValue = value;
    });

    return () => {
      unsubAuth();
      unsubFranqueadora();
      unsubSelectedCompany();
    };
  });
</script>

<div class="flex min-h-screen bg-zinc-950">
  <Sidebar currentPath="/disparo" bind:collapsed={sidebarCollapsed} />
  
  <main class="flex-1 p-8 transition-all duration-300" style="margin-left: {sidebarCollapsed ? '5rem' : '16rem'}">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Disparo em Massa</h1>
      <p class="text-zinc-400">Envie mensagens para múltiplos leads</p>
      
      <!-- Indicador de empresa selecionada para franqueadora -->
      {#if isFranqueadoraValue && selectedCompanyValue}
        <p class="text-sm text-green-500 mt-2">
          Visualizando dados de: <span class="font-semibold">{selectedCompanyValue.name}</span>
        </p>
      {/if}
    </div>

    <!-- Aviso para franqueadora selecionar empresa -->
    {#if isFranqueadoraValue && !selectedCompanyValue}
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center max-w-md">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-600/10 flex items-center justify-center">
            <svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Selecione uma Unidade</h2>
          <p class="text-zinc-400">
            Para visualizar os dados de disparo, selecione uma unidade no menu lateral.
          </p>
        </div>
      </div>
    {:else}
      <!-- Em Desenvolvimento -->
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center max-w-md">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-600/10 flex items-center justify-center">
            <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Em Desenvolvimento</h2>
          <p class="text-zinc-400">
            Este recurso está sendo desenvolvido e estará disponível em breve. 
            Aqui você poderá enviar mensagens em massa para seus leads.
          </p>
        </div>
      </div>
    {/if}
  </main>
</div>
