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

<div class="space-y-6">
	<div>
		<h1 class="font-heading text-3xl font-bold">Início</h1>
		<p class="text-ink-muted">Visão geral da sua prática.</p>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">Pacientes ativos</p>
					<p class="mt-1 text-3xl font-semibold" data-testid="kpi-active-patients">
						{data.kpis.active_patients}
					</p>
				</div>
				<Users size={24} class="text-primary" weight="duotone" />
			</div>
		</Card>
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">Sessões próx. 7 dias</p>
					<p class="mt-1 text-3xl font-semibold" data-testid="kpi-upcoming">
						{data.kpis.upcoming_sessions}
					</p>
				</div>
				<Clock size={24} class="text-primary" weight="duotone" />
			</div>
		</Card>
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">Receita projetada</p>
					<p class="mt-1 text-3xl font-semibold" data-testid="kpi-projected">
						{formatBRL(data.kpis.projected)}
					</p>
				</div>
				<CurrencyCircleDollar size={24} class="text-primary" weight="duotone" />
			</div>
		</Card>
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">A receber</p>
					<p class="mt-1 text-3xl font-semibold text-secondary-600" data-testid="kpi-outstanding">
						{formatBRL(data.kpis.outstanding)}
					</p>
				</div>
				<Warning size={24} class="text-secondary" weight="duotone" />
			</div>
		</Card>
	</div>
</div>
