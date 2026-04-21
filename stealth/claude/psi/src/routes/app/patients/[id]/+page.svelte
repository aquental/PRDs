<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import { formatBRL, formatDateTime, formatPhone } from '$lib/utils/format';

	interface Session {
		id: string;
		scheduled_at: string;
		duration_minutes: number;
		fee: number | null;
		status: string;
		paid: boolean;
	}
	interface Props {
		data: {
			patient: {
				id: string;
				name: string;
				email: string | null;
				phone: string | null;
				session_fee: number | null;
				sessions_per_month: number;
				active: boolean;
				google_calendar_attendee_email: string | null;
			};
			sessions: Session[];
		};
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
	<div>
		<a href="/app/patients" class="text-sm text-ink-muted hover:text-primary">← Pacientes</a>
		<h1 class="font-heading text-3xl font-bold mt-1">{data.patient.name}</h1>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<Card title="Contato">
			<dl class="space-y-2 text-sm">
				<div>
					<dt class="text-ink-muted">E-mail</dt>
					<dd>{data.patient.email ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-ink-muted">Telefone</dt>
					<dd>{data.patient.phone ? formatPhone(data.patient.phone) : '—'}</dd>
				</div>
				<div>
					<dt class="text-ink-muted">Google Calendar</dt>
					<dd>{data.patient.google_calendar_attendee_email ?? '—'}</dd>
				</div>
			</dl>
		</Card>

		<Card title="Frequência e valor">
			<dl class="space-y-2 text-sm">
				<div>
					<dt class="text-ink-muted">Valor da consulta</dt>
					<dd class="text-2xl font-semibold">{formatBRL(data.patient.session_fee)}</dd>
				</div>
				<div>
					<dt class="text-ink-muted">Sessões por mês</dt>
					<dd>{data.patient.sessions_per_month}</dd>
				</div>
			</dl>
		</Card>

		<Card title="Status">
			<p>
				{#if data.patient.active}
					<span class="rounded bg-primary-50 dark:bg-primary-900/40 text-primary px-2 py-1 text-xs">
						Ativo
					</span>
				{:else}
					<span class="rounded bg-ink-muted/10 text-ink-muted px-2 py-1 text-xs">Inativo</span>
				{/if}
			</p>
		</Card>
	</div>

	<Card title="Histórico de sessões">
		{#if data.sessions.length === 0}
			<p class="py-8 text-center text-ink-muted">Nenhuma sessão registrada.</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead class="text-xs uppercase text-ink-muted">
					<tr>
						<th class="py-2">Data</th>
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
