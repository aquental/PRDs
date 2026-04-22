<script>
  let { children } = $props();
</script>

<div class="flex h-screen bg-background dark:bg-zinc-950">
  <!-- Sidebar -->
  <nav class="w-64 p-4 border-r">
    <!-- Menu: Dashboard, Pacientes, IA, Finanças -->
  </nav>
  <main class="flex-1 overflow-auto p-8">
    {@render children()}
  </main>
</div>
