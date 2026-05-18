<script lang="ts">
	import { Receipt, CalendarBlank, Plus, Lock } from 'phosphor-svelte';
</script>

<section class="surface p-5" aria-label="Ações rápidas">
	<header class="mb-4 border-b border-primary-100/60 pb-3 dark:border-white/15">
		<h2 class="text-base font-semibold text-ink dark:text-bg">Ações rápidas</h2>
	</header>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<!-- Recibos — em breve -->
		<div
			class="flex flex-col items-center gap-2 rounded-xl border border-primary-100/40 bg-primary-50/20 p-4 text-center opacity-50 dark:border-white/5 dark:bg-white/5"
			title="Em breve"
			aria-label="Recibos — em breve"
			aria-disabled="true"
		>
			<Receipt size={22} class="text-ink-muted" />
			<span class="text-xs font-medium text-ink-muted dark:text-bg/60">Recibos</span>
			<span class="text-[10px] text-ink-muted">em breve</span>
		</div>

		<!-- Sessões -->
		<a
			href="/app/sessions"
			class="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
			aria-label="Ver sessões"
		>
			<CalendarBlank size={22} class="text-primary" />
			<span class="text-xs font-medium text-ink dark:text-bg">Sessões</span>
		</a>

		<!-- Nova despesa -->
		<a
			href="/app/settings"
			class="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
			aria-label="Adicionar nova despesa"
		>
			<Plus size={22} class="text-primary" />
			<span class="text-xs font-medium text-ink dark:text-bg">Nova despesa</span>
		</a>

		<!-- Fechar mês — Phase 6 -->
		<div
			class="flex flex-col items-center gap-2 rounded-xl border border-primary-100/40 bg-primary-50/20 p-4 text-center opacity-50 dark:border-white/5 dark:bg-white/5"
			title="Disponível em breve"
			aria-label="Fechar mês — em breve"
			aria-disabled="true"
		>
			<Lock size={22} class="text-ink-muted" />
			<span class="text-xs font-medium text-ink-muted dark:text-bg/60">Fechar mês</span>
			<span class="text-[10px] text-ink-muted">em breve</span>
		</div>
	</div>
</section>
