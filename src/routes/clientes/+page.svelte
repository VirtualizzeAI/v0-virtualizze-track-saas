<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import { supabase, type Client } from '$lib/supabase';

  const { user } = authStore;

  let sidebarCollapsed = $state(false);
  let clients = $state<Client[]>([]);
  let loading = $state(true);
  let searchTerm = $state('');
  let showModal = $state(false);
  let saving = $state(false);
  let error = $state('');

  let newClient = $state({ name: '', contact: '', email: '', description: '' });

  onMount(() => {
    const unsub = user.subscribe(val => { if (!val) goto('/'); });
    loadClients();
    return unsub;
  });

  async function loadClients() {
    loading = true;
    const { data } = await supabase
      .from('clients')
      .select('*, client_attachments(id)')
      .order('name');
    clients = data || [];
    loading = false;
  }

  let filtered = $derived(
    !searchTerm ? clients : clients.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  async function saveClient() {
    if (!newClient.name.trim()) { error = 'Nome obrigatório'; return; }
    saving = true;
    error = '';
    const { data, error: err } = await supabase
      .from('clients')
      .insert({
        name: newClient.name.trim(),
        contact: newClient.contact || null,
        email: newClient.email || null,
        description: newClient.description || null
      })
      .select()
      .single();
    if (err) { error = err.message; saving = false; return; }
    showModal = false;
    newClient = { name: '', contact: '', email: '', description: '' };
    saving = false;
    await loadClients();
    if (data) goto(`/clientes/${data.id}`);
  }

  function resetForm() {
    newClient = { name: '', contact: '', email: '', description: '' };
    error = '';
  }
</script>

<div class="min-h-screen bg-zinc-950">
  <Sidebar currentPath="/clientes" bind:collapsed={sidebarCollapsed} />

  <main class="transition-all duration-300 md:{sidebarCollapsed ? 'ml-20' : 'ml-64'} p-4 md:p-8 pt-20 md:pt-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-white">Clientes</h1>
        <p class="text-zinc-400 mt-1">Gerencie seus clientes</p>
      </div>
      <button
        onclick={() => showModal = true}
        class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Novo Cliente
      </button>
    </div>

    <!-- Search -->
    <div class="relative mb-6 max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <input type="text" bind:value={searchTerm} placeholder="Buscar clientes..."
        class="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else if filtered.length === 0}
      <div class="text-center py-20">
        <svg class="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
        <p class="text-zinc-400 text-lg">Nenhum cliente encontrado</p>
        <button onclick={() => showModal = true} class="mt-4 text-green-500 hover:text-green-400 underline">
          Cadastrar primeiro cliente
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each filtered as client}
          <a href="/clientes/{client.id}"
            class="bg-zinc-900 border border-zinc-800 hover:border-green-600/50 rounded-xl p-5 transition-all group">
            <div class="flex items-start gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-green-600/20 border border-green-600/30 flex items-center justify-center text-sm font-bold text-green-400 flex-shrink-0">
                {client.name[0].toUpperCase()}
              </div>
              <div class="flex-1 overflow-hidden">
                <h3 class="font-semibold text-white group-hover:text-green-400 transition-colors truncate">{client.name}</h3>
                {#if client.email}
                  <p class="text-xs text-zinc-400 truncate">{client.email}</p>
                {/if}
              </div>
            </div>

            {#if client.contact}
              <div class="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <span class="truncate">{client.contact}</span>
              </div>
            {/if}

            {#if client.description}
              <p class="text-xs text-zinc-500 line-clamp-2">{client.description}</p>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </main>
</div>

<!-- New Client Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md">
      <div class="flex items-center justify-between p-6 border-b border-zinc-800">
        <h2 class="text-xl font-bold text-white">Novo Cliente</h2>
        <button onclick={() => { showModal = false; resetForm(); }} class="text-zinc-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-4">
        {#if error}
          <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
        {/if}

        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Nome *</label>
          <input bind:value={newClient.name} type="text" placeholder="Nome do cliente"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Contato</label>
          <input bind:value={newClient.contact} type="text" placeholder="Telefone ou WhatsApp"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-1.5">E-mail</label>
          <input bind:value={newClient.email} type="email" placeholder="email@exemplo.com"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Descrição</label>
          <textarea bind:value={newClient.description} rows="3" placeholder="Informações sobre o cliente..."
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600 resize-none"></textarea>
        </div>
      </div>

      <div class="p-6 border-t border-zinc-800 flex gap-3 justify-end">
        <button onclick={() => { showModal = false; resetForm(); }}
          class="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
          Cancelar
        </button>
        <button onclick={saveClient} disabled={saving}
          class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
          {saving ? 'Salvando...' : 'Cadastrar Cliente'}
        </button>
      </div>
    </div>
  </div>
{/if}
