<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';

  let isAuthenticated = false;
  let user = null;
  let leads = $state([]);
  let loading = $state(false);
  let searchTerm = $state('');
  let filterCategory = $state('todos');
  let filterCourse = $state('todos');
  let filterSeller = $state('todos');
  let filterDate = $state('todos');
  let selectedLead = $state(null);
  let showDetailModal = $state(false);
  let sidebarCollapsed = $state(false);

  let showNewLeadModal = $state(false);
  let savingLead = $state(false);
  let newLead = $state({
    name: '',
    email: '',
    phone: '',
    category: '',
    course: '',
    seller: '',
    notes: ''
  });

  let categories = ['todos', 'Técnico', 'Profissionalizante', 'Superior', 'Indisponivel'];
  let courses = $state(['todos']);
  let registeredCourses = $state([]); // Cursos cadastrados no sistema
  let sellers = $state(['todos']);
  let dates = $state(['todos']);

  function normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  const filteredLeads = () => leads.filter(lead => {
    if (!isAuthenticated) {
      return [];
    }
    const normalizedSearch = normalizeText(searchTerm);
    const matchesSearch = 
      normalizeText(lead.name || '').includes(normalizedSearch) ||
      normalizeText(lead.email || '').includes(normalizedSearch) ||
      lead.phone?.includes(searchTerm);
    
    // Categoria "Indisponivel" filtra os que NÃO são Técnico, Profissionalizante ou Superior
    let matchesCategory = filterCategory === 'todos';
    if (!matchesCategory) {
      if (filterCategory === 'Indisponivel') {
        const validCategories = ['técnico', 'profissionalizante', 'superior'];
        matchesCategory = !validCategories.includes(lead.category?.toLowerCase());
      } else {
        matchesCategory = lead.category?.toLowerCase() === filterCategory.toLowerCase();
      }
    }
    
    const matchesCourse = filterCourse === 'todos' || lead.course?.toLowerCase() === filterCourse.toLowerCase();
    const matchesSeller = filterSeller === 'todos' || lead.seller?.toLowerCase() === filterSeller.toLowerCase();
    
    let matchesDate = filterDate === 'todos';
    if (!matchesDate && filterDate !== 'todos') {
      const leadDateFormatted = formatDate(lead.firstContact);
      matchesDate = leadDateFormatted === filterDate;
    }

    return matchesSearch && matchesCategory && matchesCourse && matchesSeller && matchesDate;
  });

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      // Se já está no formato DD/MM/YYYY, retorna direto
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      // Tentar parse ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('[v0] Error formatting date:', error);
      return dateString;
    }
  }

  onMount(() => {
    const unsubAuth = authStore.isAuthenticated.subscribe((value) => {
      isAuthenticated = value;
      if (!value) {
        goto('/');
      }
    });
    
    const unsubUser = authStore.user.subscribe((value) => {
      user = value;
      if (value?.companyId && leads.length === 0 && !loading) {
        fetchCourses(); // Buscar cursos cadastrados primeiro
        fetchLeads();
      }
    });

    return () => {
      unsubAuth();
      unsubUser();
    };
  });

  async function fetchCourses() {
    const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/listar-cursos';
    
    if (!user?.companyId) {
      return;
    }
    
    try {
      const payload = {
        company_id: user.companyId
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      registeredCourses = Array.isArray(data.courses) ? data.courses : [];
    } catch (error) {
      console.error('[v0] Error fetching courses:', error);
      registeredCourses = [];
    }
  }

  async function fetchLeads() {
    const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/leads-list';
    
    if (!user?.companyId) {
      console.error('Não é possível buscar leads sem companyId');
      return;
    }
    
    loading = true;
    
    try {
      const companyId = user.companyId;
      
      const payload = {
        companyId: companyId
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      leads = Array.isArray(data) ? data : [];
      
      courses = ['todos', ...Array.from(new Set(leads.map(l => l.course).filter(c => c)))];
      sellers = ['todos', ...Array.from(new Set(leads.map(l => l.seller).filter(s => s)))];
      
      const uniqueDays = Array.from(new Set(leads
        .map(l => {
          if (!l.firstContact) return null;
          const formatted = formatDate(l.firstContact);
          // Validar se a data formatada é válida
          if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formatted)) {
            return null;
          }
          return formatted;
        })
        .filter(d => d !== null) as string[]
      ));
      
      dates = ['todos', ...uniqueDays.sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateB.getTime() - dateA.getTime();
      })];
      
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('[v0] Error fetching leads:', error);
      leads = [];
    } finally {
      loading = false;
    }
  }

  function viewLeadDetails(lead: any) {
    selectedLead = lead;
    showDetailModal = true;
  }

  function openNewLeadModal() {
    newLead = {
      name: '',
      email: '',
      phone: '',
      category: '',
      course: '',
      seller: '',
      notes: ''
    };
    showNewLeadModal = true;
  }

  async function saveNewLead() {
    if (!newLead.name || !newLead.phone) {
      alert('Nome e telefone são obrigatórios!');
      return;
    }

    savingLead = true;

    try {
      const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/leads-create';
      
      const payload = {
        companyId: user?.companyId,
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone,
        category: newLead.category,
        course: newLead.course,
        seller: newLead.seller || user?.name,
        notes: newLead.notes,
        firstContact: new Date().toISOString()
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showNewLeadModal = false;
        await fetchLeads(); // Recarrega a lista de leads
      } else {
        alert('Erro ao salvar lead. Tente novamente.');
      }
    } catch (error) {
      console.error('[v0] Error saving lead:', error);
      alert('Erro ao salvar lead. Tente novamente.');
    } finally {
      savingLead = false;
    }
  }

  function exportToCSV() {
    const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Categoria', 'Curso', 'Vendedor', 'Primeiro Contato', 'Status', 'Observações'];
    const csvData = leads.map(lead => [
      lead.id,
      lead.name,
      lead.email || '',
      lead.phone,
      lead.category,
      lead.course,
      lead.seller,
      lead.firstContact,
      lead.status || '',
      lead.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
</script>

<div class="flex min-h-screen bg-background">
  <Sidebar currentPath="/leads" bind:collapsed={sidebarCollapsed} />
  
  <main class="flex-1 p-8 transition-all duration-300" style="margin-left: {sidebarCollapsed ? '5rem' : '16rem'}">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-foreground mb-2">Leads</h1>
        <p class="text-muted-foreground">Gerencie todos os seus leads</p>
      </div>
      <!-- Adicionando botões de Novo Lead e Exportar -->
      <div class="flex gap-3">
        <button
          aria-label="Criar novo lead"
          onclick={openNewLeadModal}
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Novo Lead
        </button>
        <button
          aria-label="Exportar leads"
          onclick={exportToCSV}
          class="flex items-center gap-2 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Exportar
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <!-- Card com borda verde sutil -->
    <div class="bg-card border border-green-600/20 rounded-lg p-6 mb-6">
      <div class="flex flex-col gap-4">
        <div class="flex-1">
          <label for="searchTerm" class="sr-only">Buscar por nome, email ou telefone...</label>
          <!-- Input com foco verde -->
          <input
            id="searchTerm"
            type="text"
            bind:value={searchTerm}
            placeholder="Buscar por nome, email ou telefone..."
            class="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label for="filterDate" class="block text-sm font-medium text-foreground mb-2">Data</label>
            <select
              id="filterDate"
              bind:value={filterDate}
              class="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            >
              {#each dates as date}
                <option value={date}>{date === 'todos' ? 'Todas as datas' : date}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <label for="filterCategory" class="block text-sm font-medium text-foreground mb-2">Categoria</label>
            <select
              id="filterCategory"
              bind:value={filterCategory}
              class="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            >
              {#each categories as category}
                <option value={category}>{category === 'todos' ? 'Todas' : category}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="filterCourse" class="block text-sm font-medium text-foreground mb-2">Curso</label>
            <select
              id="filterCourse"
              bind:value={filterCourse}
              class="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            >
              {#each courses as course}
                <option value={course}>{course === 'todos' ? 'Todos' : course}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="filterSeller" class="block text-sm font-medium text-foreground mb-2">Vendedor</label>
            <select
              id="filterSeller"
              bind:value={filterSeller}
              class="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            >
              {#each sellers as seller}
                <option value={seller}>{seller === 'todos' ? 'Todos' : seller}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="text-sm text-muted-foreground">
          Mostrando {filteredLeads().length} de {leads.length} leads
        </div>
      </div>
    </div>

    <!-- Leads Table -->
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <!-- Spinner verde -->
        <div class="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else}
      <div class="bg-card border border-green-600/20 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border bg-muted/30">
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">ID</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Nome</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Categoria</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Curso</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Telefone</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Vendedor</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Primeiro Contato</th>
                <th class="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredLeads() as lead}
                <!-- Borda verde no hover -->
                <tr class="border-b border-border hover:bg-muted/20 hover:border-l-4 hover:border-l-green-600 transition-all">
                  <td class="p-4 text-sm text-muted-foreground">#{lead.id}</td>
                  <td class="p-4 text-sm text-foreground font-medium">{lead.name}</td>
                  <td class="p-4 text-sm text-foreground">{lead.category}</td>
                  <td class="p-4 text-sm text-foreground">{lead.course}</td>
                  <td class="p-4 text-sm text-muted-foreground">{lead.phone}</td>
                  <td class="p-4 text-sm text-muted-foreground">{lead.seller}</td>
                  <td class="p-4 text-sm text-muted-foreground">{formatDate(lead.firstContact)}</td>
                  <td class="p-4">
                    <!-- Link verde -->
                    <button
                      aria-label={`Ver detalhes do lead ${lead.name}`}
                      onclick={() => viewLeadDetails(lead)}
                      class="text-green-500 hover:text-green-400 text-sm font-medium"
                    >
                      Ver detalhes
                    </button>
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

<!-- Detail Modal -->
{#if showDetailModal && selectedLead}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <!-- Modal com fundo sólido bg-zinc-900 -->
    <div class="bg-zinc-900 border border-green-600/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold text-white">Detalhes do Lead</h3>
        <button
          aria-label="Fechar detalhes do lead"
          onclick={() => (showDetailModal = false)}
          class="text-zinc-400 hover:text-white"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">ID</span>
            <p class="text-white">#{selectedLead.id}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">Status</span>
            <span class="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-600/10 text-green-500">
              {selectedLead.status}
            </span>
          </div>
        </div>

        <div>
          <span class="text-sm font-medium text-zinc-400 block mb-1">Nome Completo</span>
          <p class="text-white font-medium">{selectedLead.name}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">Email</span>
            <p class="text-white">{selectedLead.email}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">Telefone</span>
            <p class="text-white">{selectedLead.phone}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">Categoria</span>
            <p class="text-white">{selectedLead.category}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">Curso de Interesse</span>
            <p class="text-white">{selectedLead.course}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">Vendedor Responsável</span>
            <p class="text-white">{selectedLead.seller}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-zinc-400 block mb-1">Primeiro Contato</span>
            <p class="text-white">{formatDate(selectedLead.firstContact)}</p>
          </div>
        </div>

        <div>
          <span class="text-sm font-medium text-zinc-400 block mb-1">Observações</span>
          <p class="text-white bg-zinc-800 p-3 rounded-lg">{selectedLead.notes}</p>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          aria-label="Fechar"
          onclick={() => (showDetailModal = false)}
          class="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal para criar novo lead -->
{#if showNewLeadModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <!-- Modal com fundo sólido bg-zinc-900 -->
    <div class="bg-zinc-900 border border-green-600/30 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold text-white">Novo Lead</h3>
        <button
          aria-label="Fechar modal"
          onclick={() => (showNewLeadModal = false)}
          class="text-zinc-400 hover:text-white"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label for="newLeadName" class="block text-sm font-medium text-white mb-2">Nome Completo *</label>
          <input
            id="newLeadName"
            type="text"
            bind:value={newLead.name}
            placeholder="Nome do lead"
            class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div>
          <label for="newLeadEmail" class="block text-sm font-medium text-white mb-2">Email</label>
          <input
            id="newLeadEmail"
            type="email"
            bind:value={newLead.email}
            placeholder="email@exemplo.com"
            class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div>
          <label for="newLeadPhone" class="block text-sm font-medium text-white mb-2">Telefone *</label>
          <input
            id="newLeadPhone"
            type="tel"
            bind:value={newLead.phone}
            placeholder="(00) 00000-0000"
            class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="newLeadCategory" class="block text-sm font-medium text-white mb-2">Categoria</label>
            <select
              id="newLeadCategory"
              bind:value={newLead.category}
              class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            >
              <option value="">Selecione...</option>
              <option value="Técnico">Técnico</option>
              <option value="Profissionalizante">Profissionalizante</option>
              <option value="Superior">Superior</option>
            </select>
          </div>

          <div>
            <label for="newLeadCourse" class="block text-sm font-medium text-white mb-2">Curso</label>
            <select
              id="newLeadCourse"
              bind:value={newLead.course}
              class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            >
              <option value="">Selecione...</option>
              {#each registeredCourses as course}
                <option value={course.name}>{course.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div>
          <label for="newLeadSeller" class="block text-sm font-medium text-white mb-2">Vendedor</label>
          <input
            id="newLeadSeller"
            type="text"
            bind:value={newLead.seller}
            placeholder="Nome do vendedor (opcional)"
            class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>

        <div>
          <label for="newLeadNotes" class="block text-sm font-medium text-white mb-2">Observações</label>
          <textarea
            id="newLeadNotes"
            bind:value={newLead.notes}
            placeholder="Observações sobre o lead..."
            rows="3"
            class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 resize-none"
          ></textarea>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          aria-label="Cancelar"
          onclick={() => (showNewLeadModal = false)}
          class="flex-1 px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          aria-label="Salvar lead"
          onclick={saveNewLead}
          disabled={savingLead}
          class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if savingLead}
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Salvando...
          {:else}
            Salvar
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
