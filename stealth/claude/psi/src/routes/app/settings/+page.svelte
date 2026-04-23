<script lang="ts">
	import { untrack } from 'svelte';
	import Card from '$lib/ui/Card.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import { PencilSimple, Warning, CircleNotch, Plus, Trash } from 'phosphor-svelte';
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
		frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
		due_day?: number | null;
		due_date?: string | null;
		is_active: boolean;
		notes?: string | null;
	}
	interface Props {
		data: { therapist: Therapist; clinic: Clinic; expenses: Expense[] };
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
	const FREQ_LABEL: Record<string, string> = {
		monthly: 'Mensal',
		quarterly: 'Trimestral',
		annual: 'Anual',
		one_time: 'Avulsa'
	};
	const FREQ_CLASS: Record<string, string> = {
		monthly: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
		quarterly: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
		annual: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
		one_time: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
	};

	function formatBRL(v: number) {
		return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	}

	function formatDue(expense: Expense): string {
		if (expense.frequency === 'one_time' && expense.due_date) {
			return new Date(expense.due_date + 'T00:00:00').toLocaleDateString('pt-BR');
		}
		if (expense.due_day) return `Dia ${expense.due_day}`;
		return '—';
	}

	interface ExpenseForm {
		id: string;
		description: string;
		amount: string;
		frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
		due_day: string;
		due_date: string;
		notes: string;
		is_active: boolean;
	}

	let showExpenseForm = $state(false);
	let exp = $state<ExpenseForm>({
		id: '',
		description: '',
		amount: '',
		frequency: 'monthly',
		due_day: '',
		due_date: '',
		notes: '',
		is_active: true
	});

	function startNew() {
		exp = { id: '', description: '', amount: '', frequency: 'monthly', due_day: '', due_date: '', notes: '', is_active: true };
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
			is_active: expense.is_active
		};
		showExpenseForm = true;
	}

	function cancelExpense() {
		showExpenseForm = false;
	}
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
							oninput={onZipInput}
							class="input w-full"
						/>
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
		<Card title="Despesas">
			{#snippet actions()}
				{#if !showExpenseForm}
					<Button variant="ghost" onclick={startNew}>
						<Plus size={16} /> Nova despesa
					</Button>
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
						<select id="exp_frequency" name="frequency" class="input" bind:value={exp.frequency}>
							<option value="monthly">Mensal</option>
							<option value="quarterly">Trimestral</option>
							<option value="annual">Anual</option>
							<option value="one_time">Avulsa</option>
						</select>
					</div>

					{#if exp.frequency !== 'one_time'}
						<div>
							<Input
								label="Dia do vencimento (1–28)"
								name="due_day"
								type="number"
								bind:value={exp.due_day}
								placeholder="Ex: 5"
							/>
						</div>
					{:else}
						<div>
							<Input label="Data" name="due_date" type="date" bind:value={exp.due_date} />
						</div>
					{/if}

					<div class="sm:col-span-2">
						<Input label="Observações" name="notes" bind:value={exp.notes} placeholder="Opcional" />
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
						{#each data.expenses as expense (expense.id)}
							<li class="flex items-center gap-3 py-3 {expense.is_active ? '' : 'opacity-50'}">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
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
