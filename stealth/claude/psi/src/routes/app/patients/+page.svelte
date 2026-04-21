<script lang="ts">
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
				email: string | null;
				phone: string | null;
				active: boolean;
				session_fee: number | null;
				sessions_per_month: number;
			}>;
			query: string;
		};
		form: { error?: Record<string, string[]>; success?: boolean } | null;
	}
	let { data, form }: Props = $props();

	let showForm = $state(false);
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let session_fee = $state('');
	let sessions_per_month = $state('4');
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<div>
			<h1 class="font-heading text-3xl font-bold">Pacientes</h1>
			<p class="text-ink-muted">{data.patients.length} no total</p>
		</div>
		<Button data-testid="btn-new-patient" onclick={() => (showForm = !showForm)}>
			<Plus size={18} weight="bold" /> Novo paciente
		</Button>
	</header>

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
							name = email = phone = session_fee = '';
							sessions_per_month = '4';
						}
					};
				}}
				class="grid gap-4 sm:grid-cols-2"
			>
				<Input label="Nome" name="name" bind:value={name} required data-testid="inp-name" />
				<Input label="E-mail" name="email" type="email" bind:value={email} data-testid="inp-email" />
				<Input label="Telefone" name="phone" bind:value={phone} data-testid="inp-phone" />
				<Input
					label="Valor da consulta (R$)"
					name="session_fee"
					type="number"
					bind:value={session_fee}
					data-testid="inp-fee"
				/>
				<Input
					label="Sessões/mês"
					name="sessions_per_month"
					type="number"
					bind:value={sessions_per_month}
					data-testid="inp-spm"
				/>
				<Input
					label="E-mail (Google Calendar)"
					name="google_calendar_attendee_email"
					type="email"
					data-testid="inp-gcal-email"
				/>

				<div class="sm:col-span-2 flex gap-2 justify-end">
					<Button variant="ghost" onclick={() => (showForm = false)}>Cancelar</Button>
					<Button type="submit" data-testid="btn-save-patient">Salvar</Button>
				</div>

				{#if form?.error}
					<p class="sm:col-span-2 text-sm text-red-600">
						{Object.values(form.error).flat().join(' · ')}
					</p>
				{/if}
			</form>
		</Card>
	{/if}

	<Card>
		<form class="mb-4 flex gap-2" method="GET">
			<div class="relative flex-1">
				<MagnifyingGlass
					size={18}
					class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
				/>
				<input
					name="q"
					value={data.query}
					placeholder="Buscar por nome"
					class="input pl-10"
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
					<thead class="text-xs uppercase text-ink-muted">
						<tr>
							<th class="py-2">Nome</th>
							<th>Contato</th>
							<th>Frequência</th>
							<th class="text-right">Valor</th>
						</tr>
					</thead>
					<tbody>
						{#each data.patients as p (p.id)}
							<tr class="border-t border-primary-100/40 dark:border-white/5">
								<td class="py-3 font-medium">
									<a href="/app/patients/{p.id}" class="hover:text-primary">{p.name}</a>
									{#if !p.active}
										<span class="ml-2 rounded bg-primary-50 px-1.5 py-0.5 text-xs">inativo</span>
									{/if}
								</td>
								<td>
									{#if p.email}<div>{p.email}</div>{/if}
									{#if p.phone}<div class="text-ink-muted">{formatPhone(p.phone)}</div>{/if}
								</td>
								<td>{p.sessions_per_month}/mês</td>
								<td class="text-right tabular-nums">{formatBRL(p.session_fee)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</div>
