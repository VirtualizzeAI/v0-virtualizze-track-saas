<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';

  const auth = authStore;
  let isAuthenticated = false;
  let isManager = false;
  let user = null;
  let sidebarCollapsed = $state(false);

  interface Employee {
    id: number;
    name: string;
    email: string;
    password?: string;
    phone: string;
    role: 'funcionario' | 'coordenador' | 'direcao';
  }

  let employees: Employee[] = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let isEditing = $state(false);
  let currentEmployee: Employee = $state({
    id: 0,
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'funcionario'
  });
  let error = $state('');

  const roleLabels = {
    funcionario: 'Funcionário',
    coordenador: 'Coordenador',
    direcao: 'Direção'
  };

  onMount(() => {
    const unsubscribeAuth = authStore.isAuthenticated.subscribe(value => {
      isAuthenticated = value;
      if (!value) {
        goto('/');
      }
    });

    const unsubscribeManager = authStore.isManager.subscribe(value => {
      isManager = value;
      if (isAuthenticated && !value) {
        goto('/dashboard');
      }
    });

    const unsubscribeUser = authStore.user.subscribe(value => {
      user = value;
      if (value?.companyId && employees.length === 0 && !loading) {
        fetchEmployees();
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeManager();
      unsubscribeUser();
    };
  });

  async function fetchEmployees() {
    const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/listar-funcionarios';
    
    if (!user?.companyId) {
      console.error('[v0] Não é possível buscar funcionários sem companyId');
      return;
    }
    
    loading = true;
    
    try {
      const companyId = user.companyId;
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        employees = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('[v0] Error fetching employees:', error);
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    isEditing = false;
    currentEmployee = {
      id: 0,
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'funcionario'
    };
    error = '';
    showModal = true;
  }

  function openEditModal(employee: Employee) {
    isEditing = true;
    currentEmployee = { ...employee, password: '' };
    error = '';
    showModal = true;
  }

  async function handleSubmit() {
    if (!currentEmployee.name || !currentEmployee.email || !currentEmployee.phone) {
      error = 'Preencha todos os campos obrigatórios';
      return;
    }

    if (!isEditing && !currentEmployee.password) {
      error = 'Senha é obrigatória para novos funcionários';
      return;
    }

    if (!user?.companyId) {
      error = 'Erro: ID da empresa não encontrado';
      return;
    }

    const WEBHOOK_URL = isEditing 
      ? 'https://auto.agiussolar.cloud/webhook/editar-funcionario'
      : 'https://auto.agiussolar.cloud/webhook/criar-funcionario';
    
    loading = true;
    
    try {
      const companyId = user.companyId;
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentEmployee,
          companyId: companyId
        })
      });
      
      if (response.ok) {
        if (isEditing) {
          employees = employees.map(emp => 
            emp.id === currentEmployee.id ? { ...currentEmployee } : emp
          );
        } else {
          employees = [...employees, { ...currentEmployee, id: employees.length + 1 }];
        }
        showModal = false;
      } else {
        error = 'Erro ao salvar funcionário';
      }
    } catch (error) {
      error = 'Erro ao salvar funcionário';
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) {
      return;
    }

    if (!user?.companyId) {
      console.error('[v0] Não é possível excluir funcionário sem companyId');
      return;
    }

    const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/excluir-funcionario';
    
    loading = true;
    
    try {
      const companyId = user.companyId;
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          companyId: companyId
        })
      });
      
      if (response.ok) {
        employees = employees.filter(emp => emp.id !== id);
      }
    } catch (error) {
      console.error('[v0] Error deleting employee:', error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex min-h-screen bg-background">
  <!-- Adicionando bind:collapsed para controlar expansão -->
  <Sidebar currentPath="/funcionarios" bind:collapsed={sidebarCollapsed} />
  
  <!-- Adicionando margin-left dinâmico -->
  <main class="flex-1 p-8 transition-all duration-300" style="margin-left: {sidebarCollapsed ? '5rem' : '16rem'}">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-foreground mb-2">Funcionários</h1>
        <p class="text-muted-foreground">Gerencie os acessos da equipe</p>
      </div>
      <!-- Botão verde -->
      <button
        onclick={openCreateModal}
        class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Novo Funcionário
      </button>
    </div>

    <!-- Employees Table -->
    {#if loading && employees.length === 0}
      <div class="flex items-center justify-center py-12">
        <div class="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else}
      <!-- Card com borda verde -->
      <div class="bg-card border border-green-600/20 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border bg-muted/30">
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Nome</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Telefone</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Cargo</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {#each employees as employee}
                <!-- Hover com borda verde -->
                <tr class="border-b border-border hover:bg-muted/20 hover:border-l-4 hover:border-l-green-600 transition-all">
                  <td class="p-4 text-sm text-foreground font-medium">{employee.name}</td>
                  <td class="p-4 text-sm text-muted-foreground">{employee.email}</td>
                  <td class="p-4 text-sm text-muted-foreground">{employee.phone}</td>
                  <td class="p-4">
                    <!-- Badge verde -->
                    <span class="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-600/10 text-green-500">
                      {roleLabels[employee.role]}
                    </span>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center gap-2">
                      <button
                        onclick={() => openEditModal(employee)}
                        class="text-green-500 hover:text-green-400 text-sm font-medium"
                      >
                        Editar
                      </button>
                      <span class="text-border">|</span>
                      <button
                        onclick={() => handleDelete(employee.id)}
                        class="text-destructive hover:text-destructive/80 text-sm font-medium"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </main>
</div>

<!-- Create/Edit Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <!-- Modal com borda verde -->
    <div class="bg-card border border-green-600/30 rounded-lg p-6 w-full max-w-lg">
      <h3 class="text-2xl font-bold text-card-foreground mb-6">
        {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
      </h3>

      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-foreground mb-2">Nome Completo *</label>
          <!-- Inputs com foco verde -->
          <input
            id="name"
            type="text"
            bind:value={currentEmployee.name}
            placeholder="João da Silva"
            class="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-foreground mb-2">Email *</label>
          <input
            id="email"
            type="email"
            bind:value={currentEmployee.email}
            placeholder="joao@virtualizze.com"
            class="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div>
          <label for="phone" class="block text-sm font-medium text-foreground mb-2">Telefone *</label>
          <input
            id="phone"
            type="tel"
            bind:value={currentEmployee.phone}
            placeholder="(11) 99999-9999"
            class="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-foreground mb-2">
            Senha {isEditing ? '(deixe vazio para manter)' : '*'}
          </label>
          <input
            id="password"
            type="password"
            bind:value={currentEmployee.password}
            placeholder="••••••••"
            class="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div>
          <label for="role" class="block text-sm font-medium text-foreground mb-2">Cargo *</label>
          <select
            id="role"
            bind:value={currentEmployee.role}
            class="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          >
            <option value="funcionario">Funcionário</option>
            <option value="coordenador">Coordenador</option>
            <option value="direcao">Direção</option>
          </select>
        </div>

        {#if error}
          <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p class="text-sm text-destructive">{error}</p>
          </div>
        {/if}
      </div>

      <div class="flex gap-3 mt-6">
        <button
          onclick={() => (showModal = false)}
          disabled={loading}
          class="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50"
        >
          Cancelar
        </button>
        <!-- Botão Salvar verde -->
        <button
          onclick={handleSubmit}
          disabled={loading}
          class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  </div>
{/if}
