<script lang="ts">
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { GraduationCap, Plus, Edit, Trash2, Calendar, Users } from 'lucide-svelte';
  import { onDestroy } from 'svelte';

  const { user } = authStore;

  let sidebarCollapsed = $state(false);

  // Webhooks
  const CREATE_COURSE_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/criar-curso';
  const CREATE_CLASS_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/criar-turma';
  const GET_COURSES_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/listar-cursos';
  const GET_CLASSES_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/listar-turmas';

  // States
  let activeTab = $state('courses');
  let courses = $state([]);
  let classes = $state([]);
  let isLoading = $state(false);

  // Modal states
  let showCourseModal = $state(false);
  let showClassModal = $state(false);
  let editingCourse = null;
  let editingClass = null;

  // Form data - Curso
  let courseForm = $state({
    name: '',
    category: '',
    duration: ''
  });

  // Form data - Turma
  let classForm = $state({
    class_name: '',
    course_id: '',
    days_of_week: '',
    schedule: '',
    start_date: '',
    is_active: true
  });

  // Carregar dados ao montar
  let userValue = null;
  const unsubscribe = user.subscribe(value => {
    userValue = value;
    if (value) {
      loadCourses();
      loadClasses();
    }
  });

  async function loadCourses() {
    isLoading = true;
    try {
      const response = await fetch(GET_COURSES_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: userValue?.companyId })
      });
      const data = await response.json();
      if (data.success) {
        courses = data.courses || [];
      }
    } catch (error) {
      console.error('[v0] Erro ao carregar cursos:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadClasses() {
    isLoading = true;
    try {
      const response = await fetch(GET_CLASSES_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: userValue?.companyId })
      });
      const data = await response.json();
      if (data.success) {
        classes = data.classes || [];
      }
    } catch (error) {
      console.error('[v0] Erro ao carregar turmas:', error);
    } finally {
      isLoading = false;
    }
  }

  async function saveCourse() {
    if (!courseForm.name || !courseForm.category) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch(CREATE_COURSE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseForm,
          company_id: userValue?.companyId
        })
      });

      const data = await response.json();
      if (data.success) {
        showCourseModal = false;
        resetCourseForm();
        await loadCourses();
      } else {
        alert('Erro ao salvar curso');
      }
    } catch (error) {
      console.error('[v0] Erro ao salvar curso:', error);
      alert('Erro ao conectar com o servidor');
    }
  }

  async function saveClass() {
    if (!classForm.class_name || !classForm.course_id || !classForm.start_date) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch(CREATE_CLASS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...classForm,
          company_id: userValue?.companyId
        })
      });

      const data = await response.json();
      if (data.success) {
        showClassModal = false;
        resetClassForm();
        await loadClasses();
      } else {
        alert('Erro ao salvar turma');
      }
    } catch (error) {
      console.error('[v0] Erro ao salvar turma:', error);
      alert('Erro ao conectar com o servidor');
    }
  }

  function resetCourseForm() {
    courseForm = { name: '', category: '', duration: '' };
    editingCourse = null;
  }

  function resetClassForm() {
    classForm = {
      class_name: '',
      course_id: '',
      days_of_week: '',
      schedule: '',
      start_date: '',
      is_active: true
    };
    editingClass = null;
  }

  function openCourseModal() {
    resetCourseForm();
    showCourseModal = true;
  }

  function openClassModal() {
    resetClassForm();
    showClassModal = true;
  }

  onDestroy(() => {
    unsubscribe();
  });
</script>

<div class="flex min-h-screen bg-zinc-950">
  <Sidebar currentPath="/cursos" bind:collapsed={sidebarCollapsed} />

  <!-- Main Content com margem dinâmica -->
  <main
    class="flex-1 transition-all duration-300"
    style="margin-left: {sidebarCollapsed ? '5rem' : '16rem'}"
  >
    <div class="p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Cursos e Turmas</h1>
        <p class="text-zinc-400">Gerencie os cursos e turmas da sua instituição</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6 border-b border-zinc-800">
        <button
          onclick={() => activeTab = 'courses'}
          class="px-6 py-3 text-sm font-medium transition-colors relative {activeTab === 'courses'
            ? 'text-green-500'
            : 'text-zinc-400 hover:text-white'}"
        >
          <div class="flex items-center gap-2">
            <GraduationCap class="w-4 h-4" />
            Cursos
          </div>
          {#if activeTab === 'courses'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
          {/if}
        </button>
        <button
          onclick={() => activeTab = 'classes'}
          class="px-6 py-3 text-sm font-medium transition-colors relative {activeTab === 'classes'
            ? 'text-green-500'
            : 'text-zinc-400 hover:text-white'}"
        >
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4" />
            Turmas
          </div>
          {#if activeTab === 'classes'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
          {/if}
        </button>
      </div>

      <!-- Cursos Tab -->
      {#if activeTab === 'courses'}
        <div class="space-y-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-white">Lista de Cursos</h2>
            <button
              onclick={openCourseModal}
              class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus class="w-4 h-4" />
              Novo Curso
            </button>
          </div>

          {#if isLoading}
            <div class="text-center py-12">
              <div class="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          {:else if courses.length === 0}
            <div class="text-center py-12 text-zinc-400">
              Nenhum curso cadastrado
            </div>
          {:else}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {#each courses as course}
                <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-green-600/50 transition-colors">
                  <h3 class="text-lg font-semibold text-white mb-2">{course.name}</h3>
                  <p class="text-sm text-zinc-400 mb-1">Categoria: {course.category}</p>
                  {#if course.duration}
                    <p class="text-sm text-zinc-400 mb-4">Duração: {course.duration}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Turmas Tab -->
      {#if activeTab === 'classes'}
        <div class="space-y-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-white">Lista de Turmas</h2>
            <button
              onclick={openClassModal}
              class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus class="w-4 h-4" />
              Nova Turma
            </button>
          </div>

          {#if isLoading}
            <div class="text-center py-12">
              <div class="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          {:else if classes.length === 0}
            <div class="text-center py-12 text-zinc-400">
              Nenhuma turma cadastrada
            </div>
          {:else}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {#each classes as classItem}
                <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-green-600/50 transition-colors">
                  <div class="flex items-start justify-between mb-4">
                    <h3 class="text-lg font-semibold text-white">{classItem.class_name}</h3>
                    <span class="px-2 py-1 text-xs rounded {classItem.is_active ? 'bg-green-600/20 text-green-500' : 'bg-zinc-700 text-zinc-400'}">
                      {classItem.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div class="space-y-2 text-sm text-zinc-400">
                    {#if classItem.course_name}
                      <p>Curso: {classItem.course_name}</p>
                    {/if}
                    {#if classItem.days_of_week}
                      <p>Dias: {classItem.days_of_week}</p>
                    {/if}
                    {#if classItem.schedule}
                      <p>Horário: {classItem.schedule}</p>
                    {/if}
                    {#if classItem.start_date}
                      <p class="flex items-center gap-1">
                        <Calendar class="w-3 h-3" />
                        Início: {new Date(classItem.start_date).toLocaleDateString('pt-BR')}
                      </p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </main>
</div>

<!-- Modal Novo Curso -->
{#if showCourseModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-zinc-900 rounded-lg border border-zinc-800 max-w-md w-full p-6">
      <h2 class="text-xl font-bold text-white mb-6">Novo Curso</h2>

      <div class="space-y-4">
        <div>
          <label for="courseName" class="block text-sm font-medium text-white mb-2">Nome do Curso *</label>
          <input
            id="courseName"
            type="text"
            bind:value={courseForm.name}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
            placeholder="Ex: Técnico em Informática"
          />
        </div>

        <div>
          <label for="courseCategory" class="block text-sm font-medium text-white mb-2">Categoria *</label>
          <input
            id="courseCategory"
            type="text"
            bind:value={courseForm.category}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
            placeholder="Ex: Técnico, Profissionalizante"
          />
        </div>

        <div>
          <label for="courseDuration" class="block text-sm font-medium text-white mb-2">Duração</label>
          <input
            id="courseDuration"
            type="text"
            bind:value={courseForm.duration}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
            placeholder="Ex: 2 anos, 1200 horas"
          />
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          onclick={() => showCourseModal = false}
          class="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onclick={saveCourse}
          class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Nova Turma -->
{#if showClassModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-zinc-900 rounded-lg border border-zinc-800 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-bold text-white mb-6">Nova Turma</h2>

      <div class="space-y-4">
        <div>
          <label for="className" class="block text-sm font-medium text-white mb-2">Nome da Turma *</label>
          <input
            id="className"
            type="text"
            bind:value={classForm.class_name}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
            placeholder="Ex: Turma A - Manhã"
          />
        </div>

        <div>
          <label for="courseSelect" class="block text-sm font-medium text-white mb-2">Curso *</label>
          <select
            id="courseSelect"
            bind:value={classForm.course_id}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
          >
            <option value="">Selecione um curso</option>
            {#each courses as course}
              <option value={course.id}>{course.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="daysOfWeek" class="block text-sm font-medium text-white mb-2">Dias da Semana</label>
          <input
            id="daysOfWeek"
            type="text"
            bind:value={classForm.days_of_week}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
            placeholder="Ex: Segunda a Sexta"
          />
        </div>

        <div>
          <label for="classSchedule" class="block text-sm font-medium text-white mb-2">Horário</label>
          <input
            id="classSchedule"
            type="text"
            bind:value={classForm.schedule}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
            placeholder="Ex: 08:00 - 12:00"
          />
        </div>

        <div>
          <label for="startDate" class="block text-sm font-medium text-white mb-2">Data de Início *</label>
          <input
            id="startDate"
            type="date"
            bind:value={classForm.start_date}
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-600"
          />
        </div>

        <div class="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            bind:checked={classForm.is_active}
            class="w-4 h-4 accent-green-600"
          />
          <label for="isActive" class="text-sm text-white">Turma ativa</label>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          onclick={() => showClassModal = false}
          class="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onclick={saveClass}
          class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  </div>
{/if}
