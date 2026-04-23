<script lang="ts">
	import { untrack } from 'svelte';
	import Card from '$lib/ui/Card.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import { formatBRL, formatDateTime, formatPhone } from '$lib/utils/format';
	import { PencilSimple } from 'phosphor-svelte';

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
		form: { error?: unknown; success?: boolean } | null;
	}
	let { data, form }: Props = $props();

	let editing = $state(false);
	let name = $state(untrack(() => data.patient.name));
	let email = $state(untrack(() => data.patient.email ?? ''));
	let phone = $state(untrack(() => data.patient.phone ?? ''));
	let session_fee = $state(untrack(() => data.patient.session_fee?.toString() ?? ''));
	let sessions_per_month = $state(untrack(() => data.patient.sessions_per_month.toString()));
	let gcal_email = $state(untrack(() => data.patient.google_calendar_attendee_email ?? ''));
	let active = $state(untrack(() => data.patient.active));

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

	const paidSessions = $derived(data.sessions.filter((s) => s.paid).length);
</script>

<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<a href="/app/patients" class="text-xs font-medium uppercase tracking-wide text-ink-muted hover:text-primary">
			← Pacientes
		</a>
		<div class="mt-2 flex items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">{data.patient.name}</h1>
				{#if data.patient.active}
					<span class="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary-900/40 dark:text-primary-200">
						Ativo
					</span>
				{:else}
					<span class="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-ink-muted dark:bg-white/5">
						Inativo
					</span>
				{/if}
			</div>
			<Button variant="ghost" onclick={() => (editing = !editing)}>
				<PencilSimple size={16} /> {editing ? 'Cancelar' : 'Editar'}
			</Button>
		</div>
	</div>

	{#if editing}
		<Card title="Editar paciente">
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					return async ({ update }) => {
						await update({ reset: false });
						if (!form?.error) editing = false;
					};
				}}
				class="grid gap-4 sm:grid-cols-2"
			>
				<Input label="Nome" name="name" bind:value={name} required />
				<Input label="E-mail" name="email" type="email" bind:value={email} />
				<Input label="Telefone" name="phone" bind:value={phone} />
				<Input label="Valor da consulta (R$)" name="session_fee" type="number" bind:value={session_fee} />
				<Input label="Sessões/mês" name="sessions_per_month" type="number" bind:value={sessions_per_month} />
				<Input label="E-mail (Google Calendar)" name="google_calendar_attendee_email" type="email" bind:value={gcal_email} />
				<label class="flex items-center gap-2 text-sm sm:col-span-2">
					<input type="checkbox" name="active" bind:checked={active} value="true" class="accent-primary" />
					Paciente ativo
				</label>
				<div class="flex justify-end gap-2 sm:col-span-2">
					<Button variant="ghost" onclick={() => (editing = false)}>Cancelar</Button>
					<Button type="submit">Salvar alterações</Button>
				</div>
				{#if form?.error}
					<p class="text-sm text-red-600 sm:col-span-2">{JSON.stringify(form.error)}</p>
				{/if}
			</form>
		</Card>
	{/if}

	<div class="grid gap-6 lg:grid-cols-3">
		<Card title="Contato">
			<dl class="space-y-3 text-sm">
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">E-mail</dt>
					<dd class="mt-0.5 font-medium text-ink dark:text-bg">{data.patient.email ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Telefone</dt>
					<dd class="mt-0.5 font-medium text-ink dark:text-bg">
						{data.patient.phone ? formatPhone(data.patient.phone) : '—'}
					</dd>
				</div>
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Google Calendar</dt>
					<dd class="mt-0.5 font-medium text-ink dark:text-bg">
						{data.patient.google_calendar_attendee_email ?? '—'}
					</dd>
				</div>
			</dl>
		</Card>

		<Card title="Frequência e valor">
			<dl class="space-y-3 text-sm">
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor da consulta</dt>
					<dd class="mt-1 text-2xl font-bold tabular-nums text-ink dark:text-bg">
						{formatBRL(data.patient.session_fee)}
					</dd>
				</div>
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Sessões por mês</dt>
					<dd class="mt-0.5 font-medium text-ink dark:text-bg">
						{data.patient.sessions_per_month}×
					</dd>
				</div>
			</dl>
		</Card>

		<Card title="Resumo de sessões">
			<dl class="space-y-3 text-sm">
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Total registradas</dt>
					<dd class="mt-1 text-2xl font-bold tabular-nums text-ink dark:text-bg">{data.sessions.length}</dd>
				</div>
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Pagas</dt>
					<dd class="mt-0.5 font-medium text-primary">{paidSessions} de {data.sessions.length}</dd>
				</div>
			</dl>
		</Card>
	</div>

	<Card title="Histórico de sessões">
		{#if data.sessions.length === 0}
			<p class="py-8 text-center text-ink-muted">Nenhuma sessão registrada.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-primary-100/60 dark:border-white/5">
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Data</th>
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
