<script lang="ts">
	import { enhance } from '$app/forms';
	import { PencilSimple, Trash, Plus, Warning } from 'phosphor-svelte';

	type HolidayType = 'nacional' | 'estadual' | 'local';

	interface HolidayRow {
		id: string;
		day: number;
		month: number;
		year: number | null;
		name: string;
		description: string | null;
		type: HolidayType;
		state: string | null;
		city: string | null;
	}

	interface Props {
		data: { holidays: HolidayRow[] };
	}
	let { data }: Props = $props();

	const CUR_YEAR = new Date().getFullYear();
	const YEAR_OPTIONS = [CUR_YEAR, CUR_YEAR + 1];

	let selectedYear = $state(CUR_YEAR);

	const filteredHolidays = $derived(
		data.holidays.filter((h) => h.year === null || h.year === selectedYear)
	);

	// ── Form dialog ───────────────────────────────────────────────────────────
	let formDialog: HTMLDialogElement;
	let deleteDialog: HTMLDialogElement;

	const emptyForm = (): HolidayRow => ({
		id: '',
		day: 1,
		month: new Date().getMonth() + 1,
		year: null,
		name: '',
		description: '',
		type: 'nacional',
		state: '',
		city: ''
	});

	let editing = $state<HolidayRow>(emptyForm());
	let pendingDelete = $state<HolidayRow | null>(null);
	let formError = $state<string | null>(null);

	const isEditing = $derived(editing.id !== '');

	function openAdd() {
		editing = emptyForm();
		formError = null;
		formDialog.showModal();
	}

	function openEdit(h: HolidayRow) {
		editing = { ...h, description: h.description ?? '', state: h.state ?? '', city: h.city ?? '' };
		formError = null;
		formDialog.showModal();
	}

	function openDelete(h: HolidayRow) {
		pendingDelete = h;
		deleteDialog.showModal();
	}

	// ── Labels ────────────────────────────────────────────────────────────────
	const MONTH_LABELS = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
	];

	const TYPE_LABEL: Record<HolidayType, string> = {
		nacional: 'Nacional',
		estadual: 'Estadual',
		local:    'Local'
	};

	function fmtDate(day: number, month: number): string {
		return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
	}
</script>

<!-- ── Form dialog (add / edit) ──────────────────────────────────────────── -->
<dialog
	bind:this={formDialog}
	class="rounded-2xl border border-primary-100/60 bg-bg p-6 shadow-xl dark:border-white/10 dark:bg-bg-dark
	       backdrop:bg-black/40 backdrop:backdrop-blur-sm w-full max-w-lg"
>
	<h2 class="mb-5 font-semibold text-ink dark:text-bg">
		{isEditing ? 'Editar feriado' : 'Novo feriado'}
	</h2>

	<form
		method="POST"
		action={isEditing ? '?/update' : '?/create'}
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				formDialog.close();
			} else if (result.type === 'failure') {
				formError = typeof result.data?.error === 'string' ? result.data.error : 'Erro ao salvar.';
			}
		}}
		class="space-y-4"
	>
		{#if isEditing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}

		<!-- Name -->
		<div>
			<label for="h_name" class="label">Nome</label>
			<input id="h_name" name="name" class="input" required bind:value={editing.name} />
		</div>

		<!-- Day + Month -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="h_day" class="label">Dia</label>
				<input
					id="h_day"
					name="day"
					type="number"
					min="1"
					max="31"
					class="input"
					required
					bind:value={editing.day}
				/>
			</div>
			<div>
				<label for="h_month" class="label">Mês</label>
				<select id="h_month" name="month" class="input" bind:value={editing.month}>
					{#each MONTH_LABELS as label, i}
						<option value={i + 1}>{label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Year + Type -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="h_year" class="label">Ano <span class="text-ink-muted/60 font-normal">(vazio = fixo)</span></label>
				<input
					id="h_year"
					name="year"
					type="number"
					min="2020"
					max="2100"
					placeholder="—"
					class="input"
					value={editing.year ?? ''}
					oninput={(e) => {
						const v = (e.currentTarget as HTMLInputElement).value;
						editing.year = v === '' ? null : Number(v);
					}}
				/>
			</div>
			<div>
				<label for="h_type" class="label">Tipo</label>
				<select id="h_type" name="type" class="input" bind:value={editing.type}>
					<option value="nacional">Nacional</option>
					<option value="estadual">Estadual</option>
					<option value="local">Local</option>
				</select>
			</div>
		</div>

		<!-- State (Estadual / Local) -->
		{#if editing.type === 'estadual' || editing.type === 'local'}
			<div>
				<label for="h_state" class="label">Estado (UF)</label>
				<input
					id="h_state"
					name="state"
					class="input uppercase"
					maxlength="2"
					placeholder="SP"
					bind:value={editing.state}
				/>
			</div>
		{:else}
			<input type="hidden" name="state" value="" />
		{/if}

		<!-- City (Local only) -->
		{#if editing.type === 'local'}
			<div>
				<label for="h_city" class="label">Cidade</label>
				<input id="h_city" name="city" class="input" bind:value={editing.city} />
			</div>
		{:else}
			<input type="hidden" name="city" value="" />
		{/if}

		<!-- Description -->
		<div>
			<label for="h_desc" class="label">Descrição <span class="font-normal text-ink-muted/60">(opcional)</span></label>
			<textarea
				id="h_desc"
				name="description"
				rows="2"
				class="input resize-none"
				bind:value={editing.description}
			></textarea>
		</div>

		{#if formError}
			<p class="text-sm text-red-600 dark:text-red-400">{formError}</p>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<button
				type="button"
				onclick={() => formDialog.close()}
				class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted transition
				       hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5"
			>
				Cancelar
			</button>
			<button
				type="submit"
				class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
			>
				{isEditing ? 'Salvar' : 'Adicionar'}
			</button>
		</div>
	</form>
</dialog>

<!-- ── Delete confirm dialog ─────────────────────────────────────────────── -->
<dialog
	bind:this={deleteDialog}
	class="rounded-2xl border border-primary-100/60 bg-bg p-6 shadow-xl dark:border-white/10 dark:bg-bg-dark
	       backdrop:bg-black/40 backdrop:backdrop-blur-sm w-full max-w-sm"
>
	{#if pendingDelete}
		<div class="flex items-start gap-3">
			<span class="mt-0.5 rounded-xl bg-red-100 p-2 dark:bg-red-900/30">
				<Warning size={20} class="text-red-600 dark:text-red-400" weight="fill" />
			</span>
			<div>
				<h2 class="font-semibold text-ink dark:text-bg">Remover feriado?</h2>
				<p class="mt-1 text-sm text-ink-muted">
					{pendingDelete.name} ({fmtDate(pendingDelete.day, pendingDelete.month)}) será removido permanentemente.
				</p>
			</div>
		</div>
		<div class="mt-5 flex justify-end gap-2">
			<button
				type="button"
				onclick={() => deleteDialog.close()}
				class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted transition
				       hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5"
			>
				Cancelar
			</button>
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => async ({ update }) => {
					await update({ reset: false });
					deleteDialog.close();
					pendingDelete = null;
				}}
			>
				<input type="hidden" name="id" value={pendingDelete.id} />
				<button
					type="submit"
					class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
				>
					Remover
				</button>
			</form>
		</div>
	{/if}
</dialog>

<!-- ── Page ───────────────────────────────────────────────────────────────── -->
<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Feriados</h1>
				<p class="mt-1 text-sm text-ink-muted">Gerencie feriados nacionais, estaduais e locais.</p>
			</div>
			<button
				type="button"
				onclick={openAdd}
				class="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
			>
				<Plus size={15} weight="bold" /> Adicionar
			</button>
		</div>
	</div>

	<!-- Year selector -->
	<div class="flex gap-2">
		{#each YEAR_OPTIONS as y}
			<button
				type="button"
				onclick={() => (selectedYear = y)}
				class="rounded-xl border px-4 py-1.5 text-sm font-medium transition
				       {selectedYear === y
				         ? 'border-primary bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-200'
				         : 'border-primary-100/60 text-ink-muted hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5'}"
			>
				{y}
			</button>
		{/each}
	</div>

	<!-- Table -->
	<div class="surface overflow-hidden p-0">
		{#if filteredHolidays.length === 0}
			<p class="px-6 py-10 text-center text-sm italic text-ink-muted">
				Nenhum feriado cadastrado para {selectedYear}.
			</p>
		{:else}
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-primary-100/40 dark:border-white/5">
						<th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Data</th>
						<th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</th>
						<th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Tipo</th>
						<th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Estado</th>
						<th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Cidade</th>
						<th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Ano</th>
						<th class="px-5 py-3"></th>
					</tr>
				</thead>
				<tbody>
					{#each filteredHolidays as h (h.id)}
						<tr class="border-b border-primary-100/40 last:border-0 dark:border-white/5">
							<td class="px-5 py-3 tabular-nums text-ink dark:text-bg">{fmtDate(h.day, h.month)}</td>
							<td class="px-5 py-3 font-medium text-ink dark:text-bg">
								{h.name}
								{#if h.description}
									<span class="block text-[11px] font-normal text-ink-muted">{h.description}</span>
								{/if}
							</td>
							<td class="px-5 py-3 text-ink-muted">{TYPE_LABEL[h.type]}</td>
							<td class="px-5 py-3 text-ink-muted">{h.state ?? '—'}</td>
							<td class="px-5 py-3 text-ink-muted">{h.city ?? '—'}</td>
							<td class="px-5 py-3 text-ink-muted">
								{#if h.year}{h.year}{:else}<span class="text-[11px] italic">Fixo</span>{/if}
							</td>
							<td class="px-5 py-3">
								<div class="flex justify-end gap-1">
									<button
										type="button"
										onclick={() => openEdit(h)}
										aria-label="Editar {h.name}"
										class="rounded-lg p-1.5 text-ink-muted transition hover:bg-primary-50/60 hover:text-primary dark:hover:bg-white/5"
									>
										<PencilSimple size={15} />
									</button>
									<button
										type="button"
										onclick={() => openDelete(h)}
										aria-label="Remover {h.name}"
										class="rounded-lg p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
									>
										<Trash size={15} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
