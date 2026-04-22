<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import { formatBRL, formatDateTime } from '$lib/utils/format';

	interface Row {
		id: string;
		scheduled_at: string;
		duration_minutes: number;
		fee: number | null;
		status: string;
		paid: boolean;
		patient_id: string;
		patients: { name: string } | null;
	}
	interface Props {
		data: { sessions: Row[] };
	}
	let { data }: Props = $props();

	const statusLabel: Record<string, string> = {
		scheduled: 'Agendada',
		completed: 'Realizada',
		cancelled: 'Cancelada',
		no_show: 'Faltou'
	};

	const statusClass: Record<string, string> = {
		scheduled: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
		completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
		cancelled: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
		no_show: 'bg-secondary-50 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300'
	};
</script>

<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Sessões</h1>
		<p class="mt-1 text-sm text-ink-muted">Histórico e agenda de atendimentos.</p>
	</div>

	<Card>
		{#if data.sessions.length === 0}
			<p class="py-12 text-center text-ink-muted">Nenhuma sessão registrada ainda.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm" data-testid="tbl-sessions">
					<thead>
						<tr class="border-b border-primary-100/60 dark:border-white/5">
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Data</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Paciente</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Duração</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Status</th>
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor</th>
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Pago</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
						{#each data.sessions as s (s.id)}
							<tr>
								<td class="py-3.5 text-ink-muted">{formatDateTime(s.scheduled_at)}</td>
								<td class="py-3.5 font-medium">
									<a href="/app/patients/{s.patient_id}" class="hover:text-primary">
										{s.patients?.name ?? '—'}
									</a>
								</td>
								<td class="py-3.5 text-ink-muted">{s.duration_minutes} min</td>
								<td class="py-3.5">
									<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {statusClass[s.status] ?? 'bg-primary-50 text-primary-700'}">
										{statusLabel[s.status] ?? s.status}
									</span>
								</td>
								<td class="py-3.5 text-right tabular-nums font-medium">{formatBRL(s.fee)}</td>
								<td class="py-3.5 text-right">
									{#if s.paid}
										<span class="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Pago</span>
									{:else}
										<span class="text-xs text-ink-muted">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</div>
