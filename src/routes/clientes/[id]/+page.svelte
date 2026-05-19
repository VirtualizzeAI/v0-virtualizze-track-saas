<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import { supabase, type Client, type Project } from '$lib/supabase';

  const { user } = authStore;

  let sidebarCollapsed = $state(false);
  let clientId = $derived($page.params.id);
  let client = $state<Client | null>(null);
  let projects = $state<Project[]>([]);
  let attachments = $state<any[]>([]);
  let loading = $state(true);
  let editMode = $state(false);
  let saving = $state(false);
  let uploadingFile = $state(false);

  let editForm = $state({ name: '', contact: '', email: '', description: '' });

  onMount(() => {
    const unsub = user.subscribe(val => { if (!val) goto('/'); });
    loadClient();
    return unsub;
  });

  async function loadClient() {
    loading = true;
    const [clientRes, projRes, attRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('projects').select('id, name, status, deadline, value').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('client_attachments').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    ]);

    if (clientRes.error || !clientRes.data) { goto('/clientes'); return; }
    client = clientRes.data;
    projects = projRes.data || [];
    attachments = attRes.data || [];
    editForm = { name: client.name, contact: client.contact || '', email: client.email || '', description: client.description || '' };
    loading = false;
  }

  async function saveClient() {
    if (!editForm.name.trim()) return;
    saving = true;
    await supabase.from('clients').update({
      name: editForm.name.trim(),
      contact: editForm.contact || null,
      email: editForm.email || null,
      description: editForm.description || null
    }).eq('id', clientId);
    saving = false;
    editMode = false;
    await loadClient();
  }

  async function deleteClient() {
    if (!confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) return;
    await supabase.from('clients').delete().eq('id', clientId);
    goto('/clientes');
  }

  async function uploadAttachment(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploadingFile = true;
    const path = `${clientId}/${Date.now()}-${file.name}`;
    const { data: uploaded, error } = await supabase.storage.from('client-attachments').upload(path, file);
    if (!error && uploaded) {
      const { data: urlData } = supabase.storage.from('client-attachments').getPublicUrl(path);
      await supabase.from('client_attachments').insert({
        client_id: clientId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size
      });
      await loadClient();
    }
    uploadingFile = false;
    input.value = '';
  }

  async function deleteAttachment(att: any) {
    if (!confirm('Remover este anexo?')) return;
    await supabase.from('client_attachments').delete().eq('id', att.id);
    await loadClient();
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatCurrency(v: number | null) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  }

  const statusLabels: Record<string, string> = {
    ativo: 'Ativo',
    concluido: 'Concluído',
    pausado: 'Pausado',
    cancelado: 'Cancelado'
  };

  const statusColors: Record<string, string> = {
    ativo: 'bg-green-500/20 text-green-400',
    concluido: 'bg-blue-500/20 text-blue-400',
    pausado: 'bg-yellow-500/20 text-yellow-400',
    cancelado: 'bg-red-500/20 text-red-400'
  };
</script>

<div class="min-h-screen bg-zinc-950">
  <Sidebar currentPath="/clientes" bind:collapsed={sidebarCollapsed} />

  <main class="transition-all duration-300 md:{sidebarCollapsed ? 'ml-20' : 'ml-64'} p-4 md:p-8 pt-20 md:pt-8">
    {#if loading}
      <div class="flex items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else if client}
      <!-- Header -->
      <div class="flex items-start gap-4 mb-8">
        <a href="/clientes" class="text-zinc-400 hover:text-white mt-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1">
            <div class="w-12 h-12 rounded-full bg-green-600/20 border border-green-600/30 flex items-center justify-center text-lg font-bold text-green-400">
              {client.name[0].toUpperCase()}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">{client.name}</h1>
              {#if client.email}<p class="text-zinc-400 text-sm">{client.email}</p>{/if}
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            onclick={() => editMode = !editMode}
            class="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Editar
          </button>
          <button
            onclick={deleteClient}
            class="text-sm text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-2 rounded-lg transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Main -->
        <div class="xl:col-span-2 space-y-6">
          <!-- Edit Form / Info -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {#if editMode}
              <h2 class="font-semibold text-white mb-4">Editar Cliente</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-white mb-1.5">Nome *</label>
                  <input bind:value={editForm.name} type="text"
                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white mb-1.5">Contato</label>
                  <input bind:value={editForm.contact} type="text"
                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white mb-1.5">E-mail</label>
                  <input bind:value={editForm.email} type="email"
                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white mb-1.5">Descrição</label>
                  <textarea bind:value={editForm.description} rows="3"
                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600 resize-none"></textarea>
                </div>
                <div class="flex gap-3 justify-end">
                  <button onclick={() => editMode = false} class="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:text-white">Cancelar</button>
                  <button onclick={saveClient} disabled={saving}
                    class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            {:else}
              <h2 class="font-semibold text-white mb-4">Informações</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-zinc-500 text-xs mb-1">Nome</p>
                  <p class="text-white">{client.name}</p>
                </div>
                <div>
                  <p class="text-zinc-500 text-xs mb-1">Contato</p>
                  <p class="text-white">{client.contact || '—'}</p>
                </div>
                <div>
                  <p class="text-zinc-500 text-xs mb-1">E-mail</p>
                  <p class="text-white">{client.email || '—'}</p>
                </div>
                <div>
                  <p class="text-zinc-500 text-xs mb-1">Cadastrado em</p>
                  <p class="text-white">{formatDate(client.created_at)}</p>
                </div>
                {#if client.description}
                  <div class="sm:col-span-2">
                    <p class="text-zinc-500 text-xs mb-1">Descrição</p>
                    <p class="text-white leading-relaxed">{client.description}</p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Associated Projects -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 class="font-semibold text-white mb-4">Projetos Associados ({projects.length})</h2>
            {#if projects.length === 0}
              <p class="text-sm text-zinc-500">Nenhum projeto associado</p>
            {:else}
              <div class="space-y-3">
                {#each projects as project}
                  <a href="/projetos/{project.id}"
                    class="flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors group">
                    <div>
                      <p class="text-sm font-medium text-white group-hover:text-green-400">{project.name}</p>
                      {#if project.deadline}
                        <p class="text-xs text-zinc-400 mt-0.5">Prazo: {formatDate(project.deadline)}</p>
                      {/if}
                    </div>
                    <div class="flex items-center gap-3">
                      {#if project.value}
                        <span class="text-xs text-zinc-400">{formatCurrency(project.value)}</span>
                      {/if}
                      <span class="text-xs px-2 py-0.5 rounded-full {statusColors[project.status]}">{statusLabels[project.status]}</span>
                    </div>
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Sidebar: Attachments -->
        <div>
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-white">Anexos</h2>
              <label class="cursor-pointer flex items-center gap-2 text-sm text-green-500 hover:text-green-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                {uploadingFile ? 'Enviando...' : 'Adicionar'}
                <input type="file" class="hidden" onchange={uploadAttachment} disabled={uploadingFile} />
              </label>
            </div>

            {#if attachments.length === 0}
              <p class="text-sm text-zinc-500">Nenhum anexo</p>
            {:else}
              <div class="space-y-2">
                {#each attachments as att}
                  <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <div class="flex items-center gap-2 overflow-hidden">
                      <svg class="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                      <div class="overflow-hidden">
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                          class="text-sm text-white hover:text-green-400 truncate block">{att.file_name}</a>
                        {#if att.file_size}
                          <p class="text-xs text-zinc-500">{formatFileSize(att.file_size)}</p>
                        {/if}
                      </div>
                    </div>
                    <button onclick={() => deleteAttachment(att)} class="text-zinc-500 hover:text-red-400 ml-2 flex-shrink-0">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>
