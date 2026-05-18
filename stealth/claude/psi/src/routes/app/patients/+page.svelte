<script lang="ts">
	import { untrack } from 'svelte';
	import Card from '$lib/ui/Card.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { Plus, MagnifyingGlass } from 'phosphor-svelte';
	import { formatBRL, formatPhone } from '$lib/utils/format';
	import { enhance } from '$app/forms';

	interface Props {
		data: {
			patients: Array<{
				id: string;
				name: string;
				email: string;
				phone: string | null;
				active: boolean;
				session_fee: number | null;
			}>;
			query: string;
			defaultFee: number;
		};
		form: { error?: Record<string, string[]>; success?: boolean } | null;
	}
	let { data, form }: Props = $props();

	let showForm = $state(false);
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let cpf = $state('');
	let start_date = $state('');
	let notes = $state('');
	let session_fee = $state(untrack(() => data.defaultFee.toString()));

	let canSubmit = $derived(
		name.trim().length > 0 &&
			email.trim().length > 0 &&
			cpf.replace(/\D/g, '').length === 11
	);

	function maskCPF(value: string): string {
		const d = value.replace(/\D/g, '').slice(0, 11);
		if (d.length <= 3) return d;
		if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
		if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
		return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
	}
</script>

<div class="space-y-8">
	<div class="flex items-start justify-between border-b border-primary-100/40 pb-6 dark:border-white/5">
		<div>
			<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Pacientes</h1>
			<p class="mt-1 text-sm text-ink-muted">
				{data.patients.length} {data.patients.length === 1 ? 'paciente' : 'pacientes'} cadastrados
			</p>
		</div>
		<Button data-testid="btn-new-patient" onclick={() => (showForm = !showForm)}>
			<Plus size={16} weight="bold" /> Novo paciente
		</Button>
	</div>

	{#if showForm}
		<Card title="Cadastrar paciente">
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						if (!form?.error) {
							showForm = false;
							name = email = phone = cpf = start_date = notes = '';
							session_fee = data.defaultFee.toString();
						}
					};
				}}
				class="grid gap-4 sm:grid-cols-2"
			>
				<Input label="Nome" name="name" bind:value={name} required data-testid="inp-name" />
				<Input label="E-mail" name="email" type="email" bind:value={email} required data-testid="inp-email" />
				<Input label="Telefone" name="phone" bind:value={phone} data-testid="inp-phone" />
				<div>
					<label for="inp-cpf" class="label">CPF <span aria-hidden="true" class="text-red-500">*</span></label>
					<input
						id="inp-cpf"
						name="cpf"
						value={cpf}
						placeholder="000.000.000-00"
						maxlength={14}
						required
						oninput={(e) => { cpf = maskCPF((e.currentTarget as HTMLInputElement).value); }}
						class="input w-full"
						data-testid="inp-cpf"
					/>
				</div>
				<Input label="Início do atendimento" name="start_date" type="date" bind:value={start_date} />
				<Input
					label="Valor da consulta (R$)"
					name="session_fee"
					type="number"
					bind:value={session_fee}
					data-testid="inp-fee"
				/>
				<Input
					label="E-mail (Google Calendar)"
					name="google_calendar_attendee_email"
					type="email"
					data-testid="inp-gcal-email"
				/>
				<div class="sm:col-span-2">
					<label for="inp-notes" class="label">Observações</label>
					<textarea
						id="inp-notes"
						name="notes"
						bind:value={notes}
						rows={3}
						class="input w-full resize-y"
						data-testid="inp-notes"
					></textarea>
				</div>

				<div class="flex justify-end gap-2 sm:col-span-2">
					<Button variant="ghost" onclick={() => (showForm = false)}>Cancelar</Button>
					<Button type="submit" disabled={!canSubmit} data-testid="btn-save-patient">Salvar</Button>
				</div>

				{#if form?.error}
					<p class="text-sm text-red-600 sm:col-span-2">
						{Object.values(form.error).flat().join(' · ')}
					</p>
				{/if}
			</form>
		</Card>
	{/if}

	<Card>
		<form class="mb-5 flex gap-2" method="GET">
			<div class="relative flex-1">
				<MagnifyingGlass
					size={16}
					class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
				/>
				<input
					name="q"
					value={data.query}
					placeholder="Buscar por nome"
					class="input pl-9 text-sm"
					data-testid="inp-search"
				/>
			</div>
			<Button type="submit" variant="ghost">Buscar</Button>
		</form>

		{#if data.patients.length === 0}
			<p class="py-12 text-center text-ink-muted">Nenhum paciente cadastrado.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm" data-testid="tbl-patients">
					<thead>
						<tr class="border-b border-primary-100/60 dark:border-white/5">
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Contato</th>
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
						{#each data.patients as p (p.id)}
							<tr>
								<td class="py-3.5">
									<div class="flex items-center gap-2">
										<a href="/app/patients/{p.id}" class="font-medium hover:text-primary">{p.name}</a>
										{#if !p.active}
											<span class="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-ink-muted dark:bg-white/5">inativo</span>
										{/if}
									</div>
								</td>
								<td class="py-3.5">
									{#if p.email}<div class="text-ink">{p.email}</div>{/if}
									{#if p.phone}<div class="text-xs text-ink-muted">{formatPhone(p.phone)}</div>{/if}
								</td>
								<td class="py-3.5 text-right tabular-nums font-medium">{formatBRL(p.session_fee)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</div>
