<script lang="ts">
  import { run } from 'svelte/legacy';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import PeriodSelector from '$lib/components/dashboard/period-selector.svelte';
  import StatCard from '$lib/components/dashboard/stat-card.svelte';
  // import { FileText } from 'lucide-svelte';

  let user = $state(null);
  let isAuthenticated = false;
  let isLoading = $state(true);
  let sidebarCollapsed = $state(false);
  let selectedPeriod = $state('hoje');
  let loading = $state(false);
  let currentPage = $state(1);
  const itemsPerPage = 10;
  // let isExportingPDF = $state(false);

  let dashboardData = $state({
    totalLeads: 0,
    tecnicos: 0,
    profissionalizante: 0,
    superior: 0,
    outros: 0,
    categories: [],
    dailyLeads: [],
    topCourses: [],
    recentLeads: []
  });

  let maxDailyLeads = $state(0);
  let maxCourseCount = $state(0);
  let paginatedLeads = $state([]);
  let totalPages = $state(0);

  onMount(() => {
    const unsubscribeUser = authStore.user.subscribe((value) => {
      user = value;
    });

    const unsubscribeAuth = authStore.isAuthenticated.subscribe((value) => {
      isAuthenticated = value;

      if (!value) {
        goto('/');
      } else {
        isLoading = false;
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeAuth();
    };
  });

  async function fetchDashboardData(period: string) {
    const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/dashboard';

    if (!user?.companyId) {
      console.error('[v0] Não é possível buscar dashboard sem companyId');
      return;
    }

    loading = true;

    try {
      const companyId = user.companyId;

      const getPeriod = {
        periodo: period,
        companyId: companyId
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPeriod)
      });

      const data = await response.json();

      dashboardData = {
        ...data,
        dailyLeads: (data.dailyLeads || []).filter(d => d.date),
        recentLeads: (data.recentLeads || []).filter(l => l.name),
        topCourses: (data.topCourses || []).filter(c => c.name),
        categories: data.categories || []
      };
      
      currentPage = 1;
      updateDerivedValues();
    } catch (error) {
      console.error('[v0] Error fetching dashboard data:', error);
    } finally {
      loading = false;
    }
  }

  function handlePeriodChange(period: string) {
    selectedPeriod = period;
    fetchDashboardData(period);
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage = currentPage + 1;
      updateDerivedValues();
    }
  }

  function previousPage() {
    if (currentPage > 1) {
      currentPage = currentPage - 1;
      updateDerivedValues();
    }
  }

  function goToPage(page: number) {
    currentPage = page;
    updateDerivedValues();
  }

  function updateDerivedValues() {
    maxDailyLeads = dashboardData.dailyLeads.length ? Math.max(...dashboardData.dailyLeads.map(d => d.count || 0)) : 1;
    maxCourseCount = dashboardData.topCourses.length ? Math.max(...dashboardData.topCourses.map(c => c.count || 0)) : 1;
    paginatedLeads = (dashboardData.recentLeads || []).filter(lead => lead.name).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    totalPages = Math.ceil((dashboardData.recentLeads || []).filter(lead => lead.name).length / itemsPerPage);
  }

  // async function exportToPDF() {
  //   isExportingPDF = true;
  //   
  //   try {
  //     const jsPDF = (await import('jspdf')).default;
  //     const html2canvas = (await import('html2canvas')).default;
  //     
  //     const pdf = new jsPDF('p', 'mm', 'a4');
  //     const pageWidth = pdf.internal.pageSize.getWidth();
  //     const pageHeight = pdf.internal.pageSize.getHeight();
  //     let yPosition = 20;
  //
  //     pdf.setFontSize(16);
  //     pdf.setTextColor(34, 197, 94);
  //     pdf.text('Virtualizze Track - Relatório Dashboard', pageWidth / 2, yPosition, { align: 'center' });
  //     
  //     yPosition += 10;
  //     pdf.setFontSize(10);
  //     pdf.setTextColor(100, 100, 100);
  //     pdf.text(`Empresa: ${user?.companyName || 'N/A'}`, 15, yPosition);
  //     yPosition += 5;
  //     pdf.text(`Usuário: ${user?.name || 'N/A'}`, 15, yPosition);
  //     yPosition += 5;
  //     const now = new Date();
  //     pdf.text(`Data/Hora: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, 15, yPosition);
  //     yPosition += 5;
  //     pdf.text(`Período: ${selectedPeriod}`, 15, yPosition);
  //     yPosition += 10;
  //
  //     pdf.setDrawColor(34, 197, 94);
  //     pdf.line(15, yPosition, pageWidth - 15, yPosition);
  //     yPosition += 10;
  //
  //     pdf.setFontSize(12);
  //     pdf.setTextColor(0, 0, 0);
  //     pdf.text('Resumo de Leads', 15, yPosition);
  //     yPosition += 8;
  //     
  //     pdf.setFontSize(9);
  //     const statsData = [
  //       { label: 'Total de Leads', value: dashboardData.totalLeads },
  //       { label: 'Técnicos', value: dashboardData.tecnicos },
  //       { label: 'Profissionalizante', value: dashboardData.profissionalizante },
  //       { label: 'Superior', value: dashboardData.superior },
  //       { label: 'Anúncio Geral', value: dashboardData.outros }
  //     ];
  //
  //     statsData.forEach((stat, index) => {
  //       const xPos = 15 + (index * 37);
  //       pdf.setFillColor(240, 240, 240);
  //       pdf.rect(xPos, yPosition, 35, 15, 'F');
  //       pdf.setTextColor(100, 100, 100);
  //       pdf.text(stat.label, xPos + 2, yPosition + 5);
  //       pdf.setFontSize(14);
  //       pdf.setTextColor(0, 0, 0);
  //       pdf.text(String(stat.value), xPos + 2, yPosition + 12);
  //       pdf.setFontSize(9);
  //     });
  //     yPosition += 20;
  //
  //     const dailyChart = document.querySelector('.bg-card.border.border-border.rounded-lg.p-6.mb-8');
  //     if (dailyChart) {
  //       const canvas = await html2canvas(dailyChart as HTMLElement, {
  //         backgroundColor: '#1a1a1a',
  //         scale: 2
  //       });
  //       const imgData = canvas.toDataURL('image/png');
  //       const imgWidth = pageWidth - 30;
  //       const imgHeight = (canvas.height * imgWidth) / canvas.width;
  //       
  //       if (yPosition + imgHeight > pageHeight - 20) {
  //         pdf.addPage();
  //         yPosition = 20;
  //       }
  //       
  //       pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
  //       yPosition += imgHeight + 10;
  //     }
  //
  //     if (yPosition + 60 > pageHeight - 20) {
  //       pdf.addPage();
  //       yPosition = 20;
  //     }
  //
  //     pdf.setFontSize(12);
  //     pdf.setTextColor(0, 0, 0);
  //     pdf.text('Top 5 Cursos Mais Procurados', 15, yPosition);
  //     yPosition += 8;
  //
  //     pdf.setFontSize(9);
  //     dashboardData.topCourses.slice(0, 5).forEach((course, index) => {
  //       pdf.setTextColor(100, 100, 100);
  //       pdf.text(`${index + 1}. ${course.name}`, 15, yPosition);
  //       pdf.text(String(course.count), pageWidth - 30, yPosition);
  //       yPosition += 6;
  //     });
  //     yPosition += 5;
  //
  //     pdf.addPage();
  //     yPosition = 20;
  //     pdf.setFontSize(12);
  //     pdf.setTextColor(0, 0, 0);
  //     pdf.text('Lista Completa de Leads', 15, yPosition);
  //     yPosition += 8;
  //
  //     pdf.setFontSize(8);
  //     pdf.setFillColor(34, 197, 94);
  //     pdf.setTextColor(255, 255, 255);
  //     pdf.rect(15, yPosition, pageWidth - 30, 7, 'F');
  //     pdf.text('Nome', 17, yPosition + 5);
  //     pdf.text('Categoria', 60, yPosition + 5);
  //     pdf.text('Curso', 95, yPosition + 5);
  //     pdf.text('Telefone', 145, yPosition + 5);
  //     pdf.text('Data', 175, yPosition + 5);
  //     yPosition += 10;
  //
  //     pdf.setTextColor(0, 0, 0);
  //     const allLeads = dashboardData.recentLeads.filter(l => l.name);
  //     
  //     allLeads.forEach((lead, index) => {
  //       if (yPosition > pageHeight - 20) {
  //         pdf.addPage();
  //         yPosition = 20;
  //         pdf.setFillColor(34, 197, 94);
  //         pdf.setTextColor(255, 255, 255);
  //         pdf.rect(15, yPosition, pageWidth - 30, 7, 'F');
  //         pdf.text('Nome', 17, yPosition + 5);
  //         pdf.text('Categoria', 60, yPosition + 5);
  //         pdf.text('Curso', 95, yPosition + 5);
  //         pdf.text('Telefone', 145, yPosition + 5);
  //         pdf.text('Data', 175, yPosition + 5);
  //         yPosition += 10;
  //         pdf.setTextColor(0, 0, 0);
  //       }
  //
  //       if (index % 2 === 0) {
  //         pdf.setFillColor(245, 245, 245);
  //         pdf.rect(15, yPosition - 3, pageWidth - 30, 6, 'F');
  //       }
  //
  //       pdf.text(lead.name.substring(0, 25), 17, yPosition);
  //       pdf.text(lead.category.substring(0, 15), 60, yPosition);
  //       pdf.text(lead.course.substring(0, 25), 95, yPosition);
  //       pdf.text(lead.phone, 145, yPosition);
  //       pdf.text(lead.data_cadastro, 175, yPosition);
  //       yPosition += 6;
  //     });
  //
  //     const fileName = `Dashboard_${user?.companyName || 'Virtualizze'}_${now.toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  //     pdf.save(fileName);
  //
  //   } catch (error) {
  //     console.error('[v0] Erro ao exportar PDF:', error);
  //     alert('Erro ao gerar PDF. Tente novamente.');
  //   } finally {
  //     isExportingPDF = false;
  //   }
  // }
</script>

{#if isLoading}
  <div class="flex min-h-screen bg-background items-center justify-center">
    <div class="text-center">
      <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-muted-foreground">Carregando...</p>
    </div>
  </div>
{:else}
  <div class="flex min-h-screen bg-background">
    <Sidebar currentPath="/dashboard" bind:collapsed={sidebarCollapsed} />
    
    <main class="flex-1 p-8 transition-all duration-300" style="margin-left: {sidebarCollapsed ? '5rem' : '16rem'}">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p class="text-muted-foreground">Visão geral dos seus leads e métricas</p>
      </div>

      <div class="mb-8">
        <PeriodSelector {selectedPeriod} onPeriodChange={handlePeriodChange} />
      </div>

      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      {:else}
        <div class="grid grid-cols-5 gap-4 mb-8">
          <StatCard title="Total de Leads" value={dashboardData.totalLeads} color="bg-[hsl(var(--color-chart-1))]" />
          <StatCard title="Técnicos" value={dashboardData.tecnicos} color="bg-[hsl(var(--color-chart-2))]" />
          <StatCard title="Profissionalizante" value={dashboardData.profissionalizante} color="bg-[hsl(var(--color-chart-3))]" />
          <StatCard title="Superior" value={dashboardData.superior} color="bg-[hsl(var(--color-chart-4))]" />
          <StatCard title="Anúncio Geral" value={dashboardData.outros} color="bg-[hsl(var(--color-chart-5))]" />
        </div>

        <div class="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 class="text-lg font-semibold text-card-foreground mb-6">Leads Por Dia</h3>
          <div class="h-80 flex items-end justify-between gap-2">
            {#each dashboardData.dailyLeads || [] as day}
              {@const heightPercent = (day.count / maxDailyLeads) * 100}
              <div class="flex-1 flex flex-col items-center gap-2">
                <div class="relative w-full flex flex-col items-center">
                  <span class="text-xs font-medium text-foreground mb-1">{day.count}</span>
                  <div
                    class="w-full rounded-t transition-all hover:opacity-80"
                    style="height: {heightPercent * 2.5}px; min-height: 4px; background-color: hsl(142 76% 36%);"
                  ></div>
                </div>
                <span class="text-xs text-muted-foreground">{day.date}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="text-lg font-semibold text-card-foreground mb-6">Categorias em %</h3>
            <div class="flex items-center justify-center">
              <svg class="w-64 h-64" viewBox="0 0 100 100">
                {#each dashboardData.categories || [] as category, i}
                  {@const total = dashboardData.categories.reduce((sum, c) => sum + c.value, 0)}
                  {@const percentage = (category.value / total) * 100}
                  {#if percentage >= 99.9}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill={category.color}
                      opacity="0.9"
                    />
                  {:else}
                    {@const startAngle = dashboardData.categories.slice(0, i).reduce((sum, c) => sum + (c.value / total) * 360, 0)}
                    {@const endAngle = startAngle + (percentage / 100) * 360}
                    {@const largeArc = percentage > 50 ? 1 : 0}

                    {@const startRad = (startAngle - 90) * Math.PI / 180}
                    {@const endRad = (endAngle - 90) * Math.PI / 180}

                    {@const x1 = 50 + 40 * Math.cos(startRad)}
                    {@const y1 = 50 + 40 * Math.sin(startRad)}
                    {@const x2 = 50 + 40 * Math.cos(endRad)}
                    {@const y2 = 50 + 40 * Math.sin(endRad)}

                    <path
                      d="M 50 50 L {x1} {y1} A 40 40 0 {largeArc} 1 {x2} {y2} Z"
                      fill={category.color}
                      opacity="0.9"
                    />
                  {/if}
                {/each}
              </svg>
            </div>
            <div class="flex flex-col gap-2 mt-4">
              {#each dashboardData.categories || [] as category}
                {@const total = dashboardData.categories.reduce((sum, c) => sum + c.value, 0)}
                {@const percentage = ((category.value / total) * 100).toFixed(1)}
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-sm" style="background-color: {category.color}"></div>
                  <span class="text-sm text-muted-foreground flex-1">{category.name}</span>
                  <span class="text-sm font-medium text-foreground">{percentage}%</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="text-lg font-semibold text-card-foreground mb-6">Top 5 Cursos Mais Procurados</h3>
            <div class="space-y-4">
              {#each dashboardData.topCourses || [] as course, i}
                {@const widthPercent = (course.count / maxCourseCount) * 100}
                {@const colors = ['bg-[hsl(var(--color-chart-3))]', 'bg-[hsl(var(--color-chart-2))]', 'bg-[hsl(var(--color-chart-5))]', 'bg-[hsl(var(--color-chart-4))]', 'bg-[hsl(var(--color-chart-1))]']}
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-foreground font-medium truncate flex-1">{course.name}</span>
                    <span class="text-muted-foreground ml-2">{course.count}</span>
                  </div>
                  <div class="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      class="{colors[i % colors.length]} h-full rounded-full transition-all duration-500"
                      style="width: {widthPercent}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="bg-card border border-border rounded-lg overflow-hidden">
          <div class="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-card-foreground">Leads Recentes</h3>
            <span class="text-sm text-muted-foreground">
              {(dashboardData.recentLeads || []).filter(l => l.name).length} leads no total
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border bg-muted/30">
                  <th class="text-left p-4 text-sm font-medium text-muted-foreground">Nome</th>
                  <th class="text-left p-4 text-sm font-medium text-muted-foreground">Categoria</th>
                  <th class="text-left p-4 text-sm font-medium text-muted-foreground">Curso</th>
                  <th class="text-left p-4 text-sm font-medium text-muted-foreground">Telefone</th>
                  <th class="text-left p-4 text-sm font-medium text-muted-foreground">Criação</th>
                </tr>
              </thead>
              <tbody>
                {#each paginatedLeads as lead}
                  <tr class="border-b border-border transition-all hover:bg-muted/20 hover:border-l-4 hover:border-l-primary">
                    <td class="p-4 text-sm text-foreground">{lead.name}</td>
                    <td class="p-4 text-sm text-foreground">{lead.category}</td>
                    <td class="p-4 text-sm text-foreground">{lead.course}</td>
                    <td class="p-4 text-sm text-muted-foreground">{lead.phone}</td>
                    <td class="p-4 text-sm text-muted-foreground">{lead.data_cadastro}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          {#if totalPages > 1}
            <div class="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
              <div class="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div class="flex items-center gap-2">
                <button
                  onclick={previousPage}
                  disabled={currentPage === 1}
                  class="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>

                <div class="flex items-center gap-1">
                  {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    if (totalPages <= 5) return i + 1;
                    if (currentPage <= 3) return i + 1;
                    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
                    return currentPage - 2 + i;
                  }) as page}
                    <button
                      onclick={() => goToPage(page)}
                      class="w-8 h-8 text-sm rounded-md border transition-colors {currentPage === page 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'border-border bg-background hover:bg-muted'}"
                    >
                      {page}
                    </button>
                  {/each}
                </div>

                <button
                  onclick={nextPage}
                  disabled={currentPage === totalPages}
                  class="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </main>
  </div>
{/if}
