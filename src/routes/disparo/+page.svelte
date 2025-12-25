<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';

  const { user, isAuthenticated, isFranqueadora, effectiveCompanyId, selectedCompany, isManager } = authStore;

  let isAuthenticatedValue = false;
  let sidebarCollapsed = $state(false);
  
  let isFranqueadoraValue = $state(false);
  let isManagerValue = $state(false);
  let selectedCompanyValue = $state(null);
  let effectiveCompanyIdValue = $state(null);
  let userValue = $state(null);

  // Plan Usage State
  let planUsage = $state({ disparos_used: 0, disparo_limit: 0, planName: '' });
  let loadingUsage = $state(false);

  // Tabs
  let activeTab = $state('lista'); // 'lista' | 'disparar'

  // Lista State
  let blasts = $state([]);
  let loadingHistory = $state(false);

  // Connections State
  let connections = $state([]);
  let loadingConnections = $state(false);

  // Disparar State
  let blastForm = $state({
    name: '',
    message: '',
    image: null as File | null,
    useAI: false,
    randomInterval: false,
    channel: '',
    leadSegment: 'all' // 'all' | 'filtered' (future)
  });
  let sending = $state(false);
  let sendingProgress = $state({ sent: 0, total: 0, status: 'idle' }); // idle, sending, completed
  let imagePreview = $state('');

  onMount(() => {
    const unsubAuth = isAuthenticated.subscribe((value) => {
      isAuthenticatedValue = value;
      if (!value) {
        goto('/');
      }
    });
    
    const unsubFranqueadora = isFranqueadora.subscribe(value => {
      isFranqueadoraValue = value;
    });
    
    const unsubSelectedCompany = selectedCompany.subscribe(value => {
      selectedCompanyValue = value;
    });

    const unsubEffectiveCompany = effectiveCompanyId.subscribe(value => {
      effectiveCompanyIdValue = value;
      if (value) {
        fetchBlasts();
        fetchPlanUsage();
        fetchConnections();
      }
    });

    const unsubUser = user.subscribe(value => {
      userValue = value;
    });

    if (isAuthenticatedValue) {
      fetchBlasts();
      fetchPlanUsage();
      fetchConnections();
    }

    const unsubManager = isManager.subscribe(value => {
      isManagerValue = value;
    });

    return () => {
      unsubAuth();
      unsubFranqueadora();
      unsubSelectedCompany();
      unsubEffectiveCompany();
      unsubUser();
      unsubManager();
    };
  });

  async function fetchPlanUsage() {
    // TODO: Replace with actual webhook
    // const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/leads-blast-usage';
    
    loadingUsage = true;
    try {
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulating different plans based on company ID (mock)
      // Matching structure of 'companies' table
      const mockUsage = {
        disparos_used: 12500,
        disparo_limit: 30000,
        planName: 'Basic' // This might come from a join or separate query
      };
      
      planUsage = mockUsage;
    } catch (error) {
      console.error('[v0] Error fetching plan usage:', error);
    } finally {
      loadingUsage = false;
    }
  }

  async function fetchBlasts() {
    // TODO: Replace with actual webhook
    // const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/leads-blast-history';
    
    loadingHistory = true;
    try {
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockBlasts = [
        { id: 1, name: 'Promoção Natal', user: 'João Silva', total: 150, success: 145, failure: 5, date: '2023-12-01T10:00:00', status: 'approved' },
        { id: 2, name: 'Aviso Manutenção', user: 'Maria Souza', total: 50, success: 50, failure: 0, date: '2023-11-28T14:30:00', status: 'approved' },
        { id: 3, name: 'Oferta Relâmpago', user: 'Pedro Santos', total: 0, success: 0, failure: 0, date: '2023-12-03T09:00:00', status: 'pending' },
      ];
      
      blasts = mockBlasts;
    } catch (error) {
      console.error('[v0] Error fetching blasts:', error);
    } finally {
      loadingHistory = false;
    }
  }

  async function fetchConnections() {
    // TODO: Replace with actual webhook
    const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/listar-conexoes';
    
    loadingConnections = true;
    try {
      // Mock data for now if webhook fails or is not ready
      // In production:
      /*
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: effectiveCompanyIdValue })
      });
      const data = await response.json();
      connections = data;
      */

      // Mock
      await new Promise(resolve => setTimeout(resolve, 500));
      connections = [
        { id: 1, name: 'Suporte Comercial', number: '5511999999999', status: 'connected' },
        { id: 2, name: 'Atendimento', number: '5511888888888', status: 'disconnected' }
      ];

    } catch (error) {
      console.error('[Disparo] Error fetching connections:', error);
    } finally {
      loadingConnections = false;
    }
  }

  function handleImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      blastForm.image = input.files[0];
      imagePreview = URL.createObjectURL(input.files[0]);
    }
  }

  async function handleSend() {
    if (!blastForm.message) {
      alert('Por favor, digite uma mensagem.');
      return;
    }

    if (!effectiveCompanyIdValue && !userValue?.companyId) {
      alert('Erro: Empresa não identificada.');
      return;
    }

    // Check plan limits
    if (planUsage.disparo_limit > 0 && planUsage.disparos_used >= planUsage.disparo_limit) {
      alert('Limite de disparos do plano atingido!');
      return;
    }

    // Check if user is funcionario
    if (userValue?.role === 'funcionario') {
      // Create pending blast
      const newBlast = {
        id: Date.now(),
        name: blastForm.name,
        user: userValue.name,
        total: 0, // Will be calculated when approved/sent
        success: 0,
        failure: 0,
        date: new Date().toISOString(),
        status: 'pending'
      };
      
      // Add to local list (mock)
      blasts = [newBlast, ...blasts];
      
      alert('Disparo enviado para aprovação do coordenador.');
      
      // Reset form
      blastForm = {
        name: '',
        message: '',
        image: null,
        useAI: false,
        randomInterval: false,
        channel: '',
        leadSegment: 'all'
      };
      imagePreview = '';
      activeTab = 'lista';
      return;
    }

    sending = true;
    sendingProgress = { sent: 0, total: 100, status: 'sending' }; // Mock total

    // TODO: Replace with actual webhook
    // const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/leads-blast-send';

    try {
      // Simulate sending progress
      const interval = setInterval(() => {
        sendingProgress.sent += 5;
        if (sendingProgress.sent >= sendingProgress.total) {
          clearInterval(interval);
          sendingProgress.status = 'completed';
          
          // Increment usage locally
          planUsage.disparos_used += sendingProgress.total;
          
          setTimeout(() => {
            sending = false;
            sendingProgress.status = 'idle';
            activeTab = 'lista';
            
            // Add completed blast to list
            const newBlast = {
              id: Date.now(),
              name: blastForm.name,
              user: userValue?.name || 'Usuário',
              total: sendingProgress.total,
              success: sendingProgress.total,
              failure: 0,
              date: new Date().toISOString(),
              status: 'approved'
            };
            blasts = [newBlast, ...blasts];

            // Reset form
            blastForm = {
              name: '',
              message: '',
              image: null,
              useAI: false,
              randomInterval: false,
              channel: '',
              leadSegment: 'all'
            };
            imagePreview = '';
          }, 2000);
        }
      }, 200);

    } catch (error) {
      console.error('[v0] Error sending blast:', error);
      alert('Erro ao enviar disparo.');
      sending = false;
    }
  }

  async function approveBlast(blastId: number) {
    if (!confirm('Deseja aprovar este disparo?')) return;
    
    // TODO: Call webhook to approve blast
    // const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/leads-blast-approve';
    
    // Mock update
    blasts = blasts.map(b => {
      if (b.id === blastId) {
        return { ...b, status: 'approved', total: 100, success: 100 }; // Simulate immediate success for now
      }
      return b;
    });
    
    alert('Disparo aprovado e iniciado!');
  }

  async function cancelBlast(blastId: number) {
    if (!confirm('Deseja cancelar este disparo?')) return;
    
    // TODO: Call webhook to cancel blast
    // const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/leads-blast-cancel';
    
    // Mock update
    blasts = blasts.map(b => {
      if (b.id === blastId) {
        return { ...b, status: 'cancelled' };
      }
      return b;
    });
    
    alert('Disparo cancelado.');
  }

  function downloadList(blastId: number) {
    alert(`Baixando lista do disparo ${blastId}...`);
  }
</script>

<div class="flex min-h-screen bg-zinc-950">
  <Sidebar currentPath="/disparo" bind:collapsed={sidebarCollapsed} />
  
  <main class="flex-1 p-8 transition-all duration-300" style="margin-left: {sidebarCollapsed ? '5rem' : '16rem'}">
    <!-- Header -->
    <div class="mb-8 flex items-end justify-between">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Disparo em Massa</h1>
        <p class="text-zinc-400">Envie mensagens para múltiplos leads</p>
        
        {#if isFranqueadoraValue && selectedCompanyValue}
          <p class="text-sm text-green-500 mt-2">
            Visualizando dados de: <span class="font-semibold">{selectedCompanyValue.name}</span>
          </p>
        {/if}
      </div>

      <!-- Plan Usage Counter -->
      {#if (!isFranqueadoraValue || selectedCompanyValue) && planUsage.disparo_limit > 0}
        <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 min-w-[250px]">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-zinc-400">Plano {planUsage.planName}</span>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full {planUsage.disparos_used >= planUsage.disparo_limit ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'}">
              {Math.round((planUsage.disparos_used / planUsage.disparo_limit) * 100)}%
            </span>
          </div>
          <div class="flex items-end gap-1 mb-2">
            <span class="text-2xl font-bold text-white">{planUsage.disparos_used.toLocaleString()}</span>
            <span class="text-sm text-zinc-500 mb-1">/ {planUsage.disparo_limit.toLocaleString()} disparos</span>
          </div>
          <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div 
              class="h-full transition-all duration-500 {planUsage.disparos_used >= planUsage.disparo_limit ? 'bg-red-600' : 'bg-green-600'}"
              style="width: {Math.min((planUsage.disparos_used / planUsage.disparo_limit) * 100, 100)}%"
            ></div>
          </div>
        </div>
      {/if}
    </div>

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
    {:else if sending}
      <!-- Sending / In Progress View -->
      <div class="flex flex-col items-center justify-center min-h-[500px] bg-zinc-900 border border-green-600/20 rounded-lg p-8">
        <div class="relative w-32 h-32 mb-8">
          <div class="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
            {Math.round((sendingProgress.sent / sendingProgress.total) * 100)}%
          </div>
        </div>
        
        <h2 class="text-2xl font-bold text-white mb-2">
          {sendingProgress.status === 'completed' ? 'Disparo Concluído!' : 'Enviando Mensagens...'}
        </h2>
        <p class="text-zinc-400 mb-6">
          {sendingProgress.sent} de {sendingProgress.total} mensagens enviadas
        </p>

        {#if sendingProgress.status === 'completed'}
          <div class="text-green-500 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Sucesso! Redirecionando...</span>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Tabs Navigation -->
      <div class="flex gap-4 border-b border-zinc-800 mb-6">
        <button
          onclick={() => activeTab = 'lista'}
          class="px-4 py-2 text-sm font-medium transition-colors relative {activeTab === 'lista' ? 'text-green-500' : 'text-zinc-400 hover:text-white'}"
        >
          Histórico de Disparos
          {#if activeTab === 'lista'}
            <div class="absolute bottom-0 left-0 w-full h-0.5 bg-green-500"></div>
          {/if}
        </button>
        <button
          onclick={() => activeTab = 'disparar'}
          class="px-4 py-2 text-sm font-medium transition-colors relative {activeTab === 'disparar' ? 'text-green-500' : 'text-zinc-400 hover:text-white'}"
        >
          Novo Disparo
          {#if activeTab === 'disparar'}
            <div class="absolute bottom-0 left-0 w-full h-0.5 bg-green-500"></div>
          {/if}
        </button>
      </div>

      <!-- Tab Content -->
      {#if activeTab === 'lista'}
        <!-- Lista Tab -->
        <div class="bg-zinc-900 border border-green-600/20 rounded-lg overflow-hidden">
          {#if loadingHistory}
            <div class="flex items-center justify-center py-12">
              <div class="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-zinc-800 bg-zinc-800/30">
                    <th class="text-left p-4 text-sm font-medium text-zinc-400">ID</th>
                    <th class="text-left p-4 text-sm font-medium text-white">Nome da Lista</th>
                    <th class="text-left p-4 text-sm font-medium text-zinc-400">Usuário</th>
                    <th class="text-left p-4 text-sm font-medium text-zinc-400">Data</th>
                    <th class="text-center p-4 text-sm font-medium text-zinc-400">Status</th>
                    <th class="text-center p-4 text-sm font-medium text-zinc-400">Total</th>
                    <th class="text-center p-4 text-sm font-medium text-green-500">Sucesso</th>
                    <th class="text-center p-4 text-sm font-medium text-red-500">Falha</th>
                    <th class="text-right p-4 text-sm font-medium text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {#each blasts as blast}
                    <tr class="border-b border-zinc-800 hover:bg-zinc-800/20 transition-all">
                      <td class="p-4 text-sm text-zinc-400">#{blast.id}</td>
                      <td class="p-4 text-sm text-white font-medium">{blast.name}</td>
                      <td class="p-4 text-sm text-zinc-400">{blast.user}</td>
                      <td class="p-4 text-sm text-zinc-400">{new Date(blast.date).toLocaleDateString()}</td>
                      <td class="p-4 text-center">
                        {#if blast.status === 'pending'}
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pendente
                          </span>
                        {:else if blast.status === 'cancelled'}
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Cancelado
                          </span>
                        {:else}
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Aprovado
                          </span>
                        {/if}
                      </td>
                      <td class="p-4 text-sm text-zinc-400 text-center">{blast.total}</td>
                      <td class="p-4 text-sm text-green-500 text-center font-medium">{blast.success}</td>
                      <td class="p-4 text-sm text-red-500 text-center font-medium">{blast.failure}</td>
                      <td class="p-4 text-right">
                        {#if blast.status === 'pending' && isManagerValue}
                          <div class="flex items-center justify-end gap-2">
                            <button
                              onclick={() => approveBlast(blast.id)}
                              class="text-green-500 hover:text-green-400 text-sm font-medium"
                            >
                              Aprovar
                            </button>
                            <button
                              onclick={() => cancelBlast(blast.id)}
                              class="text-red-500 hover:text-red-400 text-sm font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        {:else}
                          <button
                            onclick={() => downloadList(blast.id)}
                            class="text-green-500 hover:text-green-400 text-sm font-medium flex items-center justify-end gap-1 ml-auto"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Baixar
                          </button>
                        {/if}
                      </td>
                    </tr>
                  {:else}
                    <tr>
                      <td colspan="8" class="p-8 text-center text-zinc-400">
                        Nenhum disparo realizado.
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>

      {:else}
        <!-- Disparar Tab -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Form -->
          <div class="bg-zinc-900 border border-green-600/20 rounded-lg p-6 space-y-6">
            <div>
              <label class="block text-sm font-medium text-white mb-2" for="blastName">Nome da Campanha</label>
              <input
                type="text"
                id="blastName"
                bind:value={blastForm.name}
                placeholder="Ex: Promoção de Natal"
                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-2" for="blastImage">Imagem (Opcional)</label>
              <div class="relative">
                <input
                  type="file"
                  id="blastImage"
                  accept="image/*"
                  onchange={handleImageSelect}
                  class="hidden"
                />
                <label
                  for="blastImage"
                  class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-green-600 hover:bg-zinc-800/50 transition-all"
                >
                  {#if imagePreview}
                    <img src={imagePreview} alt="Preview" class="h-full object-contain" />
                  {:else}
                    <svg class="w-8 h-8 text-zinc-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span class="text-sm text-zinc-500">Clique para selecionar uma imagem</span>
                  {/if}
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-2" for="blastMessage">Mensagem</label>
              <textarea
                id="blastMessage"
                bind:value={blastForm.message}
                rows="6"
                placeholder="Digite sua mensagem aqui..."
                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 resize-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-2" for="blastChannel">Canal de Envio</label>
              <select
                id="blastChannel"
                bind:value={blastForm.channel}
                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
              >
                <option value="">Selecione um canal...</option>
                {#each connections as conn}
                  <option value={conn.id} disabled={conn.status !== 'connected'}>
                    {conn.name} ({conn.number}) - {conn.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </option>
                {/each}
                {#if connections.length === 0}
                  <option value="" disabled>Nenhuma conexão encontrada</option>
                {/if}
              </select>
              <div class="mt-2 text-right">
                <a href="/conexoes" class="text-xs text-green-500 hover:text-green-400">Gerenciar Conexões &rarr;</a>
              </div>
            </div>

            <button
              onclick={handleSend}
              class="w-full py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"
            >
              Iniciar Disparo
            </button>
          </div>

          <!-- Preview -->
          <div class="hidden lg:block">
            <div class="sticky top-8">
              <h3 class="text-lg font-medium text-white mb-4">Pré-visualização</h3>
              <div class="bg-[#E5DDD5] rounded-lg p-4 max-w-sm mx-auto shadow-xl min-h-[400px] relative">
                <!-- Message Bubble -->
                <div class="bg-white rounded-lg p-2 shadow-sm max-w-[85%] mb-2">
                  {#if imagePreview}
                    <img src={imagePreview} alt="Preview" class="w-full rounded-lg mb-2" />
                  {/if}
                  <p class="text-sm text-gray-800 whitespace-pre-wrap">{blastForm.message || 'Sua mensagem aparecerá aqui...'}</p>
                  <div class="text-[10px] text-gray-500 text-right mt-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </main>
</div>
