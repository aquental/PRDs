<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Input from '$lib/ui/Input.svelte';
	import { enhance } from '$app/forms';
	import { formatBRL, formatDateTime } from '$lib/utils/format';
	import { Plus, Trash, CheckCircle } from 'phosphor-svelte';

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
		form: { error?: unknown; success?: boolean; action?: string } | null;
	}
	let { data, form }: Props = $props();

	// ── Error formatting ──────────────────────────────────────
	function formatFormError(err: unknown): string {
		if (typeof err === 'string') return err;
		if (err && typeof err === 'object') {
			const entries = Object.entries(err as Record<string, string[]>);
			if (entries.length > 0)
				return entries.map(([f, msgs]) => `${f}: ${msgs.join(', ')}`).join(' · ');
		}
		return 'Erro inesperado. Tente novamente.';
	}

	// ── Toast ─────────────────────────────────────────────────
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function showToast(msg: string) {
		if (toastTimer) clearTimeout(toastTimer);
		toast = msg;
		toastTimer = setTimeout(() => (toast = null), 3500);
	}

	$effect(() => {
		if (form?.success) {
			if (form.action === 'markPaid') showToast('Sessão marcada como paga.');
			else if (form.action === 'deleteSchedule') showToast('Horário removido.');
			else showToast('Horário salvo com sucesso.');
		}
	});

	// ── Form state ────────────────────────────────────────────
	let showForm = $state(false);
	let saving = $state(false);
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

<!-- Toast -->
{#if toast}
	<div
		class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-bg shadow-lg"
		role="status"
		aria-live="polite"
	>
		{toast}
	</div>
{/if}

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
				use:enhance={() => {
					saving = true;
					return async ({ update }) => {
						await update();
						saving = false;
						if (!form?.error) showForm = false;
					};
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
				<Input label="Valor da sessão (R$)" name="fee" type="number" bind:value={fee} />

				<div class="flex justify-end gap-2 sm:col-span-2">
					<Button variant="ghost" onclick={() => (showForm = false)}>Cancelar</Button>
					<Button type="submit" loading={saving} data-testid="btn-save-schedule">Salvar</Button>
				</div>

				{#if form?.error && !form?.action}
					<p class="text-sm text-red-600 sm:col-span-2">{formatFormError(form.error)}</p>
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
												<div class="group relative rounded-lg bg-primary-100 px-2 py-2 dark:bg-primary-900/40">
													<p class="truncate font-semibold text-primary-700 dark:text-primary-200">
														{slot.patients?.name ?? '—'}
													</p>
													<p class="mt-0.5 text-[10px] text-ink-muted">
														{freqLabel[slot.frequency]} · {slot.duration_minutes} min
													</p>
													<form
														method="POST"
														action="?/deleteSchedule"
														use:enhance={() => async ({ update }) => { await update(); }}
														class="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
													>
														<input type="hidden" name="schedule_id" value={slot.id} />
														<button
															type="submit"
															class="rounded p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
															title="Remover horário"
															aria-label="Remover horário de {slot.patients?.name}"
														>
															<Trash size={12} weight="bold" />
														</button>
													</form>
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
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor da sessão</th>
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Pagamento</th>
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
								<td class="py-3.5 text-right tabular-nums font-medium">{formatBRL(s.fee ?? 0)}</td>
								<td class="py-3.5 text-right">
									{#if s.paid}
										<span class="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Pago</span>
									{:else if s.status === 'completed'}
										<form
											method="POST"
											action="?/markPaid"
											use:enhance={() => async ({ update }) => { await update(); }}
											class="inline"
										>
											<input type="hidden" name="session_id" value={s.id} />
											<button
												type="submit"
												class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
												title="Marcar como pago"
											>
												<CheckCircle size={12} weight="bold" />
												Marcar como pago
											</button>
										</form>
									{:else}
										<span class="text-xs text-ink-muted">Pendente</span>
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
