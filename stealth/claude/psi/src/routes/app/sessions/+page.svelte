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
</script>

<div class="space-y-6">
	<h1 class="font-heading text-3xl font-bold">Sessões</h1>

	<Card>
		{#if data.sessions.length === 0}
			<p class="py-12 text-center text-ink-muted">Nenhuma sessão registrada ainda.</p>
		{:else}
			<table class="w-full text-left text-sm" data-testid="tbl-sessions">
				<thead class="text-xs uppercase text-ink-muted">
					<tr>
						<th class="py-2">Data</th>
						<th>Paciente</th>
						<th>Duração</th>
						<th>Status</th>
						<th class="text-right">Valor</th>
						<th class="text-right">Pago?</th>
					</tr>
				</thead>
				<tbody>
					{#each data.sessions as s (s.id)}
						<tr class="border-t border-primary-100/40 dark:border-white/5">
							<td class="py-3">{formatDateTime(s.scheduled_at)}</td>
							<td>
								<a href="/app/patients/{s.patient_id}" class="hover:text-primary">
									{s.patients?.name ?? '—'}
								</a>
							</td>
							<td>{s.duration_minutes} min</td>
							<td>{statusLabel[s.status] ?? s.status}</td>
							<td class="text-right tabular-nums">{formatBRL(s.fee)}</td>
							<td class="text-right">{s.paid ? '✓' : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</Card>
</div>
