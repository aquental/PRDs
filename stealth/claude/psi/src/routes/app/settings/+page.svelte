<script lang="ts">
	import { untrack } from 'svelte';
	import Card from '$lib/ui/Card.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import { PencilSimple, Warning, CircleNotch, Plus, Trash, WarningCircle, CalendarBlank, CurrencyDollar } from 'phosphor-svelte';
	import { PUBLIC_CEP_API_URL } from '$env/static/public';

	interface Clinic {
		name: string;
		timezone: string;
		cnpj?: string | null;
		address_street?: string | null;
		address_complement?: string | null;
		address_zip?: string | null;
		address_city?: string | null;
		address_state?: string | null;
		working_hours_start?: number | null;
		working_hours_end?: number | null;
	}
	interface Therapist {
		name: string;
		email: string;
		crp: string;
		phone?: string | null;
		default_session_fee?: number | null;
	}
	interface Expense {
		id: string;
		description: string;
		amount: number;
		frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time' | 'weekly' | 'biweekly' | 'semestral';
		due_day?: number | null;
		due_date?: string | null;
		is_active: boolean;
		notes?: string | null;
		color?: string | null;
		month?: number | null;
	}
	interface Props {
		data: { therapist: Therapist; clinic: Clinic; expenses: Expense[]; cepEnabled: boolean };
		form: { error?: unknown; success?: string } | null;
	}
	let { data, form }: Props = $props();

	function formatFormError(err: unknown): string {
		if (typeof err === 'string') return err;
		if (err && typeof err === 'object') {
			const entries = Object.entries(err as Record<string, string[]>);
			if (entries.length > 0)
				return entries.map(([f, msgs]) => `${f}: ${msgs.join(', ')}`).join(' · ');
		}
		return 'Erro inesperado. Tente novamente.';
	}

	// ── Tabs ──────────────────────────────────────────────
	let activeTab = $state<'perfil' | 'despesas'>('perfil');

	// ── Perfil / Clínica ──────────────────────────────────
	let editingTherapist = $state(false);
	let editingClinic = $state(false);

	let tName = $state(untrack(() => data.therapist.name));
	let tEmail = $state(untrack(() => data.therapist.email));
	let tCrp = $state(untrack(() => data.therapist.crp));
	let tPhone = $state(untrack(() => data.therapist.phone ?? ''));
	let tFee = $state(untrack(() => data.therapist.default_session_fee?.toString() ?? '250'));

	let cName = $state(untrack(() => data.clinic.name));
	let cTimezone = $state(untrack(() => data.clinic.timezone));
	let cCnpj = $state(untrack(() => data.clinic.cnpj ?? ''));
	let cStreet = $state(untrack(() => data.clinic.address_street ?? ''));
	let cNumber = $state(
		untrack(() => (data.clinic as { address_number?: string | null }).address_number ?? '')
	);
	let cComplement = $state(untrack(() => data.clinic.address_complement ?? ''));
	let cZip = $state(untrack(() => data.clinic.address_zip ?? ''));
	let cCity = $state(untrack(() => data.clinic.address_city ?? ''));
	let cState = $state(untrack(() => data.clinic.address_state ?? ''));
	let cHoursStart = $state(untrack(() => String(data.clinic.working_hours_start ?? 7)));
	let cHoursEnd = $state(untrack(() => String(data.clinic.working_hours_end ?? 21)));

	const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

	function formatCnpj(v: string) {
		const d = v.replace(/\D/g, '').slice(0, 14);
		return d
			.replace(/^(\d{2})(\d)/, '$1.$2')
			.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
			.replace(/\.(\d{3})(\d)/, '.$1/$2')
			.replace(/(\d{4})(\d)/, '$1-$2');
	}

	function formatZip(v: string) {
		const d = v.replace(/\D/g, '').slice(0, 8);
		return d.replace(/(\d{5})(\d)/, '$1-$2');
	}

	let zipLoading = $state(false);
	const zipDigits = $derived(cZip.replace(/\D/g, ''));
	const zipInvalid = $derived(zipDigits.length > 0 && zipDigits.length < 8);

	async function onZipInput(e: Event) {
		cZip = formatZip((e.target as HTMLInputElement).value);
		const digits = cZip.replace(/\D/g, '');
		if (digits.length !== 8) return;
		zipLoading = true;
		try {
			const res = await fetch(`${PUBLIC_CEP_API_URL}/${digits}/json/`);
			const json = await res.json();
			if (!json.erro) {
				cStreet = json.logradouro ?? cStreet;
				cCity = json.localidade ?? cCity;
				cState = json.uf ?? cState;
			}
		} catch {
			// silencia erro de rede
		} finally {
			zipLoading = false;
		}
	}

	// ── Despesas ──────────────────────────────────────────
	const EXPENSE_COLORS = [
		{ hex: '#FFADAD', label: 'Vermelho' },
		{ hex: '#FFD6A5', label: 'Laranja' },
		{ hex: '#FDFFB6', label: 'Amarelo' },
		{ hex: '#CAFFBF', label: 'Verde' },
		{ hex: '#9BF6FF', label: 'Ciano' },
		{ hex: '#A0C4FF', label: 'Azul' },
		{ hex: '#BDB2FF', label: 'Índigo' },
		{ hex: '#FFC6FF', label: 'Violeta' },
	];
	const DEFAULT_COLOR = '#A0C4FF';

	const MONTH_OPTIONS = [
		{ value: 1,  label: 'Janeiro'   },
		{ value: 2,  label: 'Fevereiro' },
		{ value: 3,  label: 'Março'     },
		{ value: 4,  label: 'Abril'     },
		{ value: 5,  label: 'Maio'      },
		{ value: 6,  label: 'Junho'     },
		{ value: 7,  label: 'Julho'     },
		{ value: 8,  label: 'Agosto'    },
		{ value: 9,  label: 'Setembro'  },
		{ value: 10, label: 'Outubro'   },
		{ value: 11, label: 'Novembro'  },
		{ value: 12, label: 'Dezembro'  },
	];

	const FREQ_LABEL: Record<string, string> = {
		monthly: 'Mensal',
		quarterly: 'Trimestral',
		semestral: 'Semestral',
		annual: 'Anual',
		one_time: 'Avulsa',
		weekly: 'Semanal',
		biweekly: 'Quinzenal'
	};
	const FREQ_CLASS: Record<string, string> = {
		monthly: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
		quarterly: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
		semestral: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
		annual: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
		one_time: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
		weekly: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
		biweekly: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
	};

	function formatBRL(v: number) {
		return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	}

	function formatDue(expense: Expense): string {
		if (expense.frequency === 'one_time' && expense.due_date) {
			return new Date(expense.due_date + 'T00:00:00').toLocaleDateString('pt-BR');
		}
		if (expense.frequency === 'weekly') return 'Toda semana';
		if (expense.frequency === 'biweekly') {
			if (expense.due_day) return `Dias ${expense.due_day} e ${expense.due_day + 14}`;
			return 'Quinzenal';
		}
		const monthLabel = expense.month && expense.month > 0
			? MONTH_OPTIONS.find((m) => m.value === expense.month)?.label
			: null;
		const dayStr = expense.due_day ? `Dia ${expense.due_day}` : null;
		if (monthLabel && dayStr) return `${dayStr} · ${monthLabel}`;
		if (monthLabel) return monthLabel;
		if (dayStr) return dayStr;
		return '—';
	}

	interface ExpenseForm {
		id: string;
		description: string;
		amount: string;
		frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time' | 'weekly' | 'biweekly' | 'semestral';
		due_day: string;
		due_date: string;
		notes: string;
		is_active: boolean;
		color: string;
		month: string;
	}

	const MONTH_FREQS = ['annual', 'semestral', 'quarterly'] as const;
	const needsMonth = (f: string) => (MONTH_FREQS as readonly string[]).includes(f);

	let showExpenseForm = $state(false);
	let exp = $state<ExpenseForm>({
		id: '',
		description: '',
		amount: '',
		frequency: 'monthly',
		due_day: '',
		due_date: '',
		notes: '',
		is_active: true,
		color: DEFAULT_COLOR,
		month: '0'
	});

	function startNew() {
		exp = { id: '', description: '', amount: '', frequency: 'monthly', due_day: '', due_date: '', notes: '', is_active: true, color: DEFAULT_COLOR, month: '0' };
		showExpenseForm = true;
	}

	function startEdit(expense: Expense) {
		exp = {
			id: expense.id,
			description: expense.description,
			amount: String(expense.amount),
			frequency: expense.frequency,
			due_day: String(expense.due_day ?? ''),
			due_date: expense.due_date ?? '',
			notes: expense.notes ?? '',
			is_active: expense.is_active,
			color: expense.color ?? DEFAULT_COLOR,
			month: String(expense.month ?? 0)
		};
		showExpenseForm = true;
	}

	function cancelExpense() {
		showExpenseForm = false;
	}

	// ── Expense sort ──────────────────────────────────────
	type SortMode = 'date_value' | 'value';
	let sortMode = $state<SortMode>('date_value');

	function getDueSortKey(e: Expense): number {
		if (e.frequency === 'weekly') return 0;
		if (e.frequency === 'one_time' && e.due_date)
			return new Date(e.due_date + 'T00:00:00').getDate();
		return e.due_day ?? 99;
	}

	const sortedExpenses = $derived.by(() => {
		const list = [...data.expenses];
		if (sortMode === 'date_value') {
			list.sort((a, b) => {
				const dk = getDueSortKey(a) - getDueSortKey(b);
				return dk !== 0 ? dk : a.amount - b.amount;
			});
		} else {
			list.sort((a, b) => a.amount - b.amount);
		}
		return list;
	});

	// ── Expense weekly charts ─────────────────────────────
	const MONTH_NAMES_PT = [
		'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
		'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
	];

	interface WeekSegment { description: string; color: string; amount: number; }
	interface WeekBucket { label: string; segments: WeekSegment[]; total: number; }

	function getWeeksOfMonth(year: number, month: number): Array<{ label: string; start: Date; end: Date }> {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const dow = firstDay.getDay();
		const startMon = new Date(firstDay);
		startMon.setDate(firstDay.getDate() - (dow === 0 ? 6 : dow - 1));
		const weeks: Array<{ label: string; start: Date; end: Date }> = [];
		let mon = new Date(startMon);
		while (mon <= lastDay) {
			const fri = new Date(mon);
			fri.setDate(mon.getDate() + 4);
			if (fri >= firstDay) {
				weeks.push({
					label: `${String(mon.getDate()).padStart(2,'0')}-${String(fri.getDate()).padStart(2,'0')}/${MONTH_NAMES_PT[month]}`,
					start: new Date(mon),
					end: new Date(fri)
				});
			}
			mon = new Date(mon);
			mon.setDate(mon.getDate() + 7);
		}
		return weeks;
	}

	// Occurrence formula: base_date + vez × delta_days, for vez = 0 … times-1
	const FREQ_DEF: Record<string, { times: number; delta: number }> = {
		weekly:    { times: 4, delta: 7   },
		biweekly:  { times: 2, delta: 14  },
		monthly:   { times: 1, delta: 30  },
		quarterly: { times: 4, delta: 90  },
		semestral: { times: 2, delta: 180 },
		annual:    { times: 1, delta: 365 },
	};

	function computeWeeklyTotals(expenses: Expense[], year: number, month: number): WeekBucket[] {
		const weeks = getWeeksOfMonth(year, month);
		const buckets: WeekBucket[] = weeks.map(w => ({ label: w.label, segments: [], total: 0 }));

		const addTo = (i: number, seg: WeekSegment) => {
			buckets[i].segments.push(seg);
			buckets[i].total += seg.amount;
		};

		// Try to fit a date into whichever week it belongs to.
		const placeDate = (d: Date, seg: WeekSegment) => {
			for (let i = 0; i < weeks.length; i++) {
				if (d >= weeks[i].start && d <= weeks[i].end) { addTo(i, { ...seg }); break; }
			}
		};

		for (const expense of expenses) {
			if (!expense.is_active) continue;
			const seg: WeekSegment = {
				description: expense.description,
				color: expense.color || DEFAULT_COLOR,
				amount: expense.amount
			};

			if (expense.frequency === 'one_time') {
				if (!expense.due_date) continue;
				placeDate(new Date(expense.due_date + 'T00:00:00'), seg);
				continue;
			}

			const def = FREQ_DEF[expense.frequency];
			if (!def) continue;

			// quarterly / semestral / annual have expense.month > 0 as their cycle anchor.
			// weekly / biweekly / monthly have expense.month = 0, so use the target month.
			const cycleMonth0 = expense.month && expense.month > 0 ? expense.month - 1 : month;
			const baseDay = expense.due_day ?? 1;

			// Generate from both the current year and the previous year so that cycles
			// whose root falls in a prior year still produce hits in the target month
			// (e.g. semestral starting in July produces a January occurrence next year).
			for (const baseYear of [year, year - 1]) {
				const base = new Date(baseYear, cycleMonth0, baseDay);
				for (let vez = 0; vez < def.times; vez++) {
					placeDate(
						new Date(base.getTime() + vez * def.delta * 24 * 60 * 60 * 1000),
						seg
					);
				}
			}
		}
		return buckets;
	}

	const _now = new Date();
	const _cy = _now.getFullYear();
	const _cm = _now.getMonth();
	const _pd = new Date(_cy, _cm - 1, 1);
	const _py = _pd.getFullYear();
	const _pm = _pd.getMonth();
	const currentMonthTitle = `${MONTH_NAMES_PT[_cm]} de ${_cy}`;
	const prevMonthTitle = `${MONTH_NAMES_PT[_pm]} de ${_py}`;
	const currentChart = $derived(computeWeeklyTotals(data.expenses, _cy, _cm));
	const prevChart = $derived(computeWeeklyTotals(data.expenses, _py, _pm));
</script>

<div class="space-y-6">
	<!-- Cabeçalho + tabs -->
	<div class="border-b border-primary-100/40 pb-0 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Configurações</h1>
		<p class="mt-1 text-sm text-ink-muted">Perfil profissional e dados da clínica.</p>
		<div class="mt-4 flex gap-0">
			<button
				onclick={() => (activeTab = 'perfil')}
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'perfil'
					? 'border-primary text-primary'
					: 'border-transparent text-ink-muted hover:text-ink dark:hover:text-bg'}"
			>
				Perfil & Clínica
			</button>
			<button
				onclick={() => (activeTab = 'despesas')}
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'despesas'
					? 'border-primary text-primary'
					: 'border-transparent text-ink-muted hover:text-ink dark:hover:text-bg'}"
			>
				Despesas
			</button>
		</div>
	</div>

	<!-- ── Aba: Perfil & Clínica ── -->
	{#if activeTab === 'perfil'}
		<!-- Perfil profissional -->
		<Card title="Perfil profissional">
			{#if editingTherapist}
				<form
					method="POST"
					action="?/updateTherapist"
					use:enhance={() => async ({ update }) => {
						await update({ reset: false });
						if (form?.success === 'therapist') editingTherapist = false;
					}}
					class="grid gap-4 sm:grid-cols-2"
				>
					<Input label="Nome" name="name" bind:value={tName} required />
					<Input label="E-mail" name="email" type="email" bind:value={tEmail} required />
					<Input label="CRP" name="crp" bind:value={tCrp} required />
					<Input label="Telefone" name="phone" bind:value={tPhone} />
					<Input label="Valor da sessão (R$)" name="default_session_fee" type="number" bind:value={tFee} />
					<div class="flex justify-end gap-2 sm:col-span-2">
						<Button variant="ghost" onclick={() => (editingTherapist = false)}>Cancelar</Button>
						<Button type="submit">Salvar</Button>
					</div>
					{#if form?.error && form?.success !== 'clinic'}
						<p class="text-sm text-red-600 sm:col-span-2">{formatFormError(form.error)}</p>
					{/if}
				</form>
			{:else}
				<div class="mb-4 flex justify-end">
					<Button variant="ghost" onclick={() => (editingTherapist = true)}>
						<PencilSimple size={16} /> Editar
					</Button>
				</div>
				<dl class="grid gap-5 sm:grid-cols-2">
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg">{data.therapist.name}</dd>
					</div>
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">E-mail</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg">{data.therapist.email}</dd>
					</div>
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">CRP</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg">{data.therapist.crp}</dd>
					</div>
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Telefone</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg">{data.therapist.phone ?? '—'}</dd>
					</div>
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor da sessão</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg">
							{data.therapist.default_session_fee != null
								? `R$ ${Number(data.therapist.default_session_fee).toFixed(2).replace('.', ',')}`
								: '—'}
						</dd>
					</div>
				</dl>
			{/if}
		</Card>

		<!-- Clínica -->
		<Card title="Clínica">
			{#if editingClinic}
				<form
					method="POST"
					action="?/updateClinic"
					use:enhance={() => async ({ update }) => {
						await update({ reset: false });
						if (form?.success === 'clinic') editingClinic = false;
					}}
					class="grid gap-4 sm:grid-cols-2"
				>
					<Input label="Nome da clínica" name="name" bind:value={cName} required />
					<Input label="Fuso horário" name="timezone" bind:value={cTimezone} required />
					<div>
						<label for="cnpj" class="label">CNPJ</label>
						<input
							id="cnpj"
							name="cnpj"
							bind:value={cCnpj}
							placeholder="00.000.000/0000-00"
							oninput={(e: Event) => (cCnpj = formatCnpj((e.target as HTMLInputElement).value))}
							class="input w-full"
						/>
					</div>
					<div class="flex gap-2 sm:col-span-2">
						<div class="flex-1">
							<Input label="Logradouro" name="address_street" bind:value={cStreet} />
						</div>
						<div class="w-24">
							<Input label="Número" name="address_number" type="number" bind:value={cNumber} />
						</div>
					</div>
					<Input label="Complemento" name="address_complement" bind:value={cComplement} />
					<div>
						<label for="address_zip" class="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
							CEP
							{#if zipLoading}
								<CircleNotch size={14} class="animate-spin text-primary" />
							{:else if zipInvalid}
								<Warning size={14} class="text-amber-500" weight="fill" />
								<span class="text-amber-500">CEP incompleto</span>
							{/if}
						</label>
						<input
							id="address_zip"
							name="address_zip"
							bind:value={cZip}
							placeholder="00000-000"
							oninput={data.cepEnabled ? onZipInput : undefined}
							class="input w-full"
						/>
						{#if !data.cepEnabled}
							<p class="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
								<WarningCircle size={12} weight="fill" />
								Busca automática de endereço temporariamente indisponível. Entre em contato com o administrador.
							</p>
						{/if}
					</div>
					<Input label="Cidade" name="address_city" bind:value={cCity} />
					<Input label="Estado" name="address_state" bind:value={cState} placeholder="SP" />

					<div>
						<label for="working_hours_start" class="label">Início do atendimento</label>
						<select id="working_hours_start" name="working_hours_start" class="input" bind:value={cHoursStart}>
							{#each ALL_HOURS as h}
								<option value={String(h)}>{String(h).padStart(2, '0')}:00</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="working_hours_end" class="label">Fim do atendimento</label>
						<select id="working_hours_end" name="working_hours_end" class="input" bind:value={cHoursEnd}>
							{#each ALL_HOURS.filter((h) => h > 0) as h}
								<option value={String(h)}>{String(h).padStart(2, '0')}:00</option>
							{/each}
						</select>
					</div>

					<div class="flex justify-end gap-2 sm:col-span-2">
						<Button variant="ghost" onclick={() => (editingClinic = false)}>Cancelar</Button>
						<Button type="submit">Salvar</Button>
					</div>
					{#if form?.error && form?.success !== 'therapist'}
						<p class="text-sm text-red-600 sm:col-span-2">{formatFormError(form.error)}</p>
					{/if}
				</form>
			{:else}
				<div class="mb-4 flex justify-end">
					<Button variant="ghost" onclick={() => (editingClinic = true)}>
						<PencilSimple size={16} /> Editar
					</Button>
				</div>
				<dl class="grid gap-5 sm:grid-cols-2">
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg">{data.clinic.name}</dd>
					</div>
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Fuso horário</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg">{data.clinic.timezone}</dd>
					</div>
					<div>
						<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Horário de atendimento</dt>
						<dd class="mt-1 font-medium text-ink dark:text-bg"
							>{String(data.clinic.working_hours_start ?? 7).padStart(2, '0')}:00 – {String(
								data.clinic.working_hours_end ?? 21
							).padStart(2, '0')}:00</dd
						>
					</div>
					{#if data.clinic.cnpj}
						<div>
							<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">CNPJ</dt>
							<dd class="mt-1 font-medium text-ink dark:text-bg">{formatCnpj(data.clinic.cnpj ?? '')}</dd>
						</div>
					{/if}
					{#if data.clinic.address_street || data.clinic.address_city}
						<div class="sm:col-span-2">
							<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Endereço</dt>
							<dd class="mt-1 font-medium text-ink dark:text-bg">
								{[
									data.clinic.address_street,
									(data.clinic as { address_number?: string | null }).address_number,
									data.clinic.address_complement,
									data.clinic.address_zip,
									data.clinic.address_city,
									data.clinic.address_state
								]
									.filter(Boolean)
									.join(', ')}
							</dd>
						</div>
					{/if}
				</dl>
			{/if}
		</Card>

		<Card title="Privacidade e LGPD">
			<p class="text-sm leading-relaxed text-ink-muted">
				Seus dados e os de seus pacientes são criptografados com <code
					class="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary dark:bg-primary-900/40"
					>pgcrypto</code
				> e protegidos por Row Level Security. Solicitações de exportação ou exclusão devem ser feitas
				por e-mail ao responsável pela plataforma.
			</p>
		</Card>
	{/if}

	<!-- ── Aba: Despesas ── -->
	{#if activeTab === 'despesas'}
		{#snippet monthChart(buckets: WeekBucket[], title: string)}
			{@const maxVal = Math.max(...buckets.map((b) => b.total), 1)}
			{@const monthTotal = buckets.reduce((s, b) => s + b.total, 0)}
			<div>
				<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
				{#if monthTotal === 0}
					<p class="text-xs italic text-ink-muted">Nenhuma despesa neste período.</p>
				{:else}
					<div class="space-y-2">
						{#each buckets as b}
							<div class="flex items-center gap-2 text-xs">
								<span class="w-28 shrink-0 text-right text-ink-muted">{b.label}</span>
								<div class="h-5 flex-1 overflow-hidden rounded bg-primary-50 dark:bg-white/5">
									{#if b.total > 0}
										<div
											class="flex h-full"
											style="width: {((b.total / maxVal) * 100).toFixed(1)}%"
										>
											{#each b.segments as seg}
												<div
													class="h-full"
													style="width: {((seg.amount / b.total) * 100).toFixed(1)}%; background-color: {seg.color}"
													title="{seg.description}: {formatBRL(seg.amount)}"
												></div>
											{/each}
										</div>
									{/if}
								</div>
								<span class="w-20 text-right text-ink-muted">
									{b.total > 0 ? formatBRL(b.total) : '—'}
								</span>
							</div>
						{/each}
						<div class="flex items-center gap-2 border-t border-primary-100/40 pt-2 dark:border-white/5">
							<span class="w-28 shrink-0 text-right text-xs font-semibold text-ink dark:text-bg">Total</span>
							<div class="flex-1"></div>
							<span class="w-20 text-right text-xs font-semibold text-ink dark:text-bg">{formatBRL(monthTotal)}</span>
						</div>
					</div>
				{/if}
			</div>
		{/snippet}

		<Card title="Distribuição semanal">
			<div class="grid gap-8 sm:grid-cols-2">
				{@render monthChart(currentChart, currentMonthTitle)}
				{@render monthChart(prevChart, prevMonthTitle)}
			</div>
		</Card>

		<Card title="Despesas">
			{#snippet actions()}
				{#if !showExpenseForm}
					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => (sortMode = 'date_value')}
							title="Ordenar por data e valor"
							class="rounded-lg p-1.5 transition-colors {sortMode === 'date_value'
								? 'bg-primary-50 text-primary dark:bg-primary-900/30 dark:text-primary-300'
								: 'text-ink-muted hover:bg-primary-50/60 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg'}"
						>
							<CalendarBlank size={16} />
						</button>
						<button
							type="button"
							onclick={() => (sortMode = 'value')}
							title="Ordenar por valor"
							class="rounded-lg p-1.5 transition-colors {sortMode === 'value'
								? 'bg-primary-50 text-primary dark:bg-primary-900/30 dark:text-primary-300'
								: 'text-ink-muted hover:bg-primary-50/60 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg'}"
						>
							<CurrencyDollar size={16} />
						</button>
						<div class="mx-1 h-4 w-px bg-primary-100/60 dark:bg-white/10"></div>
						<Button variant="ghost" onclick={startNew}>
							<Plus size={16} /> Nova despesa
						</Button>
					</div>
				{/if}
			{/snippet}

			{#if showExpenseForm}
				<!-- Formulário de criação / edição -->
				<form
					method="POST"
					action={exp.id ? '?/updateExpense' : '?/createExpense'}
					use:enhance={() => async ({ update }) => {
						await update({ reset: false });
						if (form?.success === 'createExpense' || form?.success === 'updateExpense') {
							showExpenseForm = false;
						}
					}}
					class="grid gap-4 sm:grid-cols-2"
				>
					{#if exp.id}
						<input type="hidden" name="id" value={exp.id} />
					{/if}

					<div class="sm:col-span-2">
						<Input label="Descrição" name="description" bind:value={exp.description} required placeholder="Ex: Aluguel, Supervisão, Software..." />
					</div>

					<div>
						<Input label="Valor (R$)" name="amount" type="number" bind:value={exp.amount} required placeholder="0,00" />
					</div>

					<div>
						<label for="exp_frequency" class="label">Periodicidade</label>
						<select
							id="exp_frequency"
							name="frequency"
							class="input"
							bind:value={exp.frequency}
							onchange={() => {
								if (needsMonth(exp.frequency) && Number(exp.month) === 0) exp.month = '1';
								if (!needsMonth(exp.frequency)) exp.month = '0';
							}}
						>
							<option value="weekly">Semanal</option>
							<option value="biweekly">Quinzenal</option>
							<option value="monthly">Mensal</option>
							<option value="quarterly">Trimestral</option>
							<option value="semestral">Semestral</option>
							<option value="annual">Anual</option>
							<option value="one_time">Avulsa</option>
						</select>
					</div>

					{#if exp.frequency === 'one_time'}
						<div>
							<Input label="Data" name="due_date" type="date" bind:value={exp.due_date} />
						</div>
						<div></div>
					{:else if exp.frequency === 'weekly'}
						<div></div>
						<div></div>
					{:else}
						<div>
							<Input
								label="Dia do vencimento (1–28)"
								name="due_day"
								type="number"
								bind:value={exp.due_day}
								placeholder="Ex: 5"
							/>
						</div>
						{#if needsMonth(exp.frequency)}
							<div>
								<label for="exp_month" class="label">Mês</label>
								<select id="exp_month" name="month" class="input" bind:value={exp.month}>
									{#each MONTH_OPTIONS as mo}
										<option value={String(mo.value)}>{mo.label}</option>
									{/each}
								</select>
							</div>
						{:else}
							<div></div>
						{/if}
					{/if}
					{#if !needsMonth(exp.frequency)}
						<input type="hidden" name="month" value="0" />
					{/if}

					<div class="sm:col-span-2">
						<Input label="Observações" name="notes" bind:value={exp.notes} placeholder="Opcional" />
					</div>

					<div class="sm:col-span-2">
						<p class="label mb-1.5">Cor</p>
						<div class="flex flex-wrap gap-2">
							{#each EXPENSE_COLORS as c}
								<button
									type="button"
									onclick={() => (exp.color = c.hex)}
									title={c.label}
									class="h-7 w-7 rounded-full border-2 transition-all hover:scale-110 {exp.color === c.hex ? 'border-ink/60 scale-110 dark:border-bg/60' : 'border-transparent'}"
									style="background-color: {c.hex}"
								></button>
							{/each}
						</div>
						<input type="hidden" name="color" value={exp.color} />
					</div>

					{#if exp.id}
						<div class="flex items-center gap-2 sm:col-span-2">
							<input
								type="checkbox"
								id="exp_is_active"
								name="is_active"
								checked={exp.is_active}
								onchange={(e) => (exp.is_active = (e.target as HTMLInputElement).checked)}
								class="h-4 w-4 rounded border-primary-200 accent-primary"
							/>
							<label for="exp_is_active" class="text-sm text-ink-muted">Despesa ativa</label>
						</div>
					{/if}

					{#if form?.error && form?.success !== 'therapist' && form?.success !== 'clinic'}
						<p class="text-sm text-red-600 sm:col-span-2">{formatFormError(form.error)}</p>
					{/if}

					<div class="flex justify-end gap-2 sm:col-span-2">
						<Button variant="ghost" onclick={cancelExpense}>Cancelar</Button>
						<Button type="submit">Salvar</Button>
					</div>
				</form>
			{:else}
				<!-- Lista de despesas -->
				{#if data.expenses.length === 0}
					<p class="py-6 text-center text-sm text-ink-muted">Nenhuma despesa cadastrada.</p>
				{:else}
					<ul class="divide-y divide-primary-100/40 dark:divide-white/5">
						{#each sortedExpenses as expense (expense.id)}
							<li class="flex items-center gap-3 py-3 {expense.is_active ? '' : 'opacity-50'}">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span
											class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
											style="background-color: {expense.color ?? DEFAULT_COLOR}"
										></span>
										<span class="font-medium text-ink dark:text-bg">{expense.description}</span>
										<span class="rounded-full px-2 py-0.5 text-[11px] font-medium {FREQ_CLASS[expense.frequency]}">
											{FREQ_LABEL[expense.frequency]}
										</span>
										{#if !expense.is_active}
											<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400 dark:bg-white/10">
												Inativa
											</span>
										{/if}
									</div>
									<div class="mt-0.5 flex gap-3 text-xs text-ink-muted">
										<span>{formatBRL(expense.amount)}</span>
										{#if formatDue(expense) !== '—'}
											<span>· {formatDue(expense)}</span>
										{/if}
										{#if expense.notes}
											<span>· {expense.notes}</span>
										{/if}
									</div>
								</div>

								<div class="flex shrink-0 items-center gap-1">
									<button
										type="button"
										onclick={() => startEdit(expense)}
										class="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-primary-50/60 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg"
										aria-label="Editar"
									>
										<PencilSimple size={15} />
									</button>

									<form
										method="POST"
										action="?/deleteExpense"
										use:enhance={() => async ({ update }) => {
											await update({ reset: false });
										}}
									>
										<input type="hidden" name="id" value={expense.id} />
										<button
											type="submit"
											onclick={(e) => { if (!confirm('Excluir esta despesa?')) e.preventDefault(); }}
											class="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
											aria-label="Excluir"
										>
											<Trash size={15} />
										</button>
									</form>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</Card>

	{/if}
</div>
