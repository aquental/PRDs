<script lang="ts">
	import { untrack } from 'svelte';
	import Card from '$lib/ui/Card.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import { formatBRL, formatDateTime, formatPhone } from '$lib/utils/format';
	import { PencilSimple, Warning, CircleNotch, WarningCircle, Plus, Trash, MapPin, UsersThree } from 'phosphor-svelte';
	import { PUBLIC_CEP_API_URL } from '$env/static/public';

	interface Session {
		id: string;
		scheduled_at: string;
		duration_minutes: number;
		fee: number | null;
		status: string;
		paid: boolean;
	}
	interface Relative {
		id: string;
		nome: string;
		telefone: string | null;
		endereco: string | null;
	}
	interface PatientAddress {
		patient_id: string;
		logradouro: string;
		numero: string | null;
		complemento: string | null;
		cep: string;
		cidade: string;
		estado: string;
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
			address: PatientAddress | null;
			relatives: Relative[];
			cepEnabled: boolean;
		};
		form: { error?: unknown; success?: boolean | string } | null;
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

	// ── Tabs ──────────────────────────────────────────────
	type Tab = 'address' | 'relatives';
	let activeTab = $state<Tab>('address');

	// ── Endereço ─────────────────────────────────────────
	let addrLogradouro = $state(untrack(() => data.address?.logradouro ?? ''));
	let addrNumero = $state(untrack(() => data.address?.numero ?? ''));
	let addrComplemento = $state(untrack(() => data.address?.complemento ?? ''));
	let addrCep = $state(untrack(() => data.address?.cep ?? ''));
	let addrCidade = $state(untrack(() => data.address?.cidade ?? ''));
	let addrEstado = $state(untrack(() => data.address?.estado ?? ''));

	let zipLoading = $state(false);
	const zipDigits = $derived(addrCep.replace(/\D/g, ''));
	const zipInvalid = $derived(zipDigits.length > 0 && zipDigits.length < 8);

	function formatZip(v: string) {
		const d = v.replace(/\D/g, '').slice(0, 8);
		return d.replace(/(\d{5})(\d)/, '$1-$2');
	}

	async function onCepInput(e: Event) {
		addrCep = formatZip((e.target as HTMLInputElement).value);
		const digits = addrCep.replace(/\D/g, '');
		if (digits.length !== 8) return;
		zipLoading = true;
		try {
			const res = await fetch(`${PUBLIC_CEP_API_URL}/${digits}/json/`);
			const json = await res.json();
			if (!json.erro) {
				addrLogradouro = json.logradouro ?? addrLogradouro;
				addrCidade = json.localidade ?? addrCidade;
				addrEstado = json.uf ?? addrEstado;
				addrComplemento = json.complemento || addrComplemento;
			}
		} catch {
			// silencia erro de rede
		} finally {
			zipLoading = false;
		}
	}

	// ── Parentes ─────────────────────────────────────────
	let newRelNome = $state('');
	let newRelTelefone = $state('');
	let newRelEndereco = $state('');
	let editingRelativeId = $state<string | null>(null);
	let editRelNome = $state('');
	let editRelTelefone = $state('');
	let editRelEndereco = $state('');

	function startEditRelative(r: Relative) {
		editingRelativeId = r.id;
		editRelNome = r.nome;
		editRelTelefone = r.telefone ?? '';
		editRelEndereco = r.endereco ?? '';
	}
	function cancelEditRelative() {
		editingRelativeId = null;
	}

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

	const formattedAddress = $derived.by(() => {
		const a = data.address;
		if (!a) return '';
		const l1 = [a.logradouro, a.numero].filter(Boolean).join(', ');
		const l2 = [a.cidade, a.estado].filter(Boolean).join(' - ');
		return [l1, a.complemento, l2, a.cep].filter(Boolean).join(' • ');
	});
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
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Endereço</dt>
					<dd class="mt-0.5 font-medium text-ink dark:text-bg">{formattedAddress || '—'}</dd>
				</div>
				<div>
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Parentes</dt>
					<dd class="mt-0.5 font-medium text-ink dark:text-bg">
						{data.relatives.length > 0 ? `${data.relatives.length} cadastrado(s)` : '—'}
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

	<!-- Abas: Endereço / Parentes -->
	<div>
		<div class="flex gap-2 border-b border-primary-100/40 dark:border-white/5">
			<button
				type="button"
				onclick={() => (activeTab = 'address')}
				class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition
					{activeTab === 'address'
						? 'border-b-2 border-primary text-primary'
						: 'border-b-2 border-transparent text-ink-muted hover:text-ink dark:hover:text-bg'}"
			>
				<MapPin size={16} />
				Endereço
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'relatives')}
				class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition
					{activeTab === 'relatives'
						? 'border-b-2 border-primary text-primary'
						: 'border-b-2 border-transparent text-ink-muted hover:text-ink dark:hover:text-bg'}"
			>
				<UsersThree size={16} />
				Parentes
				{#if data.relatives.length > 0}
					<span class="rounded-full bg-primary-50 px-2 text-xs text-primary dark:bg-primary-900/40 dark:text-primary-200">
						{data.relatives.length}
					</span>
				{/if}
			</button>
		</div>

		<div class="mt-4">
			{#if activeTab === 'address'}
				<Card title={data.address ? 'Editar endereço' : 'Adicionar endereço'}>
					<form
						method="POST"
						action="?/updateAddress"
						use:enhance={() => {
							return async ({ update }) => {
								await update({ reset: false });
							};
						}}
						class="grid gap-4 sm:grid-cols-6"
					>
						<div class="sm:col-span-2">
							<label for="cep" class="label flex items-center gap-1">
								CEP<span class="text-secondary">*</span>
								{#if zipLoading}
									<CircleNotch size={14} class="animate-spin text-primary" />
								{:else if zipInvalid}
									<Warning size={14} class="text-amber-500" weight="fill" />
									<span class="text-amber-500">CEP incompleto</span>
								{/if}
							</label>
							<input
								id="cep"
								name="cep"
								bind:value={addrCep}
								placeholder="00000-000"
								required
								oninput={data.cepEnabled ? onCepInput : undefined}
								class="input w-full"
							/>
							{#if !data.cepEnabled}
								<p class="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
									<WarningCircle size={12} weight="fill" />
									Busca automática de endereço indisponível.
								</p>
							{/if}
						</div>

						<div class="sm:col-span-4">
							<Input label="Logradouro" name="logradouro" bind:value={addrLogradouro} required />
						</div>

						<div class="sm:col-span-2">
							<Input label="Número" name="numero" bind:value={addrNumero} />
						</div>
						<div class="sm:col-span-4">
							<Input label="Complemento" name="complemento" bind:value={addrComplemento} />
						</div>

						<div class="sm:col-span-4">
							<Input label="Cidade" name="cidade" bind:value={addrCidade} required />
						</div>
						<div class="sm:col-span-2">
							<Input label="Estado" name="estado" bind:value={addrEstado} placeholder="SP" required />
						</div>

						<div class="flex items-center justify-between sm:col-span-6">
							<div class="text-sm">
								{#if form?.success === 'address'}
									<span class="text-green-600 dark:text-green-400">Endereço salvo.</span>
								{:else if form?.error}
									<span class="text-red-600">{JSON.stringify(form.error)}</span>
								{/if}
							</div>
							<Button type="submit">Salvar endereço</Button>
						</div>
					</form>
				</Card>
			{:else}
				<div class="space-y-4">
					{#if data.relatives.length === 0}
						<Card>
							<p class="py-4 text-center text-sm text-ink-muted">Nenhum parente cadastrado.</p>
						</Card>
					{:else}
						{#each data.relatives as r (r.id)}
							<Card>
								{#if editingRelativeId === r.id}
									<form
										method="POST"
										action="?/updateRelative"
										use:enhance={() => {
											return async ({ update }) => {
												await update({ reset: false });
												if (!form?.error) editingRelativeId = null;
											};
										}}
										class="grid gap-4 sm:grid-cols-2"
									>
										<input type="hidden" name="id" value={r.id} />
										<Input label="Nome" name="nome" bind:value={editRelNome} required />
										<Input label="Telefone" name="telefone" bind:value={editRelTelefone} />
										<div class="sm:col-span-2">
											<Input label="Endereço" name="endereco" bind:value={editRelEndereco} />
										</div>
										<div class="flex justify-end gap-2 sm:col-span-2">
											<Button variant="ghost" onclick={cancelEditRelative}>Cancelar</Button>
											<Button type="submit">Salvar</Button>
										</div>
									</form>
								{:else}
									<div class="flex items-start justify-between gap-4">
										<div class="flex-1 space-y-1 text-sm">
											<p class="font-medium text-ink dark:text-bg">{r.nome}</p>
											<p class="text-ink-muted">
												{r.telefone ? formatPhone(r.telefone) : 'Sem telefone'}
											</p>
											{#if r.endereco}
												<p class="text-ink-muted">{r.endereco}</p>
											{/if}
										</div>
										<div class="flex gap-2">
											<Button variant="ghost" onclick={() => startEditRelative(r)}>
												<PencilSimple size={14} /> Editar
											</Button>
											<form
												method="POST"
												action="?/deleteRelative"
												use:enhance={() => {
													return async ({ update }) => {
														await update({ reset: false });
													};
												}}
											>
												<input type="hidden" name="id" value={r.id} />
												<Button type="submit" variant="ghost">
													<Trash size={14} /> Remover
												</Button>
											</form>
										</div>
									</div>
								{/if}
							</Card>
						{/each}
					{/if}

					<Card title="Adicionar parente">
						<form
							method="POST"
							action="?/addRelative"
							use:enhance={() => {
								return async ({ update }) => {
									await update({ reset: false });
									if (!form?.error) {
										newRelNome = '';
										newRelTelefone = '';
										newRelEndereco = '';
									}
								};
							}}
							class="grid gap-4 sm:grid-cols-2"
						>
							<Input label="Nome" name="nome" bind:value={newRelNome} required />
							<Input label="Telefone" name="telefone" bind:value={newRelTelefone} />
							<div class="sm:col-span-2">
								<Input label="Endereço" name="endereco" bind:value={newRelEndereco} />
							</div>
							<div class="flex items-center justify-between sm:col-span-2">
								<div class="text-sm">
									{#if form?.success === 'relative_added'}
										<span class="text-green-600 dark:text-green-400">Parente adicionado.</span>
									{:else if form?.error}
										<span class="text-red-600">{JSON.stringify(form.error)}</span>
									{/if}
								</div>
								<Button type="submit">
									<Plus size={14} /> Adicionar
								</Button>
							</div>
						</form>
					</Card>
				</div>
			{/if}
		</div>
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
