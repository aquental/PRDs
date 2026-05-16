<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Input from '$lib/ui/Input.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import { enhance } from '$app/forms';
	import { formatBRL, formatBRLDecimal, formatDateTime } from '$lib/utils/format';
	import { Plus, Trash, CheckCircle, CalendarBlank, PencilSimple, DotsSixVertical } from 'phosphor-svelte';

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
			if (form.action === 'markPaid') {
				showToast('Sessão marcada como paga.');
			} else if (form.action === 'bulkMarkPaid') {
				selectedIds = new Set();
				showToast('Sessões marcadas como pagas.');
			} else if (form.action === 'deleteSchedule') {
				showToast('Horário removido.');
			} else if (form.action === 'moveSchedule') {
				editingSlotId = null;
				showToast('Horário atualizado.');
			} else {
				showToast('Horário salvo com sucesso.');
			}
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

	// ── Filtering ─────────────────────────────────────────────
	let filterPatientId = $state('');
	let filterStatuses = $state(new Set<string>());
	let filterFrom = $state('');
	let filterTo = $state('');

	// ── Bulk selection ────────────────────────────────────────
	let selectedIds = $state(new Set<string>());

	// ── Schedule editing ──────────────────────────────────────
	let editingSlotId = $state<string | null>(null);
	let editDay = $state('');
	let editTime = $state('');

	interface ConflictInfo { name: string; day: string; time: string }
	let conflictModal = $state<ConflictInfo | null>(null);

	// ── Optimistic payment ────────────────────────────────────
	let optimisticallyPaidIds = $state(new Set<string>());

	// ── Derived values ────────────────────────────────────────
	const filteredSessions = $derived(
		data.sessions.filter(s => {
			if (filterPatientId && s.patient_id !== filterPatientId) return false;
			if (filterStatuses.size > 0 && !filterStatuses.has(s.status)) return false;
			if (filterFrom && s.scheduled_at < filterFrom) return false;
			if (filterTo && s.scheduled_at > filterTo + 'T23:59:59Z') return false;
			return true;
		})
	);

	const hasActiveFilters = $derived(
		!!filterPatientId || filterStatuses.size > 0 || !!filterFrom || !!filterTo
	);

	const allSelectableIds = $derived(
		filteredSessions.filter(s => s.status === 'completed' && !s.paid && !optimisticallyPaidIds.has(s.id)).map(s => s.id)
	);
	const allSelected = $derived(
		allSelectableIds.length > 0 && allSelectableIds.every(id => selectedIds.has(id))
	);
	const someSelected = $derived(selectedIds.size > 0);

	// Mobile day-list grouping for schedule
	const schedulesByDay = $derived(
		DAYS.map((label, i) => ({
			label,
			day: i + 1,
			slots: data.schedules
				.filter(s => s.day_of_week === i + 1)
				.sort((a, b) => a.start_time.localeCompare(b.start_time))
		})).filter(d => d.slots.length > 0)
	);

	// ── Helper functions ──────────────────────────────────────
	function toggleStatus(key: string) {
		if (filterStatuses.has(key)) filterStatuses.delete(key);
		else filterStatuses.add(key);
		filterStatuses = new Set(filterStatuses);
	}

	function toggleOne(id: string) {
		if (selectedIds.has(id)) selectedIds.delete(id);
		else selectedIds.add(id);
		selectedIds = new Set(selectedIds);
	}

	function toggleAll() {
		if (allSelected) selectedIds = new Set();
		else selectedIds = new Set(allSelectableIds);
	}

	function clearFilters() {
		filterPatientId = '';
		filterStatuses = new Set();
		filterFrom = '';
		filterTo = '';
	}

	function exportCSV() {
		const headers = ['Data', 'Paciente', 'Duração', 'Status', 'Valor', 'Pago'];
		const toExport = filteredSessions.filter(s => selectedIds.size === 0 || selectedIds.has(s.id));
		const rows = toExport.map(s => [
			formatDateTime(s.scheduled_at),
			s.patients?.name ?? '',
			s.duration_minutes,
			statusLabel[s.status] ?? s.status,
			formatBRLDecimal(s.fee ?? 0),
			s.paid || optimisticallyPaidIds.has(s.id) ? 'Sim' : 'Não'
		]);
		const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
		const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `sessoes-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<!-- Conflict modal -->
{#if conflictModal}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="conflict-title"
		onkeydown={(e) => { if (e.key === 'Escape') conflictModal = null; }}
	>
		<div class="surface w-full max-w-sm space-y-4 p-6">
			<h3 id="conflict-title" class="font-heading text-base font-semibold text-ink dark:text-bg">
				Horário indisponível
			</h3>
			<p class="text-sm text-ink-muted leading-relaxed">
				O horário de <strong class="text-ink dark:text-bg">{conflictModal.time}</strong>
				de <strong class="text-ink dark:text-bg">{conflictModal.day}</strong>
				já está ocupado por <strong class="text-ink dark:text-bg">{conflictModal.name}</strong>.
				Escolha outro dia ou horário.
			</p>
			<div class="flex justify-end">
				<Button onclick={() => (conflictModal = null)}>Entendi</Button>
			</div>
		</div>
	</div>
{/if}

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

<!-- Bulk action bar -->
{#if someSelected}
	<div
		class="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 surface shadow-xl px-5 py-3 rounded-2xl border border-primary-100/60 dark:border-white/10"
		role="toolbar"
		aria-label="Ações em lote"
	>
		<span class="text-sm font-medium text-ink dark:text-bg">
			{selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
		</span>
		<div class="h-4 w-px bg-primary-100/60 dark:bg-white/10"></div>
		<form method="POST" action="?/bulkMarkPaid" use:enhance={() => {
			return async ({ update }) => {
				await update();
			};
		}}>
			{#each [...selectedIds] as id}
				<input type="hidden" name="session_ids" value={id} />
			{/each}
			<Button type="submit" data-testid="btn-bulk-paid">Marcar pagas</Button>
		</form>
		<Button variant="ghost" onclick={exportCSV}>Exportar CSV</Button>
		<Button variant="ghost" onclick={() => (selectedIds = new Set())}>Cancelar</Button>
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
			<EmptyState
				title="Nenhum horário fixo cadastrado"
				description="Defina sua agenda recorrente para que as sessões sejam geradas automaticamente a cada semana."
			>
				{#snippet icon()}
					<CalendarBlank size={28} weight="duotone" />
				{/snippet}
				{#snippet action()}
					<Button onclick={() => (showForm = true)}>
						<Plus size={16} weight="bold" /> Reservar horário
					</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<!-- MOBILE: day-list view (hidden on sm+) -->
			<div class="sm:hidden space-y-4">
				{#each schedulesByDay as group}
					<div>
						<p class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-1">{group.label}</p>
						<ul class="divide-y divide-primary-100/40 dark:divide-white/5">
							{#each group.slots as slot (slot.id)}
								<li class="flex items-center justify-between py-2.5 gap-3">
									<div class="flex items-center gap-3 min-w-0">
										<span class="w-10 shrink-0 tabular-nums text-xs text-ink-muted">{slot.start_time.slice(0, 5)}</span>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium text-ink dark:text-bg">{slot.patients?.name ?? '—'}</p>
											<p class="text-[10px] text-ink-muted">{freqLabel[slot.frequency]} · {slot.duration_minutes} min</p>
										</div>
									</div>
									<form method="POST" action="?/deleteSchedule" use:enhance={() => async ({ update }) => { await update(); }}>
										<input type="hidden" name="schedule_id" value={slot.id} />
										<button type="submit" class="shrink-0 rounded p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Remover horário de {slot.patients?.name}">
											<Trash size={14} weight="bold" />
										</button>
									</form>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>

			<!-- DESKTOP: grid view (hidden below sm) -->
			<div class="hidden sm:block overflow-x-auto">
				<table class="w-full text-center text-xs" role="grid">
					<thead>
						<tr>
							<th scope="col" class="w-16 pb-3 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Hora</th>
							{#each DAYS as d}
								<th scope="col" class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">{d}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each HOURS as hour}
							<tr class="border-t border-primary-100/40 dark:border-white/5">
									<th scope="row" class="h-14 py-2 pr-3 text-left align-middle tabular-nums text-ink-muted font-normal">
										{String(hour).padStart(2, '0')}:00
									</th>
									{#each DAYS as _d, di}
										{@const slot = slotAt(di + 1, hour)}
										<td class="h-14 px-1 py-1.5 align-top" role="gridcell">
											{#if slot}
												{#if editingSlotId === slot.id}
													<!-- Inline edit form -->
													<form method="POST" action="?/moveSchedule"
														use:enhance={({ formData }) => {
															const targetDay = Number(formData.get('day_of_week'));
															const targetTime = (formData.get('start_time') as string) ?? '';
															return async ({ update, result }) => {
																if (result.type === 'failure') {
																	const conflict = data.schedules.find(
																		s => s.day_of_week === targetDay && s.start_time.startsWith(targetTime)
																	);
																	conflictModal = {
																		name: conflict?.patients?.name ?? 'outro paciente',
																		day: DAYS[targetDay - 1] ?? '',
																		time: targetTime.slice(0, 5)
																	};
																} else {
																	await update();
																}
															};
														}}
														class="rounded-lg bg-primary-50 dark:bg-primary-900/40 p-2 text-left space-y-1.5">
														<input type="hidden" name="schedule_id" value={slot.id} />
														<div>
															<label for="edit-day-{slot.id}" class="label text-[10px]">Dia</label>
															<select id="edit-day-{slot.id}" name="day_of_week" class="input text-xs py-1" bind:value={editDay}>
																{#each DAYS as d, i}
																	<option value={String(i + 1)}>{d}</option>
																{/each}
															</select>
														</div>
														<div>
															<label for="edit-time-{slot.id}" class="label text-[10px]">Hora</label>
															<select id="edit-time-{slot.id}" name="start_time" class="input text-xs py-1" bind:value={editTime}>
																{#each HOURS as h}
																	<option value="{String(h).padStart(2,'0')}:00">{String(h).padStart(2,'0')}:00</option>
																{/each}
															</select>
														</div>
														<div class="flex gap-1 justify-end">
															<button type="button" class="btn btn-ghost text-[10px] px-2 py-1" onclick={() => (editingSlotId = null)}>✕</button>
															<button type="submit" class="btn btn-primary text-[10px] px-2 py-1">Mover</button>
														</div>
													</form>
												{:else}
													<div
														class="group relative rounded-lg bg-primary-100 px-2 py-2 dark:bg-primary-900/40"
														role="gridcell"
														aria-label="{slot.patients?.name ?? '—'}, {DAYS[di]}, {slot.start_time.slice(0, 5)}, {freqLabel[slot.frequency]}"
													>
														<!-- Move handle -->
														<span class="absolute left-1 top-1/2 -translate-y-1/2 text-primary-300 dark:text-primary-700 opacity-0 group-hover:opacity-100 cursor-grab" aria-hidden="true">
															<DotsSixVertical size={12} weight="bold" />
														</span>
														<div class="pl-3">
															<p class="truncate font-semibold text-primary-700 dark:text-primary-200">{slot.patients?.name ?? '—'}</p>
															<p class="mt-0.5 text-[10px] text-ink-muted">{freqLabel[slot.frequency]} · {slot.duration_minutes} min</p>
														</div>
														<div class="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
															<button
																type="button"
																class="rounded p-0.5 text-primary-600 hover:bg-primary-200 dark:hover:bg-primary-800"
																onclick={() => { editingSlotId = slot.id; editDay = String(slot.day_of_week); editTime = slot.start_time.slice(0, 5); }}
																aria-label="Editar horário de {slot.patients?.name}"
															>
																<PencilSimple size={12} weight="bold" />
															</button>
															<form method="POST" action="?/deleteSchedule"
																use:enhance={() => async ({ update }) => { await update(); }}
																class="contents">
																<input type="hidden" name="schedule_id" value={slot.id} />
																<button type="submit" class="rounded p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Remover horário" aria-label="Remover horário de {slot.patients?.name}">
																	<Trash size={12} weight="bold" />
																</button>
															</form>
														</div>
													</div>
												{/if}
											{/if}
										</td>
									{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>

	<!-- Histórico de sessões -->
	<Card title="Histórico de sessões">
		<!-- Filter bar -->
		<div class="mb-4 flex flex-wrap items-end gap-3">
			<div class="flex-1 min-w-[140px]">
				<label for="filter-patient" class="label">Paciente</label>
				<select id="filter-patient" class="input" bind:value={filterPatientId}>
					<option value="">Todos os pacientes</option>
					{#each data.patients as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>
			<div class="flex-1 min-w-[120px]">
				<label for="filter-from" class="label">De</label>
				<input id="filter-from" type="date" class="input" bind:value={filterFrom} />
			</div>
			<div class="flex-1 min-w-[120px]">
				<label for="filter-to" class="label">Até</label>
				<input id="filter-to" type="date" class="input" bind:value={filterTo} />
			</div>
			{#if hasActiveFilters}
				<Button variant="ghost" onclick={clearFilters} data-testid="btn-clear-filters">Limpar</Button>
			{/if}
		</div>

		<!-- Status filter pills -->
		<div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
			{#each Object.entries(statusLabel) as [key, label]}
				<button
					type="button"
					onclick={() => toggleStatus(key)}
					class="rounded-full px-3 py-0.5 text-xs font-medium border transition
					       {filterStatuses.has(key)
					         ? statusClass[key] + ' border-transparent'
					         : 'border-primary-100 text-ink-muted hover:bg-primary-50 dark:border-white/10 dark:hover:bg-white/5'}"
					aria-pressed={filterStatuses.has(key)}
				>
					{label}
				</button>
			{/each}
		</div>

		{#if hasActiveFilters}
			<p class="mb-3 text-xs text-ink-muted">
				Exibindo {filteredSessions.length} de {data.sessions.length} sessões
			</p>
		{/if}

		{#if filteredSessions.length === 0 && data.sessions.length === 0}
			<EmptyState
				title="Nenhuma sessão registrada ainda"
				description="As sessões aparecerão aqui conforme os atendimentos forem realizados."
			/>
		{:else if filteredSessions.length === 0}
			<p class="py-8 text-center text-sm text-ink-muted">Nenhuma sessão encontrada com os filtros aplicados.</p>
		{:else}
			<!-- MOBILE: card list (hidden on sm+) -->
			<ul class="sm:hidden divide-y divide-primary-100/40 dark:divide-white/5">
				{#each filteredSessions as s (s.id)}
					<li class="py-4 flex flex-col gap-1.5">
						<div class="flex items-start justify-between gap-2">
							<span class="text-xs text-ink-muted tabular-nums">{formatDateTime(s.scheduled_at)}</span>
							<span class="inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium {statusClass[s.status] ?? ''}">
								{statusLabel[s.status] ?? s.status}
							</span>
						</div>
						<a href="/app/patients/{s.patient_id}" class="text-sm font-semibold text-ink dark:text-bg hover:text-primary truncate">
							{s.patients?.name ?? '—'}
						</a>
						<div class="flex items-center justify-between">
							<span class="text-xs text-ink-muted">{s.duration_minutes} min · {formatBRL(s.fee ?? 0)}</span>
							{#if s.paid || optimisticallyPaidIds.has(s.id)}
								<span class="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Pago</span>
							{:else if s.status === 'completed'}
								<form method="POST" action="?/markPaid" use:enhance={() => {
									optimisticallyPaidIds.add(s.id);
									optimisticallyPaidIds = new Set(optimisticallyPaidIds);
									return async ({ update, result }) => {
										await update({ reset: false });
										if (result.type === 'failure') {
											optimisticallyPaidIds.delete(s.id);
											optimisticallyPaidIds = new Set(optimisticallyPaidIds);
										}
									};
								}} class="inline">
									<input type="hidden" name="session_id" value={s.id} />
									<button type="submit" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
										<CheckCircle size={12} weight="bold" /> Marcar pago
									</button>
								</form>
							{:else}
								<span class="text-xs text-ink-muted">Pendente</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<!-- DESKTOP: table (hidden below sm) -->
			<div class="hidden sm:block overflow-x-auto">
				<table class="w-full text-left text-sm" data-testid="tbl-sessions">
					<thead>
						<tr class="border-b border-primary-100/60 dark:border-white/5">
							<th class="w-8 pb-3">
								<input
									type="checkbox"
									class="rounded border-primary-200 accent-primary"
									checked={allSelected}
									onchange={toggleAll}
									aria-label="Selecionar todas as sessões elegíveis"
								/>
							</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Data</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Paciente</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Duração</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Status</th>
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor da sessão</th>
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Pagamento</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
						{#each filteredSessions as s (s.id)}
							<tr>
								<td class="py-3.5">
									<input
										type="checkbox"
										class="rounded border-primary-200 accent-primary"
										checked={selectedIds.has(s.id)}
										disabled={s.status !== 'completed' || s.paid || optimisticallyPaidIds.has(s.id)}
										onchange={() => toggleOne(s.id)}
										aria-label="Selecionar sessão de {s.patients?.name ?? 'paciente'}"
									/>
								</td>
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
									{#if s.paid || optimisticallyPaidIds.has(s.id)}
										<span class="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Pago</span>
									{:else if s.status === 'completed'}
										<form method="POST" action="?/markPaid" use:enhance={() => {
											optimisticallyPaidIds.add(s.id);
											optimisticallyPaidIds = new Set(optimisticallyPaidIds);
											return async ({ update, result }) => {
												await update({ reset: false });
												if (result.type === 'failure') {
													optimisticallyPaidIds.delete(s.id);
													optimisticallyPaidIds = new Set(optimisticallyPaidIds);
												}
											};
										}} class="inline">
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
