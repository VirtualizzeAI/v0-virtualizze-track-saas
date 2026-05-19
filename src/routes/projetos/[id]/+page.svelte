<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import { supabase, type Project, type KanbanColumn, type Task } from '$lib/supabase';

  const { user } = authStore;

  let sidebarCollapsed = $state(false);
  let projectId = $derived($page.params.id);
  let project = $state<Project | null>(null);
  let columns = $state<(KanbanColumn & { tasks: Task[] })[]>([]);
  let loading = $state(true);
  let activeTab = $state<'kanban' | 'info'>('kanban');

  // Column editor
  let showColumnModal = $state(false);
  let editingColumn = $state<{ id?: string; name: string; color: string } | null>(null);
  let savingColumn = $state(false);

  // Task creator
  let showTaskModal = $state(false);
  let newTaskColumnId = $state('');
  let newTask = $state({ title: '', description: '', deadline: '', responsible: '' });
  let savingTask = $state(false);

  // Edit project
  let showEditProject = $state(false);
  let editProject = $state<any>({});
  let savingProject = $state(false);

  // Attachments
  let uploadingFile = $state(false);
  let projectAttachments = $state<any[]>([]);

  const PRESET_COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#6b7280','#10b981'];

  onMount(() => {
    const unsub = user.subscribe(val => { if (!val) goto('/'); });
    loadProject();
    return unsub;
  });

  async function loadProject() {
    loading = true;
    const [projRes, colsRes, attachRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*, clients(id,name), project_members(id,name,email)')
        .eq('id', projectId)
        .single(),
      supabase
        .from('kanban_columns')
        .select('*, tasks(*, task_todos(id, completed))')
        .eq('project_id', projectId)
        .order('position'),
      supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
    ]);

    if (projRes.error || !projRes.data) { goto('/projetos'); return; }
    project = projRes.data;
    editProject = { ...projRes.data };

    // Sort tasks by position within each column
    columns = (colsRes.data || []).map(col => ({
      ...col,
      tasks: [...(col.tasks || [])].sort((a: Task, b: Task) => a.position - b.position)
    }));

    projectAttachments = attachRes.data || [];
    loading = false;
  }

  function getColumnTasks(colId: string) {
    return columns.find(c => c.id === colId)?.tasks || [];
  }

  function openNewColumn() {
    editingColumn = { name: '', color: '#22c55e' };
    showColumnModal = true;
  }

  function openEditColumn(col: KanbanColumn) {
    editingColumn = { id: col.id, name: col.name, color: col.color };
    showColumnModal = true;
  }

  async function saveColumn() {
    if (!editingColumn?.name.trim()) return;
    savingColumn = true;
    if (editingColumn.id) {
      await supabase.from('kanban_columns').update({ name: editingColumn.name, color: editingColumn.color }).eq('id', editingColumn.id);
    } else {
      const maxPos = columns.reduce((m, c) => Math.max(m, c.position), -1);
      await supabase.from('kanban_columns').insert({ project_id: projectId, name: editingColumn.name, color: editingColumn.color, position: maxPos + 1 });
    }
    showColumnModal = false;
    editingColumn = null;
    savingColumn = false;
    await loadProject();
  }

  async function deleteColumn(colId: string) {
    if (!confirm('Excluir esta coluna? As tarefas serão removidas.')) return;
    await supabase.from('kanban_columns').delete().eq('id', colId);
    await loadProject();
  }

  function openNewTask(columnId: string) {
    newTaskColumnId = columnId;
    newTask = { title: '', description: '', deadline: '', responsible: '' };
    showTaskModal = true;
  }

  async function saveTask() {
    if (!newTask.title.trim()) return;
    savingTask = true;
    const col = columns.find(c => c.id === newTaskColumnId);
    const maxPos = (col?.tasks || []).reduce((m, t) => Math.max(m, t.position), -1);
    await supabase.from('tasks').insert({
      project_id: projectId,
      column_id: newTaskColumnId,
      title: newTask.title.trim(),
      description: newTask.description || null,
      deadline: newTask.deadline || null,
      responsible: newTask.responsible || null,
      position: maxPos + 1
    });
    showTaskModal = false;
    savingTask = false;
    await loadProject();
  }

  async function moveTask(taskId: string, fromColId: string, toColId: string) {
    const toCol = columns.find(c => c.id === toColId);
    const maxPos = (toCol?.tasks || []).reduce((m, t) => Math.max(m, t.position), -1);
    await supabase.from('tasks').update({ column_id: toColId, position: maxPos + 1 }).eq('id', taskId);
    await loadProject();
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Excluir esta tarefa?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    await loadProject();
  }

  async function saveEditProject() {
    savingProject = true;
    await supabase.from('projects').update({
      name: editProject.name,
      description: editProject.description,
      deadline: editProject.deadline || null,
      value: editProject.value ? parseFloat(editProject.value) : null,
      status: editProject.status
    }).eq('id', projectId);
    savingProject = false;
    showEditProject = false;
    await loadProject();
  }

  async function uploadAttachment(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploadingFile = true;
    const path = `${projectId}/${Date.now()}-${file.name}`;
    const { data: uploaded, error } = await supabase.storage.from('project-attachments').upload(path, file);
    if (!error && uploaded) {
      const { data: urlData } = supabase.storage.from('project-attachments').getPublicUrl(path);
      await supabase.from('project_attachments').insert({
        project_id: projectId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size
      });
      await loadProject();
    }
    uploadingFile = false;
    input.value = '';
  }

  async function deleteAttachment(att: any) {
    if (!confirm('Remover este anexo?')) return;
    await supabase.from('project_attachments').delete().eq('id', att.id);
    await loadProject();
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

  function getTodosProgress(task: Task) {
    const todos = (task as any).task_todos || [];
    if (!todos.length) return null;
    const done = todos.filter((t: any) => t.completed).length;
    return `${done}/${todos.length}`;
  }

  function isOverdue(deadline: string | null) {
    if (!deadline) return false;
    return new Date(deadline) < new Date() && true;
  }

  const statusColors: Record<string, string> = {
    ativo: 'bg-green-500/20 text-green-400',
    concluido: 'bg-blue-500/20 text-blue-400',
    pausado: 'bg-yellow-500/20 text-yellow-400',
    cancelado: 'bg-red-500/20 text-red-400'
  };
</script>

<div class="min-h-screen bg-zinc-950">
  <Sidebar currentPath="/projetos" bind:collapsed={sidebarCollapsed} />

  <main class="transition-all duration-300 md:{sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-20 md:pt-0">
    {#if loading}
      <div class="flex items-center justify-center h-screen">
        <div class="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else if project}
      <!-- Page header -->
      <div class="p-4 md:p-8 pb-0">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div class="flex items-start gap-3">
            <a href="/projetos" class="text-zinc-400 hover:text-white mt-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <div>
              <h1 class="text-xl md:text-2xl font-bold text-white">{project.name}</h1>
              {#if project.description}
                <p class="text-zinc-400 text-sm mt-1 line-clamp-2">{project.description}</p>
              {/if}
              <div class="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
                {#if project.deadline}
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    {formatDate(project.deadline)}
                  </span>
                {/if}
                {#if project.value}
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {formatCurrency(project.value)}
                  </span>
                {/if}
                <span class="px-2 py-0.5 rounded-full text-xs {statusColors[project.status]}">
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <button onclick={() => showEditProject = true}
            class="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Editar
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-zinc-800">
          <button
            onclick={() => activeTab = 'kanban'}
            class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 {activeTab === 'kanban' ? 'border-green-600 text-green-400' : 'border-transparent text-zinc-400 hover:text-white'}"
          >
            Kanban
          </button>
          <button
            onclick={() => activeTab = 'info'}
            class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 {activeTab === 'info' ? 'border-green-600 text-green-400' : 'border-transparent text-zinc-400 hover:text-white'}"
          >
            Informações
          </button>
        </div>
      </div>

      <!-- KANBAN VIEW -->
      {#if activeTab === 'kanban'}
        <div class="p-4 md:p-8 pt-6 overflow-x-auto">
          <div class="flex gap-4 min-w-max pb-4">
            {#each columns as col}
              <div class="w-72 flex-shrink-0">
                <!-- Column header -->
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color: {col.color}"></div>
                    <h3 class="font-medium text-white text-sm">{col.name}</h3>
                    <span class="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">{col.tasks.length}</span>
                  </div>
                  <div class="flex gap-1">
                    <button onclick={() => openEditColumn(col)} class="text-zinc-500 hover:text-white p-1 rounded">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button onclick={() => deleteColumn(col.id)} class="text-zinc-500 hover:text-red-400 p-1 rounded">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Top border accent -->
                <div class="h-1 rounded-t-lg mb-2" style="background-color: {col.color}"></div>

                <!-- Tasks -->
                <div class="space-y-2 min-h-16">
                  {#each col.tasks as task}
                    <div class="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 group relative">
                      <div class="flex items-start justify-between gap-2">
                        <a href="/tarefas/{task.id}" class="text-sm font-medium text-white hover:text-green-400 flex-1 line-clamp-2">{task.title}</a>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <!-- Move task dropdown -->
                          <div class="relative" role="none">
                            <select
                              onchange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) moveTask(task.id, col.id, v); (e.target as HTMLSelectElement).value = ''; }}
                              class="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-1 py-0.5"
                              aria-label="Mover para coluna"
                            >
                              <option value="">Mover...</option>
                              {#each columns.filter(c => c.id !== col.id) as otherCol}
                                <option value={otherCol.id}>{otherCol.name}</option>
                              {/each}
                            </select>
                          </div>
                          <button onclick={() => deleteTask(task.id)} class="text-zinc-500 hover:text-red-400 p-0.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {#if task.deadline}
                        <div class="flex items-center gap-1 mt-2 text-xs {isOverdue(task.deadline) && task.status !== 'concluida' ? 'text-red-400' : 'text-zinc-500'}">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                          {formatDate(task.deadline)}
                        </div>
                      {/if}

                      <div class="flex items-center gap-2 mt-2 flex-wrap">
                        {#if task.responsible}
                          <span class="text-xs bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full">{task.responsible}</span>
                        {/if}
                        {#if getTodosProgress(task)}
                          <span class="text-xs text-zinc-500 flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                            </svg>
                            {getTodosProgress(task)}
                          </span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Add task button -->
                <button
                  onclick={() => openNewTask(col.id)}
                  class="w-full mt-2 py-2 text-sm text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Nova Tarefa
                </button>
              </div>
            {/each}

            <!-- Add column button -->
            <div class="w-72 flex-shrink-0">
              <button
                onclick={openNewColumn}
                class="w-full h-24 border-2 border-dashed border-zinc-700 hover:border-green-600 rounded-xl text-zinc-500 hover:text-green-400 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Nova Coluna
              </button>
            </div>
          </div>
        </div>

      <!-- INFO VIEW -->
      {:else}
        <div class="p-4 md:p-8 pt-6 max-w-2xl space-y-6">
          <!-- Members -->
          {#if (project as any).project_members?.length}
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 class="font-semibold text-white mb-4">Responsáveis</h3>
              <div class="space-y-2">
                {#each (project as any).project_members as m}
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-green-600/20 border border-green-600/30 flex items-center justify-center text-xs font-bold text-green-400">
                      {m.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p class="text-sm text-white">{m.name}</p>
                      {#if m.email}<p class="text-xs text-zinc-400">{m.email}</p>{/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Client -->
          {#if (project as any).clients}
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 class="font-semibold text-white mb-2">Cliente</h3>
              <a href="/clientes/{(project as any).clients.id}" class="text-green-400 hover:text-green-300 text-sm">
                {(project as any).clients.name}
              </a>
            </div>
          {/if}

          <!-- Attachments -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-white">Anexos</h3>
              <label class="cursor-pointer flex items-center gap-2 text-sm text-green-500 hover:text-green-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                {uploadingFile ? 'Enviando...' : 'Adicionar'}
                <input type="file" class="hidden" onchange={uploadAttachment} disabled={uploadingFile} />
              </label>
            </div>
            {#if projectAttachments.length === 0}
              <p class="text-sm text-zinc-500">Nenhum anexo</p>
            {:else}
              <div class="space-y-2">
                {#each projectAttachments as att}
                  <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <div class="flex items-center gap-3 overflow-hidden">
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
      {/if}
    {/if}
  </main>
</div>

<!-- Column Modal -->
{#if showColumnModal && editingColumn}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm">
      <div class="flex items-center justify-between p-5 border-b border-zinc-800">
        <h2 class="text-lg font-bold text-white">{editingColumn.id ? 'Editar Coluna' : 'Nova Coluna'}</h2>
        <button onclick={() => showColumnModal = false} class="text-zinc-400 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Nome da Coluna *</label>
          <input bind:value={editingColumn.name} type="text" placeholder="Ex.: Em Revisão"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label class="block text-sm font-medium text-white mb-2">Cor</label>
          <div class="flex flex-wrap gap-2">
            {#each PRESET_COLORS as color}
              <button
                onclick={() => { if (editingColumn) editingColumn.color = color; }}
                class="w-7 h-7 rounded-full border-2 transition-all {editingColumn.color === color ? 'border-white scale-110' : 'border-transparent'}"
                style="background-color: {color}"
                aria-label="Cor {color}"
              ></button>
            {/each}
            <input type="color" bind:value={editingColumn.color}
              class="w-7 h-7 rounded-full border-2 border-transparent cursor-pointer bg-transparent" />
          </div>
          <div class="mt-2 flex items-center gap-2">
            <div class="w-4 h-4 rounded-full" style="background-color: {editingColumn.color}"></div>
            <span class="text-xs text-zinc-400">{editingColumn.color}</span>
          </div>
        </div>
      </div>
      <div class="p-5 border-t border-zinc-800 flex gap-3 justify-end">
        <button onclick={() => showColumnModal = false} class="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:text-white">Cancelar</button>
        <button onclick={saveColumn} disabled={savingColumn}
          class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50">
          {savingColumn ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- New Task Modal -->
{#if showTaskModal}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md">
      <div class="flex items-center justify-between p-5 border-b border-zinc-800">
        <h2 class="text-lg font-bold text-white">Nova Tarefa</h2>
        <button onclick={() => showTaskModal = false} class="text-zinc-400 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Título *</label>
          <input bind:value={newTask.title} type="text" placeholder="Título da tarefa"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Descrição</label>
          <textarea bind:value={newTask.description} rows="2" placeholder="Descrição..."
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600 resize-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-white mb-1.5">Prazo</label>
            <input bind:value={newTask.deadline} type="date"
              class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
          </div>
          <div>
            <label class="block text-sm font-medium text-white mb-1.5">Responsável</label>
            <input bind:value={newTask.responsible} type="text" placeholder="Nome"
              class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600" />
          </div>
        </div>
      </div>
      <div class="p-5 border-t border-zinc-800 flex gap-3 justify-end">
        <button onclick={() => showTaskModal = false} class="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:text-white">Cancelar</button>
        <button onclick={saveTask} disabled={savingTask}
          class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50">
          {savingTask ? 'Salvando...' : 'Criar Tarefa'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Project Modal -->
{#if showEditProject}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div class="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg my-8">
      <div class="flex items-center justify-between p-5 border-b border-zinc-800">
        <h2 class="text-lg font-bold text-white">Editar Projeto</h2>
        <button onclick={() => showEditProject = false} class="text-zinc-400 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Nome</label>
          <input bind:value={editProject.name} type="text"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Descrição</label>
          <textarea bind:value={editProject.description} rows="3"
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600 resize-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-white mb-1.5">Prazo</label>
            <input bind:value={editProject.deadline} type="date"
              class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
          </div>
          <div>
            <label class="block text-sm font-medium text-white mb-1.5">Valor (R$)</label>
            <input bind:value={editProject.value} type="number" step="0.01"
              class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-white mb-1.5">Status</label>
          <select bind:value={editProject.status}
            class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600">
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluído</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div class="p-5 border-t border-zinc-800 flex gap-3 justify-end">
        <button onclick={() => showEditProject = false} class="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:text-white">Cancelar</button>
        <button onclick={saveEditProject} disabled={savingProject}
          class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50">
          {savingProject ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  </div>
{/if}
