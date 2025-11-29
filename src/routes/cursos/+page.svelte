<script lang="ts">
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { onDestroy } from 'svelte';

  const { user } = authStore;

  let sidebarCollapsed = $state(false);

  // Webhooks
  const CREATE_COURSE_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/criar-curso';
  const CREATE_CLASS_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/criar-turma';
  const GET_COURSES_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/listar-cursos';
  const GET_CLASSES_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/listar-turmas';
  const UPDATE_COURSE_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/editar-curso';
  const UPDATE_CLASS_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/editar-turma';
  const DELETE_COURSE_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/excluir-curso';
  const DELETE_CLASS_WEBHOOK = 'https://auto.agiussolar.cloud/webhook/excluir-turma';

  // States
  let activeTab = $state('courses');
  let courses = $state([]);
  let classes = $state([]);
  let isLoading = $state(false);

  // Modal states
  let showCourseModal = $state(false);
  let showClassModal = $state(false);
  let editingCourse = $state(null);
  let editingClass = $state(null);

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
  user.subscribe(value => {
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
      const webhook = editingCourse ? UPDATE_COURSE_WEBHOOK : CREATE_COURSE_WEBHOOK;
      const payload = editingCourse
        ? { ...courseForm, id: editingCourse.id, company_id: userValue?.companyId }
        : { ...courseForm, company_id: userValue?.companyId };

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      const webhook = editingClass ? UPDATE_CLASS_WEBHOOK : CREATE_CLASS_WEBHOOK;
      const payload = editingClass
        ? { ...classForm, id: editingClass.id, company_id: userValue?.companyId }
        : { ...classForm, company_id: userValue?.companyId };

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  function editCourse(course) {
    editingCourse = course;
    courseForm = {
      name: course.name,
      category: course.category,
      duration: course.duration || ''
    };
    showCourseModal = true;
  }

  function editClass(classItem) {
    editingClass = classItem;
    classForm = {
      class_name: classItem.class_name,
      course_id: classItem.course_id,
      days_of_week: classItem.days_of_week || '',
      schedule: classItem.schedule || '',
      start_date: classItem.start_date,
      is_active: classItem.is_active
    };
    showClassModal = true;
  }

  async function deleteCourse(courseId) {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;

    try {
      const response = await fetch(DELETE_COURSE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: courseId, company_id: userValue?.companyId })
      });

      const data = await response.json();
      if (data.success) {
        await loadCourses();
      } else {
        alert('Erro ao excluir curso');
      }
    } catch (error) {
      console.error('[v0] Erro ao excluir curso:', error);
      alert('Erro ao conectar com o servidor');
    }
  }

  async function deleteClass(classId) {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;

    try {
      const response = await fetch(DELETE_CLASS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: classId, company_id: userValue?.companyId })
      });

      const data = await response.json();
      if (data.success) {
        await loadClasses();
      } else {
        alert('Erro ao excluir turma');
      }
    } catch (error) {
      console.error('[v0] Erro ao excluir turma:', error);
      alert('Erro ao conectar com o servidor');
    }
  }

  onDestroy(() => {
    // Unsubscribe logic here if needed
  });
</script>

<div class="flex min-h-screen bg-zinc-950">
  <Sidebar currentPath="/cursos" bind:collapsed={sidebarCollapsed} />

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
          aria-label="Cursos"
          onclick={() => activeTab = 'courses'}
          class="px-6 py-3 text-sm font-medium transition-colors relative {activeTab === 'courses'
            ? 'text-green-500'
            : 'text-zinc-400 hover:text-white'}"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/>
            </svg>
            Cursos
          </div>
          {#if activeTab === 'courses'}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
          {/if}
        </button>
        <button
          aria-label="Turmas"
          onclick={() => activeTab = 'classes'}
          class="px-6 py-3 text-sm font-medium transition-colors relative {activeTab === 'classes'
            ? 'text-green-500'
            : 'text-zinc-400 hover:text-white'}"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
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
              aria-label="Novo Curso"
              onclick={openCourseModal}
              class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
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
                  <div class="flex items-start justify-between mb-2">
                    <h3 class="text-lg font-semibold text-white">{course.name}</h3>
                    <div class="flex gap-2">
                      <button
                        aria-label="Editar Curso"
                        onclick={() => editCourse(course)}
                        class="p-1 text-zinc-400 hover:text-green-500 transition-colors"
                        title="Editar"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        aria-label="Excluir Curso"
                        onclick={() => deleteCourse(course.id)}
                        class="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
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
              aria-label="Nova Turma"
              onclick={openClassModal}
              class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
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
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-1 text-xs rounded {classItem.is_active ? 'bg-green-600/20 text-green-500' : 'bg-zinc-700 text-zinc-400'}">
                        {classItem.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                      <button
                        aria-label="Editar Turma"
                        onclick={() => editClass(classItem)}
                        class="p-1 text-zinc-400 hover:text-green-500 transition-colors"
                        title="Editar"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        aria-label="Excluir Turma"
                        onclick={() => deleteClass(classItem.id)}
                        class="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
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
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
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

<!-- Modal Novo/Editar Curso -->
{#if showCourseModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-zinc-900 rounded-lg border border-zinc-800 max-w-md w-full p-6">
      <h2 class="text-xl font-bold text-white mb-6">{editingCourse ? 'Editar Curso' : 'Novo Curso'}</h2>

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

<!-- Modal Nova/Editar Turma -->
{#if showClassModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-zinc-900 rounded-lg border border-zinc-800 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-bold text-white mb-6">{editingClass ? 'Editar Turma' : 'Nova Turma'}</h2>

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
