<script lang="ts">
  let { title, value, color = 'bg-chart-1' } = $props<{
    title: string;
    value: number | string;
    color?: string;
  }>();
</script>

<div class="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm text-muted-foreground mb-1">{title}</p>
      <p class="text-3xl font-bold text-card-foreground">{value}</p>
    </div>
    <div class="w-12 h-12 rounded-lg {color}"></div>
  </div>
</div>
