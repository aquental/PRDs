<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import { PencilSimple, Warning, CircleNotch } from 'phosphor-svelte';
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
	interface Props {
		data: { therapist: Therapist; clinic: Clinic };
		form: { error?: unknown; success?: string } | null;
	}
	let { data, form }: Props = $props();

	let editingTherapist = $state(false);
	let editingClinic = $state(false);

	// therapist fields
	let tName = $state(data.therapist.name);
	let tEmail = $state(data.therapist.email);
	let tCrp = $state(data.therapist.crp);
	let tPhone = $state(data.therapist.phone ?? '');
	let tFee = $state(data.therapist.default_session_fee?.toString() ?? '250');

	// clinic fields
	let cName = $state(data.clinic.name);
	let cTimezone = $state(data.clinic.timezone);
	let cCnpj = $state(data.clinic.cnpj ?? '');
	let cStreet = $state(data.clinic.address_street ?? '');
	let cNumber = $state((data.clinic as { address_number?: string | null }).address_number ?? '');
	let cComplement = $state(data.clinic.address_complement ?? '');
	let cZip = $state(data.clinic.address_zip ?? '');
	let cCity = $state(data.clinic.address_city ?? '');
	let cState = $state(data.clinic.address_state ?? '');
	let cHoursStart = $state(String(data.clinic.working_hours_start ?? 7));
	let cHoursEnd = $state(String(data.clinic.working_hours_end ?? 21));

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
			const data = await res.json();
			if (!data.erro) {
				cStreet = data.logradouro ?? cStreet;
				cCity = data.localidade ?? cCity;
				cState = data.uf ?? cState;
			}
		} catch {
			// silencia erro de rede
		} finally {
			zipLoading = false;
		}
	}
</script>

<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Configurações</h1>
		<p class="mt-1 text-sm text-ink-muted">Perfil profissional e dados da clínica.</p>
	</div>

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
				<Input label="Valor padrão da consulta (R$)" name="default_session_fee" type="number" bind:value={tFee} />
				<div class="flex justify-end gap-2 sm:col-span-2">
					<Button variant="ghost" onclick={() => (editingTherapist = false)}>Cancelar</Button>
					<Button type="submit">Salvar</Button>
				</div>
				{#if form?.error && form?.success !== 'clinic'}
					<p class="text-sm text-red-600 sm:col-span-2">{JSON.stringify(form.error)}</p>
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
					<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor padrão da consulta</dt>
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
				<Input
					label="CNPJ"
					name="cnpj"
					bind:value={cCnpj}
					placeholder="00.000.000/0000-00"
					oninput={(e: Event) => (cCnpj = formatCnpj((e.target as HTMLInputElement).value))}
				/>
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

				<!-- Horário de funcionamento -->
				<div>
					<label for="working_hours_start" class="label">Início do atendimento</label>
					<select id="working_hours_start" name="working_hours_start" class="input" bind:value={cHoursStart}>
						{#each ALL_HOURS as h}
							<option value={String(h)}>{String(h).padStart(2,'0')}:00</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="working_hours_end" class="label">Fim do atendimento</label>
					<select id="working_hours_end" name="working_hours_end" class="input" bind:value={cHoursEnd}>
						{#each ALL_HOURS.filter(h => h > 0) as h}
							<option value={String(h)}>{String(h).padStart(2,'0')}:00</option>
						{/each}
					</select>
				</div>

				<div class="flex justify-end gap-2 sm:col-span-2">
					<Button variant="ghost" onclick={() => (editingClinic = false)}>Cancelar</Button>
					<Button type="submit">Salvar</Button>
				</div>
				{#if form?.error && form?.success !== 'therapist'}
					<p class="text-sm text-red-600 sm:col-span-2">{JSON.stringify(form.error)}</p>
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
					<dd class="mt-1 font-medium text-ink dark:text-bg">{String(data.clinic.working_hours_start ?? 7).padStart(2,'0')}:00 – {String(data.clinic.working_hours_end ?? 21).padStart(2,'0')}:00</dd>
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
							].filter(Boolean).join(', ')}
						</dd>
					</div>
				{/if}
			</dl>
		{/if}
	</Card>

	<Card title="Privacidade e LGPD">
		<p class="text-sm leading-relaxed text-ink-muted">
			Seus dados e os de seus pacientes são criptografados com <code class="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary dark:bg-primary-900/40">pgcrypto</code> e
			protegidos por Row Level Security. Solicitações de exportação ou exclusão devem ser feitas
			por e-mail ao responsável pela plataforma.
		</p>
	</Card>
</div>
