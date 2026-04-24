<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Buildings, Users, Heartbeat, CurrencyDollar,
		Pencil, Trash, Plus, MagnifyingGlass, Warning, X
	} from 'phosphor-svelte';
	import type {
		ClinicRow, TherapistRow, PatientRow, ExpenseRow,
		TherapistOption
	} from './+page.server';
	import { formatBRL } from '$lib/utils/format';

	interface Props {
		data: {
			therapistId: string | null;
			tab: string;
			therapistList: TherapistOption[];
			clinics: ClinicRow[];
			therapists: TherapistRow[];
			patients: PatientRow[];
			expenses: ExpenseRow[];
			meta: {
				timezones: string[];
				expenseFrequencies: { value: string; label: string }[];
				patientFrequencies: { value: string; label: string }[];
				brStates: string[];
			};
		};
	}
	let { data }: Props = $props();

	// ── Tabs ─────────────────────────────────────────────────────────────────
	const TABS = [
		{ id: 'clinicas',    label: 'Clínicas',    icon: Buildings,       needsTherapist: true  },
		{ id: 'terapeutas',  label: 'Terapeutas',  icon: Users,           needsTherapist: false },
		{ id: 'pacientes',   label: 'Pacientes',   icon: Heartbeat,       needsTherapist: true  },
		{ id: 'despesas',    label: 'Despesas',    icon: CurrencyDollar,  needsTherapist: true  },
	];

	const activeTab = $derived(data.tab);

	function switchTab(id: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('tab', id);
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// ── Combobox ──────────────────────────────────────────────────────────────
	let searchQuery = $state(untrack(() => data.therapistList.find((t) => t.id === data.therapistId)?.name ?? ''));
	let showDropdown  = $state(false);
	let comboboxInput: HTMLInputElement;

	const filteredTherapists = $derived(
		data.therapistList.filter(
			(t) =>
				t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.email.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function selectTherapist(t: TherapistOption) {
		searchQuery = t.name;
		showDropdown = false;
		const params = new URLSearchParams(page.url.searchParams);
		params.set('therapist', t.id);
		params.set('tab', activeTab);
		goto(`?${params.toString()}`, { replaceState: true });
	}

	function clearTherapist() {
		searchQuery = '';
		showDropdown = false;
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('therapist');
		params.set('tab', activeTab);
		goto(`?${params.toString()}`, { replaceState: true });
	}

	function onComboboxKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { showDropdown = false; comboboxInput.blur(); }
		if (e.key === 'Enter' && filteredTherapists.length === 1) selectTherapist(filteredTherapists[0]);
	}

	// ── Shared dialog state ───────────────────────────────────────────────────
	type DialogMode = 'create' | 'edit' | 'delete';

	// ── Clinic dialog ─────────────────────────────────────────────────────────
	let clinicDialog:  HTMLDialogElement;
	let clinicMode     = $state<DialogMode>('create');
	let clinicError    = $state('');
	let clinicId       = $state('');
	let clinicName     = $state('');
	let clinicCnpj     = $state('');
	let clinicTimezone = $state('America/Sao_Paulo');
	let clinicStreet   = $state('');
	let clinicNumber   = $state('');
	let clinicComp     = $state('');
	let clinicZip      = $state('');
	let clinicCity     = $state('');
	let clinicState    = $state('');
	let clinicHoursStart = $state(7);
	let clinicHoursEnd   = $state(21);

	function openCreateClinic() {
		clinicMode = 'create'; clinicError = '';
		clinicId = ''; clinicName = ''; clinicCnpj = ''; clinicTimezone = 'America/Sao_Paulo';
		clinicStreet = ''; clinicNumber = ''; clinicComp = ''; clinicZip = ''; clinicCity = ''; clinicState = '';
		clinicHoursStart = 7; clinicHoursEnd = 21;
		clinicDialog.showModal();
	}
	function openEditClinic(c: ClinicRow) {
		clinicMode = 'edit'; clinicError = '';
		clinicId = c.id; clinicName = c.name; clinicCnpj = c.cnpj ?? '';
		clinicTimezone = c.timezone; clinicStreet = c.address_street ?? '';
		clinicNumber = c.address_number ?? ''; clinicComp = c.address_complement ?? '';
		clinicZip = c.address_zip ?? ''; clinicCity = c.address_city ?? '';
		clinicState = c.address_state ?? '';
		clinicHoursStart = c.working_hours_start; clinicHoursEnd = c.working_hours_end;
		clinicDialog.showModal();
	}
	function openDeleteClinic(c: ClinicRow) {
		clinicMode = 'delete'; clinicError = '';
		clinicId = c.id; clinicName = c.name;
		clinicDialog.showModal();
	}

	// ── Therapist dialog ──────────────────────────────────────────────────────
	let therapistDialog: HTMLDialogElement;
	let therapistMode   = $state<DialogMode>('edit');
	let therapistError  = $state('');
	let therapistId     = $state('');
	let therapistName   = $state('');
	let therapistCrp    = $state('');
	let therapistCnpj   = $state('');
	let therapistPhone  = $state('');
	let therapistEmail  = $state('');
	let therapistAddr   = $state('');

	function openEditTherapist(t: TherapistRow) {
		therapistMode = 'edit'; therapistError = '';
		therapistId = t.id; therapistName = t.name; therapistCrp = t.crp;
		therapistCnpj = t.cnpj ?? ''; therapistPhone = t.phone ?? '';
		therapistEmail = t.email; therapistAddr = t.address ?? '';
		therapistDialog.showModal();
	}
	function openDeleteTherapist(t: TherapistRow) {
		therapistMode = 'delete'; therapistError = '';
		therapistId = t.id; therapistName = t.name;
		therapistDialog.showModal();
	}

	// ── Patient dialog ────────────────────────────────────────────────────────
	let patientDialog:        HTMLDialogElement;
	let patientMode           = $state<DialogMode>('create');
	let patientError          = $state('');
	let patientId             = $state('');
	let patientName           = $state('');
	let patientEmail          = $state('');
	let patientPhone          = $state('');
	let patientAddress        = $state('');
	let patientBirthDate      = $state('');
	let patientFee            = $state('');
	let patientSessions       = $state(4);
	let patientFrequency      = $state('weekly');
	let patientActive         = $state(true);

	function openCreatePatient() {
		patientMode = 'create'; patientError = '';
		patientId = ''; patientName = ''; patientEmail = ''; patientPhone = '';
		patientAddress = ''; patientBirthDate = ''; patientFee = '';
		patientSessions = 4; patientFrequency = 'weekly'; patientActive = true;
		patientDialog.showModal();
	}
	function openEditPatient(p: PatientRow) {
		patientMode = 'edit'; patientError = '';
		patientId = p.id; patientName = p.name; patientEmail = p.email ?? '';
		patientPhone = p.phone ?? ''; patientAddress = p.address ?? '';
		patientBirthDate = p.birth_date ?? ''; patientFee = p.session_fee?.toString() ?? '';
		patientSessions = p.sessions_per_month; patientFrequency = p.frequency ?? 'weekly';
		patientActive = p.active;
		patientDialog.showModal();
	}
	function openDeletePatient(p: PatientRow) {
		patientMode = 'delete'; patientError = '';
		patientId = p.id; patientName = p.name;
		patientDialog.showModal();
	}

	// ── Expense dialog ────────────────────────────────────────────────────────
	let expenseDialog:    HTMLDialogElement;
	let expenseMode       = $state<DialogMode>('create');
	let expenseError      = $state('');
	let expenseId         = $state('');
	let expenseDesc       = $state('');
	let expenseAmount     = $state('');
	let expenseFreq       = $state('monthly');
	let expenseMonth      = $state(0);
	let expenseDueDay     = $state('');
	let expenseDueDate    = $state('');
	let expenseActive     = $state(true);
	let expenseNotes      = $state('');
	let expenseColor      = $state('#6366f1');

	function openCreateExpense() {
		expenseMode = 'create'; expenseError = '';
		expenseId = ''; expenseDesc = ''; expenseAmount = ''; expenseFreq = 'monthly';
		expenseMonth = 0; expenseDueDay = ''; expenseDueDate = '';
		expenseActive = true; expenseNotes = ''; expenseColor = '#6366f1';
		expenseDialog.showModal();
	}
	function openEditExpense(e: ExpenseRow) {
		expenseMode = 'edit'; expenseError = '';
		expenseId = e.id; expenseDesc = e.description; expenseAmount = e.amount.toString();
		expenseFreq = e.frequency; expenseMonth = e.month ?? 0;
		expenseDueDay = e.due_day?.toString() ?? ''; expenseDueDate = e.due_date ?? '';
		expenseActive = e.is_active; expenseNotes = e.notes ?? '';
		expenseColor = e.color ?? '#6366f1';
		expenseDialog.showModal();
	}
	function openDeleteExpense(e: ExpenseRow) {
		expenseMode = 'delete'; expenseError = '';
		expenseId = e.id; expenseDesc = e.description;
		expenseDialog.showModal();
	}

	// ── Helpers ───────────────────────────────────────────────────────────────
	function fmtDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('pt-BR');
	}

	const FREQ_LABEL: Record<string, string> = {
		weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal',
		quarterly: 'Trimestral', semestral: 'Semestral', annual: 'Anual', one_time: 'Pontual'
	};

	const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

	const needsMonthField = $derived(['quarterly','semestral','annual'].includes(expenseFreq));
	const needsDueDateField = $derived(expenseFreq === 'one_time');
</script>

<!-- ── Combobox overlay close ──────────────────────────────────────────────── -->
{#if showDropdown}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-10" onclick={() => (showDropdown = false)}></div>
{/if}

<div class="space-y-6">
	<!-- Page header -->
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Dados</h1>
		<p class="mt-1 text-sm text-ink-muted">Gerenciamento de registros da plataforma.</p>
	</div>

	<!-- Therapist combobox -->
	<div class="relative z-20 max-w-sm">
		<label for="therapist-search" class="mb-1 block text-xs font-medium text-ink-muted">
			Terapeuta
		</label>
		<div class="relative">
			<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
				<MagnifyingGlass size={15} class="text-ink-muted/60" />
			</span>
			<input
				id="therapist-search"
				bind:this={comboboxInput}
				bind:value={searchQuery}
				type="text"
				autocomplete="off"
				placeholder="Selecione um terapeuta"
				class="input w-full pl-8 pr-8 text-sm"
				onfocus={() => (showDropdown = true)}
				oninput={() => (showDropdown = true)}
				onkeydown={onComboboxKeydown}
			/>
			{#if data.therapistId}
				<button
					type="button"
					onclick={clearTherapist}
					class="absolute inset-y-0 right-2 flex items-center px-1 text-ink-muted hover:text-ink"
					aria-label="Limpar seleção"
				>
					<X size={13} />
				</button>
			{/if}
		</div>

		{#if showDropdown && filteredTherapists.length > 0}
			<ul
				class="absolute mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-primary-100/60 bg-bg shadow-lg dark:border-white/10 dark:bg-bg-dark"
				role="listbox"
			>
				{#each filteredTherapists as t (t.id)}
					<li role="option" aria-selected={t.id === data.therapistId}>
						<button
							type="button"
							class="flex w-full flex-col px-4 py-2.5 text-left hover:bg-primary-50/60 dark:hover:bg-white/5
							       {t.id === data.therapistId ? 'bg-primary-50/40 dark:bg-primary-900/20' : ''}"
							onclick={() => selectTherapist(t)}
						>
							<span class="text-sm font-medium text-ink dark:text-bg">{t.name}</span>
							<span class="text-xs text-ink-muted">{t.email}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if showDropdown && filteredTherapists.length === 0 && searchQuery}
			<div class="absolute mt-1 w-full rounded-xl border border-primary-100/60 bg-bg px-4 py-3 shadow-lg dark:border-white/10 dark:bg-bg-dark">
				<p class="text-sm text-ink-muted">Nenhum terapeuta encontrado.</p>
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="border-b border-primary-100/40 dark:border-white/5">
		<nav class="-mb-px flex gap-1" aria-label="Abas">
			{#each TABS as tab}
				{@const Icon = tab.icon}
				<button
					type="button"
					onclick={() => switchTab(tab.id)}
					class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition
					       {activeTab === tab.id
					         ? 'border-primary text-primary'
					         : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-bg'}"
				>
					<Icon size={15} weight={activeTab === tab.id ? 'fill' : 'regular'} />
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	<!-- ── Tab: Clínicas ─────────────────────────────────────────────────────── -->
	{#if activeTab === 'clinicas'}
		{#if !data.therapistId}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<Buildings size={40} class="mb-3 text-ink-muted/40" weight="duotone" />
				<p class="text-sm text-ink-muted">Selecione um terapeuta para ver as clínicas.</p>
			</div>
		{:else}
			<div class="flex items-center justify-between">
				<p class="text-sm text-ink-muted">{data.clinics.length} clínica{data.clinics.length !== 1 ? 's' : ''}</p>
				<button type="button" onclick={openCreateClinic} class="btn-primary flex items-center gap-1.5 text-sm">
					<Plus size={15} weight="bold" /> Nova clínica
				</button>
			</div>

			{#if data.clinics.length === 0}
				<div class="surface flex flex-col items-center justify-center py-12 text-center">
					<p class="text-sm text-ink-muted">Nenhuma clínica encontrada.</p>
				</div>
			{:else}
				<div class="surface overflow-hidden p-0">
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead>
								<tr class="border-b border-primary-100/60 dark:border-white/5">
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">CNPJ</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Cidade/UF</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Fuso</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Criado em</th>
									<th class="px-4 py-3"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
								{#each data.clinics as c (c.id)}
									<tr class="hover:bg-primary-50/30 dark:hover:bg-white/[0.02]">
										<td class="px-5 py-3 font-medium text-ink dark:text-bg">{c.name}</td>
										<td class="px-5 py-3 text-ink-muted">{c.cnpj ?? '—'}</td>
										<td class="px-5 py-3 text-ink-muted">
											{#if c.address_city || c.address_state}
												{[c.address_city, c.address_state].filter(Boolean).join('/')}
											{:else}—{/if}
										</td>
										<td class="px-5 py-3 text-xs text-ink-muted">{c.timezone}</td>
										<td class="px-5 py-3 text-ink-muted">{fmtDate(c.created_at)}</td>
										<td class="px-4 py-3">
											<div class="flex items-center gap-1">
												<button type="button" onclick={() => openEditClinic(c)}
													class="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary dark:hover:bg-white/5"
													aria-label="Editar clínica">
													<Pencil size={14} />
												</button>
												<button type="button" onclick={() => openDeleteClinic(c)}
													class="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
													aria-label="Excluir clínica">
													<Trash size={14} />
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- ── Tab: Terapeutas ───────────────────────────────────────────────────── -->
	{#if activeTab === 'terapeutas'}
		<div class="flex items-center justify-between">
			<p class="text-sm text-ink-muted">{data.therapists.length} terapeuta{data.therapists.length !== 1 ? 's' : ''}</p>
		</div>

		{#if data.therapists.length === 0}
			<div class="surface flex flex-col items-center justify-center py-12 text-center">
				<p class="text-sm text-ink-muted">Nenhum terapeuta encontrado.</p>
			</div>
		{:else}
			<div class="surface overflow-hidden p-0">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="border-b border-primary-100/60 dark:border-white/5">
								<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</th>
								<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">E-mail</th>
								<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">CRP</th>
								<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">CNPJ</th>
								<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Telefone</th>
								<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Criado em</th>
								<th class="px-4 py-3"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
							{#each data.therapists as t (t.id)}
								<tr class="hover:bg-primary-50/30 dark:hover:bg-white/[0.02]">
									<td class="px-5 py-3 font-medium text-ink dark:text-bg">{t.name}</td>
									<td class="px-5 py-3 text-ink-muted">{t.email}</td>
									<td class="px-5 py-3 text-ink-muted">{t.crp}</td>
									<td class="px-5 py-3 text-ink-muted">{t.cnpj ?? '—'}</td>
									<td class="px-5 py-3 text-ink-muted">{t.phone ?? '—'}</td>
									<td class="px-5 py-3 text-ink-muted">{fmtDate(t.created_at)}</td>
									<td class="px-4 py-3">
										<div class="flex items-center gap-1">
											<button type="button" onclick={() => openEditTherapist(t)}
												class="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary dark:hover:bg-white/5"
												aria-label="Editar terapeuta">
												<Pencil size={14} />
											</button>
											<button type="button" onclick={() => openDeleteTherapist(t)}
												class="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
												aria-label="Excluir terapeuta">
												<Trash size={14} />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}

	<!-- ── Tab: Pacientes ────────────────────────────────────────────────────── -->
	{#if activeTab === 'pacientes'}
		{#if !data.therapistId}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<Heartbeat size={40} class="mb-3 text-ink-muted/40" weight="duotone" />
				<p class="text-sm text-ink-muted">Selecione um terapeuta para ver os pacientes.</p>
			</div>
		{:else}
			<div class="flex items-center justify-between">
				<p class="text-sm text-ink-muted">{data.patients.length} paciente{data.patients.length !== 1 ? 's' : ''}</p>
				<button type="button" onclick={openCreatePatient} class="btn-primary flex items-center gap-1.5 text-sm">
					<Plus size={15} weight="bold" /> Novo paciente
				</button>
			</div>

			{#if data.patients.length === 0}
				<div class="surface flex flex-col items-center justify-center py-12 text-center">
					<p class="text-sm text-ink-muted">Nenhum paciente encontrado.</p>
				</div>
			{:else}
				<div class="surface overflow-hidden p-0">
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead>
								<tr class="border-b border-primary-100/60 dark:border-white/5">
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">E-mail</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Telefone</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nascimento</th>
									<th class="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor sessão</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Status</th>
									<th class="px-4 py-3"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
								{#each data.patients as p (p.id)}
									<tr class="hover:bg-primary-50/30 dark:hover:bg-white/[0.02]">
										<td class="px-5 py-3 font-medium text-ink dark:text-bg">{p.name}</td>
										<td class="px-5 py-3 text-ink-muted">{p.email ?? '—'}</td>
										<td class="px-5 py-3 text-ink-muted">{p.phone ?? '—'}</td>
										<td class="px-5 py-3 text-ink-muted">{fmtDate(p.birth_date)}</td>
										<td class="px-5 py-3 text-right tabular-nums font-medium">
											{p.session_fee != null ? formatBRL(p.session_fee) : '—'}
										</td>
										<td class="px-5 py-3">
											<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
											             {p.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-white/10'}">
												{p.active ? 'Ativo' : 'Inativo'}
											</span>
										</td>
										<td class="px-4 py-3">
											<div class="flex items-center gap-1">
												<button type="button" onclick={() => openEditPatient(p)}
													class="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary dark:hover:bg-white/5"
													aria-label="Editar paciente">
													<Pencil size={14} />
												</button>
												<button type="button" onclick={() => openDeletePatient(p)}
													class="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
													aria-label="Excluir paciente">
													<Trash size={14} />
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- ── Tab: Despesas ─────────────────────────────────────────────────────── -->
	{#if activeTab === 'despesas'}
		{#if !data.therapistId}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<CurrencyDollar size={40} class="mb-3 text-ink-muted/40" weight="duotone" />
				<p class="text-sm text-ink-muted">Selecione um terapeuta para ver as despesas.</p>
			</div>
		{:else}
			<div class="flex items-center justify-between">
				<p class="text-sm text-ink-muted">{data.expenses.length} despesa{data.expenses.length !== 1 ? 's' : ''}</p>
				<button type="button" onclick={openCreateExpense} class="btn-primary flex items-center gap-1.5 text-sm">
					<Plus size={15} weight="bold" /> Nova despesa
				</button>
			</div>

			{#if data.expenses.length === 0}
				<div class="surface flex flex-col items-center justify-center py-12 text-center">
					<p class="text-sm text-ink-muted">Nenhuma despesa encontrada.</p>
				</div>
			{:else}
				<div class="surface overflow-hidden p-0">
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead>
								<tr class="border-b border-primary-100/60 dark:border-white/5">
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Descrição</th>
									<th class="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Frequência</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Vencimento</th>
									<th class="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Status</th>
									<th class="px-4 py-3"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
								{#each data.expenses as e (e.id)}
									<tr class="hover:bg-primary-50/30 dark:hover:bg-white/[0.02]">
										<td class="px-5 py-3">
											<div class="flex items-center gap-2">
												{#if e.color}
													<span class="h-3 w-3 shrink-0 rounded-full" style="background-color:{e.color}"></span>
												{/if}
												<span class="font-medium text-ink dark:text-bg">{e.description}</span>
											</div>
										</td>
										<td class="px-5 py-3 text-right tabular-nums font-medium">{formatBRL(e.amount)}</td>
										<td class="px-5 py-3 text-ink-muted">
											{FREQ_LABEL[e.frequency] ?? e.frequency}
											{#if e.month > 0}<span class="ml-1 text-xs">({MONTH_NAMES[e.month - 1]})</span>{/if}
										</td>
										<td class="px-5 py-3 text-ink-muted">
											{#if e.due_date}{fmtDate(e.due_date)}
											{:else if e.due_day}dia {e.due_day}
											{:else}—{/if}
										</td>
										<td class="px-5 py-3">
											<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
											             {e.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-white/10'}">
												{e.is_active ? 'Ativa' : 'Inativa'}
											</span>
										</td>
										<td class="px-4 py-3">
											<div class="flex items-center gap-1">
												<button type="button" onclick={() => openEditExpense(e)}
													class="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary dark:hover:bg-white/5"
													aria-label="Editar despesa">
													<Pencil size={14} />
												</button>
												<button type="button" onclick={() => openDeleteExpense(e)}
													class="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
													aria-label="Excluir despesa">
													<Trash size={14} />
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Dialog: Clínica
     ══════════════════════════════════════════════════════════════════════════ -->
<dialog
	bind:this={clinicDialog}
	class="rounded-2xl border border-primary-100/60 bg-bg p-6 shadow-xl dark:border-white/10 dark:bg-bg-dark
	       backdrop:bg-black/40 backdrop:backdrop-blur-sm w-full max-w-lg"
>
	{#if clinicMode === 'delete'}
		<div class="flex items-start gap-3">
			<span class="mt-0.5 rounded-xl bg-red-100 p-2 dark:bg-red-900/30">
				<Warning size={20} class="text-red-600 dark:text-red-400" weight="fill" />
			</span>
			<div>
				<h2 class="font-semibold text-ink dark:text-bg">Excluir clínica?</h2>
				<p class="mt-1 text-sm text-ink-muted">
					A clínica <strong>{clinicName}</strong> e todos os seus dados serão removidos permanentemente.
				</p>
			</div>
		</div>
		{#if clinicError}<p class="mt-3 text-sm text-red-600">{clinicError}</p>{/if}
		<div class="mt-5 flex justify-end gap-2">
			<button type="button" onclick={() => clinicDialog.close()}
				class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
				Cancelar
			</button>
			<form method="POST" action="?/deleteClinic" use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { clinicDialog.close(); }
				else { clinicError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao excluir'; }
			}}>
				<input type="hidden" name="id" value={clinicId} />
				<button type="submit" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
					Excluir
				</button>
			</form>
		</div>
	{:else}
		<h2 class="mb-5 font-semibold text-ink dark:text-bg">
			{clinicMode === 'create' ? 'Nova clínica' : 'Editar clínica'}
		</h2>
		<form method="POST" action={clinicMode === 'create' ? '?/createClinic' : '?/updateClinic'}
			use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { clinicDialog.close(); clinicError = ''; }
				else { clinicError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao salvar'; }
			}}
			class="space-y-4"
		>
			{#if clinicMode === 'edit'}<input type="hidden" name="id" value={clinicId} />{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label class="label" for="clinic-name">Nome *</label>
					<input id="clinic-name" name="name" bind:value={clinicName} required class="input w-full" />
				</div>
				<div>
					<label class="label" for="clinic-cnpj">CNPJ</label>
					<input id="clinic-cnpj" name="cnpj" bind:value={clinicCnpj} class="input w-full" placeholder="00.000.000/0001-00" />
				</div>
				<div>
					<label class="label" for="clinic-timezone">Fuso horário</label>
					<select id="clinic-timezone" name="timezone" bind:value={clinicTimezone} class="input w-full">
						{#each data.meta.timezones as tz}
							<option value={tz}>{tz}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="label" for="clinic-street">Logradouro</label>
					<input id="clinic-street" name="address_street" bind:value={clinicStreet} class="input w-full" />
				</div>
				<div>
					<label class="label" for="clinic-number">Número</label>
					<input id="clinic-number" name="address_number" bind:value={clinicNumber} class="input w-full" />
				</div>
				<div>
					<label class="label" for="clinic-comp">Complemento</label>
					<input id="clinic-comp" name="address_complement" bind:value={clinicComp} class="input w-full" />
				</div>
				<div>
					<label class="label" for="clinic-zip">CEP</label>
					<input id="clinic-zip" name="address_zip" bind:value={clinicZip} class="input w-full" placeholder="00000-000" />
				</div>
				<div>
					<label class="label" for="clinic-city">Cidade</label>
					<input id="clinic-city" name="address_city" bind:value={clinicCity} class="input w-full" />
				</div>
				<div>
					<label class="label" for="clinic-state">UF</label>
					<select id="clinic-state" name="address_state" bind:value={clinicState} class="input w-full">
						<option value="">—</option>
						{#each data.meta.brStates as uf}
							<option value={uf}>{uf}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="label" for="clinic-h-start">Horário início</label>
					<input id="clinic-h-start" name="working_hours_start" type="number" min="0" max="23"
						bind:value={clinicHoursStart} class="input w-full" />
				</div>
				<div>
					<label class="label" for="clinic-h-end">Horário fim</label>
					<input id="clinic-h-end" name="working_hours_end" type="number" min="1" max="24"
						bind:value={clinicHoursEnd} class="input w-full" />
				</div>
			</div>

			{#if clinicError}<p class="text-sm text-red-600">{clinicError}</p>{/if}
			<div class="flex justify-end gap-2 pt-2">
				<button type="button" onclick={() => clinicDialog.close()}
					class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
					Cancelar
				</button>
				<button type="submit" class="btn-primary text-sm">Salvar</button>
			</div>
		</form>
	{/if}
</dialog>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Dialog: Terapeuta
     ══════════════════════════════════════════════════════════════════════════ -->
<dialog
	bind:this={therapistDialog}
	class="rounded-2xl border border-primary-100/60 bg-bg p-6 shadow-xl dark:border-white/10 dark:bg-bg-dark
	       backdrop:bg-black/40 backdrop:backdrop-blur-sm w-full max-w-lg"
>
	{#if therapistMode === 'delete'}
		<div class="flex items-start gap-3">
			<span class="mt-0.5 rounded-xl bg-red-100 p-2 dark:bg-red-900/30">
				<Warning size={20} class="text-red-600 dark:text-red-400" weight="fill" />
			</span>
			<div>
				<h2 class="font-semibold text-ink dark:text-bg">Excluir terapeuta?</h2>
				<p class="mt-1 text-sm text-ink-muted">
					O terapeuta <strong>{therapistName}</strong> será removido permanentemente.
				</p>
			</div>
		</div>
		{#if therapistError}<p class="mt-3 text-sm text-red-600">{therapistError}</p>{/if}
		<div class="mt-5 flex justify-end gap-2">
			<button type="button" onclick={() => therapistDialog.close()}
				class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
				Cancelar
			</button>
			<form method="POST" action="?/deleteTherapist" use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { therapistDialog.close(); }
				else { therapistError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao excluir'; }
			}}>
				<input type="hidden" name="id" value={therapistId} />
				<button type="submit" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
					Excluir
				</button>
			</form>
		</div>
	{:else}
		<h2 class="mb-5 font-semibold text-ink dark:text-bg">Editar terapeuta</h2>
		<form method="POST" action="?/updateTherapist"
			use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { therapistDialog.close(); therapistError = ''; }
				else { therapistError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao salvar'; }
			}}
			class="space-y-4"
		>
			<input type="hidden" name="id" value={therapistId} />
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label class="label" for="th-name">Nome *</label>
					<input id="th-name" name="name" bind:value={therapistName} required class="input w-full" />
				</div>
				<div>
					<label class="label" for="th-email">E-mail *</label>
					<input id="th-email" name="email" type="email" bind:value={therapistEmail} required class="input w-full" />
				</div>
				<div>
					<label class="label" for="th-crp">CRP *</label>
					<input id="th-crp" name="crp" bind:value={therapistCrp} required class="input w-full" />
				</div>
				<div>
					<label class="label" for="th-cnpj">CNPJ</label>
					<input id="th-cnpj" name="cnpj" bind:value={therapistCnpj} class="input w-full" />
				</div>
				<div>
					<label class="label" for="th-phone">Telefone</label>
					<input id="th-phone" name="phone" bind:value={therapistPhone} class="input w-full" />
				</div>
				<div class="sm:col-span-2">
					<label class="label" for="th-addr">Endereço</label>
					<input id="th-addr" name="address" bind:value={therapistAddr} class="input w-full" />
				</div>
			</div>
			{#if therapistError}<p class="text-sm text-red-600">{therapistError}</p>{/if}
			<div class="flex justify-end gap-2 pt-2">
				<button type="button" onclick={() => therapistDialog.close()}
					class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
					Cancelar
				</button>
				<button type="submit" class="btn-primary text-sm">Salvar</button>
			</div>
		</form>
	{/if}
</dialog>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Dialog: Paciente
     ══════════════════════════════════════════════════════════════════════════ -->
<dialog
	bind:this={patientDialog}
	class="rounded-2xl border border-primary-100/60 bg-bg p-6 shadow-xl dark:border-white/10 dark:bg-bg-dark
	       backdrop:bg-black/40 backdrop:backdrop-blur-sm w-full max-w-lg"
>
	{#if patientMode === 'delete'}
		<div class="flex items-start gap-3">
			<span class="mt-0.5 rounded-xl bg-red-100 p-2 dark:bg-red-900/30">
				<Warning size={20} class="text-red-600 dark:text-red-400" weight="fill" />
			</span>
			<div>
				<h2 class="font-semibold text-ink dark:text-bg">Excluir paciente?</h2>
				<p class="mt-1 text-sm text-ink-muted">
					O paciente <strong>{patientName}</strong> será removido permanentemente.
				</p>
			</div>
		</div>
		{#if patientError}<p class="mt-3 text-sm text-red-600">{patientError}</p>{/if}
		<div class="mt-5 flex justify-end gap-2">
			<button type="button" onclick={() => patientDialog.close()}
				class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
				Cancelar
			</button>
			<form method="POST" action="?/deletePatient" use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { patientDialog.close(); }
				else { patientError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao excluir'; }
			}}>
				<input type="hidden" name="id" value={patientId} />
				<button type="submit" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
					Excluir
				</button>
			</form>
		</div>
	{:else}
		<h2 class="mb-5 font-semibold text-ink dark:text-bg">
			{patientMode === 'create' ? 'Novo paciente' : 'Editar paciente'}
		</h2>
		<form method="POST" action={patientMode === 'create' ? '?/createPatient' : '?/updatePatient'}
			use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { patientDialog.close(); patientError = ''; }
				else { patientError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao salvar'; }
			}}
			class="space-y-4"
		>
			{#if patientMode === 'edit'}<input type="hidden" name="id" value={patientId} />{/if}
			{#if patientMode === 'create'}<input type="hidden" name="therapist_id" value={data.therapistId} />{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label class="label" for="pat-name">Nome *</label>
					<input id="pat-name" name="name" bind:value={patientName} required class="input w-full" />
				</div>
				<div>
					<label class="label" for="pat-email">E-mail</label>
					<input id="pat-email" name="email" type="email" bind:value={patientEmail} class="input w-full" />
				</div>
				<div>
					<label class="label" for="pat-phone">Telefone</label>
					<input id="pat-phone" name="phone" bind:value={patientPhone} class="input w-full" />
				</div>
				<div>
					<label class="label" for="pat-birth">Nascimento</label>
					<input id="pat-birth" name="birth_date" type="date" bind:value={patientBirthDate} class="input w-full" />
				</div>
				<div>
					<label class="label" for="pat-fee">Valor sessão (R$)</label>
					<input id="pat-fee" name="session_fee" type="number" step="0.01" min="0" bind:value={patientFee} class="input w-full" />
				</div>
				<div>
					<label class="label" for="pat-sessions">Sessões/mês</label>
					<input id="pat-sessions" name="sessions_per_month" type="number" min="1" bind:value={patientSessions} class="input w-full" />
				</div>
				<div>
					<label class="label" for="pat-freq">Frequência</label>
					<select id="pat-freq" name="frequency" bind:value={patientFrequency} class="input w-full">
						{#each data.meta.patientFrequencies as f}
							<option value={f.value}>{f.label}</option>
						{/each}
					</select>
				</div>
				<div class="sm:col-span-2">
					<label class="label" for="pat-addr">Endereço</label>
					<input id="pat-addr" name="address" bind:value={patientAddress} class="input w-full" />
				</div>
				<div class="sm:col-span-2 flex items-center gap-2">
					<input id="pat-active" name="active" type="checkbox" bind:checked={patientActive}
						class="h-4 w-4 rounded border-primary-200 text-primary focus:ring-primary"
						onchange={(e) => (patientActive = (e.currentTarget as HTMLInputElement).checked)}
					/>
					<input type="hidden" name="active" value={String(patientActive)} />
					<label for="pat-active" class="text-sm text-ink dark:text-bg">Paciente ativo</label>
				</div>
			</div>
			{#if patientError}<p class="text-sm text-red-600">{patientError}</p>{/if}
			<div class="flex justify-end gap-2 pt-2">
				<button type="button" onclick={() => patientDialog.close()}
					class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
					Cancelar
				</button>
				<button type="submit" class="btn-primary text-sm">Salvar</button>
			</div>
		</form>
	{/if}
</dialog>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Dialog: Despesa
     ══════════════════════════════════════════════════════════════════════════ -->
<dialog
	bind:this={expenseDialog}
	class="rounded-2xl border border-primary-100/60 bg-bg p-6 shadow-xl dark:border-white/10 dark:bg-bg-dark
	       backdrop:bg-black/40 backdrop:backdrop-blur-sm w-full max-w-lg"
>
	{#if expenseMode === 'delete'}
		<div class="flex items-start gap-3">
			<span class="mt-0.5 rounded-xl bg-red-100 p-2 dark:bg-red-900/30">
				<Warning size={20} class="text-red-600 dark:text-red-400" weight="fill" />
			</span>
			<div>
				<h2 class="font-semibold text-ink dark:text-bg">Excluir despesa?</h2>
				<p class="mt-1 text-sm text-ink-muted">
					A despesa <strong>{expenseDesc}</strong> será removida permanentemente.
				</p>
			</div>
		</div>
		{#if expenseError}<p class="mt-3 text-sm text-red-600">{expenseError}</p>{/if}
		<div class="mt-5 flex justify-end gap-2">
			<button type="button" onclick={() => expenseDialog.close()}
				class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
				Cancelar
			</button>
			<form method="POST" action="?/deleteExpense" use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { expenseDialog.close(); }
				else { expenseError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao excluir'; }
			}}>
				<input type="hidden" name="id" value={expenseId} />
				<button type="submit" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
					Excluir
				</button>
			</form>
		</div>
	{:else}
		<h2 class="mb-5 font-semibold text-ink dark:text-bg">
			{expenseMode === 'create' ? 'Nova despesa' : 'Editar despesa'}
		</h2>
		<form method="POST" action={expenseMode === 'create' ? '?/createExpense' : '?/updateExpense'}
			use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') { expenseDialog.close(); expenseError = ''; }
				else { expenseError = (result as { data?: { error?: string } }).data?.error ?? 'Erro ao salvar'; }
			}}
			class="space-y-4"
		>
			{#if expenseMode === 'edit'}<input type="hidden" name="id" value={expenseId} />{/if}
			{#if expenseMode === 'create'}
				<input type="hidden" name="clinic_id"
					value={data.therapistList.find((t) => t.id === data.therapistId)?.clinic_id ?? ''} />
			{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label class="label" for="exp-desc">Descrição *</label>
					<input id="exp-desc" name="description" bind:value={expenseDesc} required class="input w-full" />
				</div>
				<div>
					<label class="label" for="exp-amount">Valor (R$) *</label>
					<input id="exp-amount" name="amount" type="number" step="0.01" min="0"
						bind:value={expenseAmount} required class="input w-full" />
				</div>
				<div>
					<label class="label" for="exp-freq">Frequência</label>
					<select id="exp-freq" name="frequency" bind:value={expenseFreq} class="input w-full">
						{#each data.meta.expenseFrequencies as f}
							<option value={f.value}>{f.label}</option>
						{/each}
					</select>
				</div>

				{#if needsMonthField}
					<div>
						<label class="label" for="exp-month">Mês de referência</label>
						<select id="exp-month" name="month" bind:value={expenseMonth} class="input w-full">
							<option value={0}>Todos</option>
							{#each MONTH_NAMES as m, i}
								<option value={i + 1}>{m}</option>
							{/each}
						</select>
					</div>
				{:else}
					<input type="hidden" name="month" value="0" />
				{/if}

				{#if needsDueDateField}
					<div>
						<label class="label" for="exp-due-date">Data de vencimento</label>
						<input id="exp-due-date" name="due_date" type="date" bind:value={expenseDueDate} class="input w-full" />
					</div>
				{:else}
					<div>
						<label class="label" for="exp-due-day">Dia de vencimento</label>
						<input id="exp-due-day" name="due_day" type="number" min="1" max="28"
							bind:value={expenseDueDay} class="input w-full" placeholder="1–28" />
					</div>
				{/if}

				<div>
					<label class="label" for="exp-color">Cor</label>
					<div class="flex items-center gap-2">
						<input id="exp-color" name="color" type="color" bind:value={expenseColor}
							class="h-9 w-12 cursor-pointer rounded-lg border border-primary-100/60 bg-bg p-0.5 dark:border-white/10 dark:bg-bg-dark" />
						<span class="font-mono text-xs text-ink-muted">{expenseColor}</span>
					</div>
				</div>

				<div class="flex items-center gap-2 self-end pb-1">
					<input id="exp-active" type="checkbox" bind:checked={expenseActive}
						class="h-4 w-4 rounded border-primary-200 text-primary focus:ring-primary"
						onchange={(e) => (expenseActive = (e.currentTarget as HTMLInputElement).checked)}
					/>
					<input type="hidden" name="is_active" value={String(expenseActive)} />
					<label for="exp-active" class="text-sm text-ink dark:text-bg">Despesa ativa</label>
				</div>

				<div class="sm:col-span-2">
					<label class="label" for="exp-notes">Notas</label>
					<textarea id="exp-notes" name="notes" bind:value={expenseNotes}
						rows="2" class="input w-full resize-none"></textarea>
				</div>
			</div>

			{#if expenseError}<p class="text-sm text-red-600">{expenseError}</p>{/if}
			<div class="flex justify-end gap-2 pt-2">
				<button type="button" onclick={() => expenseDialog.close()}
					class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5">
					Cancelar
				</button>
				<button type="submit" class="btn-primary text-sm">Salvar</button>
			</div>
		</form>
	{/if}
</dialog>
