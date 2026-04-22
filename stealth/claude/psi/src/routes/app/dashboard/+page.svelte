<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import { Users, Clock, CurrencyCircleDollar, Warning } from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';

	interface Props {
		data: {
			kpis: {
				projected: number;
				outstanding: number;
				active_patients: number;
				upcoming_sessions: number;
			};
		};
	}
	let { data }: Props = $props();
</script>

<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Início</h1>
		<p class="mt-1 text-sm text-ink-muted">Visão geral da sua prática.</p>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Pacientes ativos -->
		<section class="surface p-5">
			<div class="flex items-start justify-between">
				<div>
					<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Pacientes ativos</p>
					<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg" data-testid="kpi-active-patients">
						{data.kpis.active_patients}
					</p>
				</div>
				<span class="rounded-xl bg-primary-50 p-2.5 dark:bg-primary-900/40">
					<Users size={20} class="text-primary" weight="duotone" />
				</span>
			</div>
		</section>

		<!-- Sessões próx. 7 dias -->
		<section class="surface p-5">
			<div class="flex items-start justify-between">
				<div>
					<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Sessões próx. 7 dias</p>
					<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg" data-testid="kpi-upcoming">
						{data.kpis.upcoming_sessions}
					</p>
				</div>
				<span class="rounded-xl bg-primary-50 p-2.5 dark:bg-primary-900/40">
					<Clock size={20} class="text-primary" weight="duotone" />
				</span>
			</div>
		</section>

		<!-- Receita projetada -->
		<section class="surface p-5">
			<div class="flex items-start justify-between">
				<div>
					<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Receita projetada</p>
					<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg" data-testid="kpi-projected">
						{formatBRL(data.kpis.projected)}
					</p>
				</div>
				<span class="rounded-xl bg-primary-50 p-2.5 dark:bg-primary-900/40">
					<CurrencyCircleDollar size={20} class="text-primary" weight="duotone" />
				</span>
			</div>
		</section>

		<!-- A receber — destaque urgência -->
		<section class="surface border-l-4 border-l-secondary p-5">
			<div class="flex items-start justify-between">
				<div>
					<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">A receber</p>
					<p class="mt-2 text-3xl font-bold tabular-nums text-secondary-600" data-testid="kpi-outstanding">
						{formatBRL(data.kpis.outstanding)}
					</p>
				</div>
				<span class="rounded-xl bg-secondary-50 p-2.5 dark:bg-secondary-900/20">
					<Warning size={20} class="text-secondary" weight="duotone" />
				</span>
			</div>
		</section>
	</div>
</div>
