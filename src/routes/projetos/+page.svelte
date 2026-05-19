<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import { supabase, type Project, type Client } from '$lib/supabase';

  const { user } = authStore;

  let sidebarCollapsed = $state(false);
  let projects = $state<Project[]>([]);
  let clients = $state<Client[]>([]);
  let loading = $state(true);
  let searchTerm = $state('');
  let statusFilter = $state('todos');
  let showNewModal = $state(false);

  // New project form
  let newProject = $state({
    name: '',
    description: '',
    deadline: '',
    value: '',
    client_id: '',
    status: 'ativo' as const,
    members: [{ name: '', email: '' }]
  });
  let saving = $state(false);
  let error = $state('');

  onMount(() => {
    const unsub = user.subscribe(val => {
      if (!val) goto('/');
    });
    loadData();
    return unsub;
  });

  async function loadData() {
    loading = true;
    const [projectsRes, clientsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*, clients(id, name), project_members(id, name)')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name')
    ]);
    projects = projectsRes.data || [];
    clients = clientsRes.data || [];
    loading = false;
  }

  let filtered = $derived(
    projects.filter(p => {
      const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
      return matchSearch && matchStatus;
    })
  );

  const statusLabels: Record<string, string> = {
    ativo: 'Ativo',
    concluido: 'Concluído',
    pausado: 'Pausado',
    cancelado: 'Cancelado'
  };

  const statusColors: Record<string, string> = {
    ativo: 'bg-green-500/20 text-green-400 border-green-500/30',
    concluido: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pausado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    cancelado: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  function addMember() {
    newProject.members = [...newProject.members, { name: '', email: '' }];
  }

  function removeMember(i: number) {
    newProject.members = newProject.members.filter((_, idx) => idx !== i);
  }

  async function saveProject() {
    if (!newProject.name.trim()) { error = 'Nome obrigatório'; return; }
    saving = true;
    error = '';
    try {
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: newProject.name.trim(),
          description: newProject.description || null,
          deadline: newProject.deadline || null,
          value: newProject.value ? parseFloat(newProject.value) : null,
          client_id: newProject.client_id || null,
          status: newProject.status
        })
        .select()
        .single();

      if (projErr) throw projErr;

      // Save members
      const validMembers = newProject.members.filter(m => m.name.trim());
      if (validMembers.length) {
        await supabase.from('project_members').insert(
          validMembers.map(m => ({ project_id: proj.id, name: m.name.trim(), email: m.email || null }))
        );
      }

      // Create default kanban columns
      await supabase.from('kanban_columns').insert([
        { project_id: proj.id, name: 'A Fazer', color: '#6b7280', position: 0 },
        { project_id: proj.id, name: 'Em Andamento', color: '#f59e0b', position: 1 },
        { project_id: proj.id, name: 'Concluído', color: '#22c55e', position: 2 }
      ]);

      showNewModal = false;
      resetForm();
      await loadData();
      goto(`/projetos/${proj.id}`);
    } catch (e: any) {
      error = e.message || 'Erro ao salvar projeto';
    } finally {
      saving = false;
    }
  }

  function resetForm() {
    newProject = { name: '', description: '', deadline: '', value: '', client_id: '', status: 'ativo', members: [{ name: '', email: '' }] };
    error = '';
  }

  function formatCurrency(val: number | null) {
    if (val == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  }
</script>

<div class="min-h-screen bg-zinc-950">
  <Sidebar currentPath="/projetos" bind:collapsed={sidebarCollapsed} />

  <main class="transition-all duration-300 md:{sidebarCollapsed ? 'ml-20' : 'ml-64'} p-4 md:p-8 pt-20 md:pt-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-white">Projetos</h1>
        <p class="text-zinc-400 mt-1">Gerencie todos os seus projetos</p>
      </div>
      <button
        onclick={() => showNewModal = true}
        class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Novo Projeto
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Buscar projetos..."
          class="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600"
        />
      </div>
      <select
        bind:value={statusFilter}
        class="px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
      >
        <option value="todos">Todos os status</option>
        <option value="ativo">Ativo</option>
        <option value="concluido">Concluído</option>
        <option value="pausado">Pausado</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else if filtered.length === 0}
      <div class="text-center py-20">
        <svg class="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p class="text-zinc-400 text-lg">Nenhum projeto encontrado</p>
        <button onclick={() => showNewModal = true} class="mt-4 text-green-500 hover:text-green-400 underline">
          Criar primeiro projeto
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each filtered as project}
          <a
            href="/projetos/{project.id}"
            class="bg-zinc-900 border border-zinc-800 hover:border-green-600/50 rounded-xl p-5 transition-all group"
          >
            <div class="flex items-start justify-between gap-2 mb-3">
              <h3 class="font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-2">{project.name}</h3>
              <span class="text-xs px-2 py-1 rounded-full border flex-shrink-0 {statusColors[project.status]}">
                {statusLabels[project.status]}
              </span>
            </div>

            {#if project.description}
              <p class="text-sm text-zinc-400 line-clamp-2 mb-3">{project.description}</p>
            {/if}

            <div class="space-y-2 text-sm">
              {#if (project as any).clients}
                <div class="flex items-center gap-2 text-zinc-400">
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  <span class="truncate">{(project as any).clients.name}</span>
                </div>
              {/if}

              {#if project.deadline}
                <div class="flex items-center gap-2 text-zinc-400">
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span>Prazo: {formatDate(project.deadline)}</span>
                </div>
              {/if}

              {#if project.value}
                <div class="flex items-center gap-2 text-zinc-400">
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{formatCurrency(project.value)}</span>
                </div>
              {/if}
            </div>

            {#if (project as any).project_members?.length}
              <div class="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-1 flex-wrap">
                {#each (project as any).project_members.slice(0, 3) as member}
                  <span class="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{member.name}</span>
                {/each}
                {#if (project as any).project_members.length > 3}
                  <span class="text-xs text-zinc-500">+{(project as any).project_members.length - 3}</span>
                {/if}
              </div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </main>
</div>

<!-- New Project Modal -->
{#if showNewModal}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
    <div class="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg my-8">
      <div class="flex items-center justify-between p-6 border-b border-zinc-800">
        <h2 class="text-xl font-bold text-white">Novo Projeto</h2>
        <button onclick={() => { showNewModal = false; resetForm(); }} class="text-zinc-400 hover:text-white">
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
          <input bind:value={newProject.name} type="text" placeholder="Nome do projeto"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Descrição</label>
          <textarea bind:value={newProject.description} rows="3" placeholder="Descrição do projeto"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600 resize-none"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-white mb-1.5">Prazo</label>
            <input bind:value={newProject.deadline} type="date"
              class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
          </div>
          <div>
            <label class="block text-sm font-medium text-white mb-1.5">Valor (R$)</label>
            <input bind:value={newProject.value} type="number" step="0.01" placeholder="0,00"
              class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Cliente</label>
          <select bind:value={newProject.client_id}
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600">
            <option value="">Selecionar cliente...</option>
            {#each clients as c}
              <option value={c.id}>{c.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Status</label>
          <select bind:value={newProject.status}
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600">
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluído</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-white">Responsáveis</label>
            <button onclick={addMember} class="text-green-500 text-sm hover:text-green-400">+ Adicionar</button>
          </div>
          <div class="space-y-2">
            {#each newProject.members as member, i}
              <div class="flex gap-2">
                <input bind:value={member.name} type="text" placeholder="Nome"
                  class="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
                <input bind:value={member.email} type="email" placeholder="Email (opcional)"
                  class="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
                {#if newProject.members.length > 1}
                  <button onclick={() => removeMember(i)} class="text-red-400 hover:text-red-300 px-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-zinc-800 flex gap-3 justify-end">
        <button onclick={() => { showNewModal = false; resetForm(); }}
          class="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
          Cancelar
        </button>
        <button onclick={saveProject} disabled={saving}
          class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
          {saving ? 'Salvando...' : 'Criar Projeto'}
        </button>
      </div>
    </div>
  </div>
{/if}
