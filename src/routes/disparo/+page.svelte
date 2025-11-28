<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';

  const { isAuthenticated } = authStore;
  let sidebarCollapsed = $state(false);

  // Verificar autenticação
  onMount(() => {
    if (!isAuthenticated) {
      goto('/');
    }
  });
</script>

<div class="flex min-h-screen bg-background">
  <Sidebar currentPath="/disparo" bind:collapsed={sidebarCollapsed} />
  
  <main class="flex-1 p-8 transition-all duration-300" style="margin-left: {sidebarCollapsed ? '5rem' : '16rem'}">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-foreground mb-2">Disparo em Massa</h1>
      <p class="text-muted-foreground">Envie mensagens para múltiplos leads</p>
    </div>

    <!-- Em Desenvolvimento -->
    <div class="flex items-center justify-center min-h-[400px]">
      <div class="text-center max-w-md">
        <!-- Ícone com verde -->
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-600/10 flex items-center justify-center">
          <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-foreground mb-2">Em Desenvolvimento</h2>
        <p class="text-muted-foreground">
          Este recurso está sendo desenvolvido e estará disponível em breve. 
          Aqui você poderá enviar mensagens em massa para seus leads.
        </p>
      </div>
    </div>
  </main>
</div>
