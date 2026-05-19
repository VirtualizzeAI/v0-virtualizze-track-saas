<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import { supabase, type Task, type TaskTodo, type TaskAttachment } from '$lib/supabase';

  const { user } = authStore;

  let sidebarCollapsed = $state(false);
  let taskId = $derived($page.params.id);
  let task = $state<Task | null>(null);
  let todos = $state<TaskTodo[]>([]);
  let attachments = $state<TaskAttachment[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  // Timer state
  let timerRunning = $state(false);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let currentSessionSeconds = $state(0);
  let currentSessionStart = $state<Date | null>(null);

  // Edit task form
  let editForm = $state<any>({});
  let editMode = $state(false);

  // New todo
  let newTodoText = $state('');
  let addingTodo = $state(false);

  // Manual time
  let manualHours = $state(0);
  let manualMinutes = $state(0);

  // File upload
  let uploadingFile = $state(false);

  onMount(() => {
    const unsub = user.subscribe(val => { if (!val) goto('/'); });
    loadTask();
    return () => {
      unsub();
      stopTimer();
    };
  });

  async function loadTask() {
    loading = true;
    const [taskRes, todosRes, attRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, projects(id, name), kanban_columns(id, name, color)')
        .eq('id', taskId)
        .single(),
      supabase.from('task_todos').select('*').eq('task_id', taskId).order('position'),
      supabase.from('task_attachments').select('*').eq('task_id', taskId).order('created_at', { ascending: false })
    ]);

    if (taskRes.error || !taskRes.data) { goto('/projetos'); return; }
    task = taskRes.data;
    todos = todosRes.data || [];
    attachments = attRes.data || [];

    editForm = { ...task };
    const totalMins = task.manual_time_minutes;
    manualHours = Math.floor(totalMins / 60);
    manualMinutes = totalMins % 60;
    loading = false;
  }

  // ── Timer ────────────────────────────────────────────────

  function startTimer() {
    timerRunning = true;
    currentSessionStart = new Date();
    currentSessionSeconds = 0;
    timerInterval = setInterval(() => {
      currentSessionSeconds += 1;
    }, 1000);
  }

  async function stopTimer() {
    if (!timerRunning || !currentSessionStart) return;
    timerRunning = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - currentSessionStart.getTime()) / 1000);

    if (duration < 1) return;

    // Save session
    await supabase.from('task_timer_sessions').insert({
      task_id: taskId,
      started_at: currentSessionStart.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: duration
    });

    // Update total timer on task
    const newTotal = (task?.timer_seconds || 0) + duration;
    await supabase.from('tasks').update({ timer_seconds: newTotal }).eq('id', taskId);

    currentSessionSeconds = 0;
    currentSessionStart = null;
    await loadTask();
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  // ── Manual Time ──────────────────────────────────────────

  async function saveManualTime() {
    const totalMins = manualHours * 60 + manualMinutes;
    await supabase.from('tasks').update({ manual_time_minutes: totalMins }).eq('id', taskId);
    await loadTask();
  }

  // ── Edit Task ────────────────────────────────────────────

  async function saveTask() {
    saving = true;
    error = '';
    const { error: err } = await supabase.from('tasks').update({
      title: editForm.title,
      description: editForm.description || null,
      deadline: editForm.deadline || null,
      responsible: editForm.responsible || null,
      status: editForm.status
    }).eq('id', taskId);
    if (err) { error = err.message; } else { editMode = false; }
    saving = false;
    await loadTask();
  }

  // ── Todos ────────────────────────────────────────────────

  async function addTodo() {
    if (!newTodoText.trim()) return;
    addingTodo = true;
    const maxPos = todos.reduce((m, t) => Math.max(m, t.position), -1);
    await supabase.from('task_todos').insert({ task_id: taskId, title: newTodoText.trim(), position: maxPos + 1 });
    newTodoText = '';
    addingTodo = false;
    await loadTask();
  }

  async function toggleTodo(todo: TaskTodo) {
    await supabase.from('task_todos').update({ completed: !todo.completed }).eq('id', todo.id);
    await loadTask();
  }

  async function deleteTodo(id: string) {
    await supabase.from('task_todos').delete().eq('id', id);
    await loadTask();
  }

  async function editTodoTitle(todo: TaskTodo, newTitle: string) {
    if (!newTitle.trim()) return;
    await supabase.from('task_todos').update({ title: newTitle.trim() }).eq('id', todo.id);
    await loadTask();
  }

  // ── Attachments ──────────────────────────────────────────

  async function uploadAttachment(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploadingFile = true;
    const path = `${taskId}/${Date.now()}-${file.name}`;
    const { data: uploaded, error: upErr } = await supabase.storage.from('task-attachments').upload(path, file);
    if (!upErr && uploaded) {
      const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(path);
      await supabase.from('task_attachments').insert({
        task_id: taskId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size
      });
      await loadTask();
    }
    uploadingFile = false;
    input.value = '';
  }

  async function deleteAttachment(att: TaskAttachment) {
    if (!confirm('Remover este anexo?')) return;
    await supabase.from('task_attachments').delete().eq('id', att.id);
    await loadTask();
  }

  // ── Helpers ──────────────────────────────────────────────

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  }

  let todosProgress = $derived(() => {
    if (!todos.length) return null;
    const done = todos.filter(t => t.completed).length;
    return { done, total: todos.length, pct: Math.round((done / todos.length) * 100) };
  });

  let totalTimerSeconds = $derived(() => {
    return (task?.timer_seconds || 0) + (timerRunning ? currentSessionSeconds : 0);
  });

  const statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    atrasada: 'Atrasada'
  };

  const statusColors: Record<string, string> = {
    pendente: 'bg-zinc-500/20 text-zinc-400',
    em_andamento: 'bg-yellow-500/20 text-yellow-400',
    concluida: 'bg-green-500/20 text-green-400',
    atrasada: 'bg-red-500/20 text-red-400'
  };
</script>

<div class="min-h-screen bg-zinc-950">
  <Sidebar currentPath="/projetos" bind:collapsed={sidebarCollapsed} />

  <main class="transition-all duration-300 md:{sidebarCollapsed ? 'ml-20' : 'ml-64'} p-4 md:p-8 pt-20 md:pt-8">
    {#if loading}
      <div class="flex items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else if task}
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <a href="/projetos" class="hover:text-white">Projetos</a>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        {#if (task as any).projects}
          <a href="/projetos/{(task as any).projects.id}" class="hover:text-white">{(task as any).projects.name}</a>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        {/if}
        <span class="text-zinc-500 truncate max-w-xs">{task.title}</span>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="xl:col-span-2 space-y-6">
          <!-- Task Header -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {#if !editMode}
              <div class="flex items-start justify-between gap-4 mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap mb-2">
                    <span class="text-xs px-2 py-1 rounded-full {statusColors[task.status]}">{statusLabels[task.status]}</span>
                    {#if (task as any).kanban_columns}
                      <span class="text-xs px-2 py-1 rounded-full text-zinc-400 border border-zinc-700 flex items-center gap-1">
                        <div class="w-2 h-2 rounded-full" style="background-color: {(task as any).kanban_columns.color}"></div>
                        {(task as any).kanban_columns.name}
                      </span>
                    {/if}
                  </div>
                  <h1 class="text-xl font-bold text-white">{task.title}</h1>
                  {#if task.description}
                    <p class="text-zinc-400 mt-2 text-sm leading-relaxed">{task.description}</p>
                  {/if}
                </div>
                <button onclick={() => { editMode = true; editForm = { ...task }; }}
                  class="text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 p-2 rounded-lg transition-colors flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-zinc-500 text-xs mb-1">Prazo</p>
                  <p class="text-white">{formatDate(task.deadline)}</p>
                </div>
                <div>
                  <p class="text-zinc-500 text-xs mb-1">Responsável</p>
                  <p class="text-white">{task.responsible || '—'}</p>
                </div>
              </div>
            {:else}
              <!-- Edit Form -->
              <div class="space-y-4">
                {#if error}
                  <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
                {/if}
                <div>
                  <label class="block text-sm font-medium text-white mb-1.5">Título</label>
                  <input bind:value={editForm.title} type="text"
                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white mb-1.5">Descrição</label>
                  <textarea bind:value={editForm.description} rows="3"
                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600 resize-none"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-white mb-1.5">Prazo</label>
                    <input bind:value={editForm.deadline} type="date"
                      class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-white mb-1.5">Responsável</label>
                    <input bind:value={editForm.responsible} type="text"
                      class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600" />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-white mb-1.5">Status</label>
                  <select bind:value={editForm.status}
                    class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600">
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="atrasada">Atrasada</option>
                  </select>
                </div>
                <div class="flex gap-3 justify-end">
                  <button onclick={() => editMode = false} class="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:text-white">Cancelar</button>
                  <button onclick={saveTask} disabled={saving}
                    class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            {/if}
          </div>

          <!-- To-do List -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-white">Lista de Tarefas (To-do)</h2>
              {#if todosProgress()}
                <span class="text-xs text-zinc-400">{todosProgress()!.done}/{todosProgress()!.total} — {todosProgress()!.pct}%</span>
              {/if}
            </div>

            {#if todosProgress() && todosProgress()!.total > 0}
              <div class="w-full bg-zinc-800 rounded-full h-1.5 mb-4">
                <div class="bg-green-600 h-1.5 rounded-full transition-all" style="width: {todosProgress()!.pct}%"></div>
              </div>
            {/if}

            <div class="space-y-2 mb-4">
              {#each todos as todo}
                <div class="flex items-center gap-3 group">
                  <button
                    onclick={() => toggleTodo(todo)}
                    class="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                      {todo.completed ? 'bg-green-600 border-green-600' : 'border-zinc-600 hover:border-green-600'}"
                    aria-label={todo.completed ? 'Desmarcar' : 'Marcar como concluído'}
                  >
                    {#if todo.completed}
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    {/if}
                  </button>
                  <span
                    contenteditable="true"
                    role="textbox"
                    tabindex="0"
                    class="flex-1 text-sm {todo.completed ? 'line-through text-zinc-500' : 'text-white'} outline-none focus:outline-none"
                    onblur={(e) => editTodoTitle(todo, (e.target as HTMLElement).textContent || '')}
                    onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
                  >{todo.title}</span>
                  <button
                    onclick={() => deleteTodo(todo.id)}
                    class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 flex-shrink-0 transition-opacity"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              {/each}
            </div>

            <!-- Add todo -->
            <div class="flex gap-2">
              <input
                bind:value={newTodoText}
                type="text"
                placeholder="Adicionar item..."
                onkeydown={(e) => { if (e.key === 'Enter') addTodo(); }}
                class="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600"
              />
              <button onclick={addTodo} disabled={addingTodo || !newTodoText.trim()}
                class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors">
                +
              </button>
            </div>
          </div>

          <!-- Attachments -->
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

        <!-- Sidebar Panel -->
        <div class="space-y-6">
          <!-- Timer -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 class="font-semibold text-white mb-4">Cronômetro</h2>
            <div class="text-center">
              <div class="text-4xl font-mono font-bold text-white mb-1">
                {formatTime(totalTimerSeconds())}
              </div>
              {#if timerRunning}
                <p class="text-xs text-green-400 mb-4">Sessão atual: {formatTime(currentSessionSeconds)}</p>
              {:else}
                <p class="text-xs text-zinc-500 mb-4">Tempo acumulado</p>
              {/if}
              <button
                onclick={timerRunning ? stopTimer : startTimer}
                class="w-full py-3 rounded-xl font-medium transition-all text-white {timerRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'}"
              >
                {#if timerRunning}
                  <div class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="5" width="4" height="14" rx="1"/>
                      <rect x="14" y="5" width="4" height="14" rx="1"/>
                    </svg>
                    Parar
                  </div>
                {:else}
                  <div class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Iniciar
                  </div>
                {/if}
              </button>
            </div>
          </div>

          <!-- Manual Time -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 class="font-semibold text-white mb-4">Tempo Manual</h2>
            <div class="flex items-center gap-2 mb-3">
              <div class="flex-1">
                <label class="block text-xs text-zinc-400 mb-1">Horas</label>
                <input bind:value={manualHours} type="number" min="0"
                  class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-600" />
              </div>
              <span class="text-zinc-400 mt-5">:</span>
              <div class="flex-1">
                <label class="block text-xs text-zinc-400 mb-1">Minutos</label>
                <input bind:value={manualMinutes} type="number" min="0" max="59"
                  class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-600" />
              </div>
            </div>
            <p class="text-xs text-zinc-500 mb-3">Atual: {Math.floor(task.manual_time_minutes / 60)}h {task.manual_time_minutes % 60}min</p>
            <button onclick={saveManualTime}
              class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors border border-zinc-700">
              Salvar Tempo Manual
            </button>
          </div>

          <!-- Task Info -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 class="font-semibold text-white mb-4">Detalhes</h2>
            <div class="space-y-3 text-sm">
              <div>
                <p class="text-zinc-500 text-xs">Projeto</p>
                {#if (task as any).projects}
                  <a href="/projetos/{(task as any).projects.id}" class="text-green-400 hover:text-green-300">
                    {(task as any).projects.name}
                  </a>
                {/if}
              </div>
              <div>
                <p class="text-zinc-500 text-xs">Coluna</p>
                <p class="text-white">{(task as any).kanban_columns?.name || '—'}</p>
              </div>
              <div>
                <p class="text-zinc-500 text-xs">Criado em</p>
                <p class="text-white">{formatDate(task.created_at)}</p>
              </div>
              <div>
                <p class="text-zinc-500 text-xs">Atualizado em</p>
                <p class="text-white">{formatDate(task.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>
