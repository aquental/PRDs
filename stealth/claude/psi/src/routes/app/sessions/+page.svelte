<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Input from '$lib/ui/Input.svelte';
	import { enhance } from '$app/forms';
	import { formatBRL, formatDateTime } from '$lib/utils/format';
	import { Plus } from 'phosphor-svelte';

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
	interface Patient { id: string; name: string; session_fee: number | null }
	interface Schedule {
		id: string;
		day_of_week: number;
		start_time: string;
		duration_minutes: number;
		frequency: string;
		fee: number | null;
		patient_id: string;
		patients: { name: string } | null;
	}
	interface Props {
		data: { sessions: Row[]; patients: Patient[]; schedules: Schedule[]; workingHoursStart: number; workingHoursEnd: number };
		form: { error?: unknown; success?: boolean } | null;
	}
	let { data, form }: Props = $props();

	// ── Form state ────────────────────────────────────────────
	let showForm = $state(false);
	let patientId = $state('');
	let dayOfWeek = $state('1');
	let startTime = $state('08:00');
	let duration = $state('50');
	let frequency = $state('weekly');
	let fee = $state('');

	function onPatientChange(e: Event) {
		patientId = (e.target as HTMLSelectElement).value;
		const p = data.patients.find((p) => p.id === patientId);
		if (p?.session_fee != null) fee = p.session_fee.toString();
	}

	// ── Grid helpers ──────────────────────────────────────────
	const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
	const HOURS = $derived(
		Array.from(
			{ length: data.workingHoursEnd - data.workingHoursStart },
			(_, i) => i + data.workingHoursStart
		)
	);

	function slotAt(day: number, hour: number): Schedule | undefined {
		const hh = String(hour).padStart(2, '0');
		return data.schedules.find(
			(s) => s.day_of_week === day && s.start_time.startsWith(hh + ':')
		);
	}

	// ── Status labels/classes ─────────────────────────────────
	const statusLabel: Record<string, string> = {
		scheduled: 'Agendada', completed: 'Realizada',
		cancelled: 'Cancelada', no_show: 'Faltou'
	};
	const statusClass: Record<string, string> = {
		scheduled: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
		completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
		cancelled: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
		no_show: 'bg-secondary-50 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300'
	};

	const freqLabel: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quinzenal' };
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-start justify-between border-b border-primary-100/40 pb-6 dark:border-white/5">
		<div>
			<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Sessões</h1>
			<p class="mt-1 text-sm text-ink-muted">Agenda fixa e histórico de atendimentos.</p>
		</div>
		<Button onclick={() => (showForm = !showForm)} data-testid="btn-new-schedule">
			<Plus size={16} weight="bold" /> Reservar horário
		</Button>
	</div>

	<!-- Form: novo horário fixo -->
	{#if showForm}
		<Card title="Reservar horário fixo">
			<form
				method="POST"
				action="?/createSchedule"
				use:enhance={() => async ({ update }) => {
					await update();
					if (!form?.error) {
						showForm = false;
						patientId = ''; dayOfWeek = '1'; startTime = '08:00';
						duration = '50'; frequency = 'weekly'; fee = '';
					}
				}}
				class="grid gap-4 sm:grid-cols-2"
			>
				<!-- Paciente -->
				<div class="sm:col-span-2">
					<label for="patient_id" class="label">Paciente</label>
					<select id="patient_id" name="patient_id" class="input" bind:value={patientId}
						onchange={onPatientChange} required data-testid="sel-patient">
						<option value="" disabled>Selecione um paciente…</option>
						{#each data.patients as p (p.id)}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</div>

				<!-- Dia da semana -->
				<div>
					<label for="day_of_week" class="label">Dia da semana</label>
					<select id="day_of_week" name="day_of_week" class="input" bind:value={dayOfWeek}
						data-testid="sel-day">
						{#each DAYS as d, i}
							<option value={String(i + 1)}>{d}</option>
						{/each}
					</select>
				</div>

				<!-- Horário -->
				<div>
					<label for="start_time" class="label">Horário</label>
					<select id="start_time" name="start_time" class="input" bind:value={startTime}
						data-testid="sel-time">
						{#each HOURS as h}
							<option value="{String(h).padStart(2,'0')}:00">
								{String(h).padStart(2,'0')}:00
							</option>
						{/each}
					</select>
				</div>

				<!-- Duração -->
				<Input label="Duração (min)" name="duration_minutes" type="number" bind:value={duration} />

				<!-- Frequência -->
				<div>
					<label for="frequency" class="label">Frequência</label>
					<select id="frequency" name="frequency" class="input" bind:value={frequency}
						data-testid="sel-frequency">
						<option value="weekly">Semanal</option>
						<option value="biweekly">Quinzenal</option>
					</select>
				</div>

				<!-- Valor -->
				<Input label="Valor (R$)" name="fee" type="number" bind:value={fee} />

				<div class="flex justify-end gap-2 sm:col-span-2">
					<Button variant="ghost" onclick={() => (showForm = false)}>Cancelar</Button>
					<Button type="submit" data-testid="btn-save-schedule">Salvar</Button>
				</div>

				{#if form?.error}
					<p class="text-sm text-red-600 sm:col-span-2">
						{typeof form.error === 'string' ? form.error : JSON.stringify(form.error)}
					</p>
				{/if}
			</form>
		</Card>
	{/if}

	<!-- Agenda semanal -->
	<Card title="Agenda semanal">
		{#if data.schedules.length === 0}
			<p class="py-8 text-center text-ink-muted">Nenhum horário fixo cadastrado.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-center text-xs">
					<thead>
						<tr>
							<th class="w-16 pb-3 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">
								Hora
							</th>
							{#each DAYS as d}
								<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">{d}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each HOURS as hour}
							{@const rowHasSlot = DAYS.some((_, i) => slotAt(i + 1, hour))}
							{#if rowHasSlot || true}
								<tr class="border-t border-primary-100/40 dark:border-white/5">
									<td class="py-2 pr-3 text-left tabular-nums text-ink-muted">
										{String(hour).padStart(2, '0')}:00
									</td>
									{#each DAYS as _d, di}
										{@const slot = slotAt(di + 1, hour)}
										<td class="px-1 py-1.5">
											{#if slot}
												<div class="rounded-lg bg-primary-100 px-2 py-2 dark:bg-primary-900/40">
													<p class="font-semibold text-primary-700 dark:text-primary-200 truncate">
														{slot.patients?.name ?? '—'}
													</p>
													<p class="mt-0.5 text-[10px] text-ink-muted">
														{freqLabel[slot.frequency]} · {slot.duration_minutes} min
													</p>
												</div>
											{/if}
										</td>
									{/each}
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>

	<!-- Histórico de sessões -->
	<Card title="Histórico de sessões">
		{#if data.sessions.length === 0}
			<p class="py-8 text-center text-ink-muted">Nenhuma sessão registrada ainda.</p>
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
									<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {statusClass[s.status] ?? ''}">
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
