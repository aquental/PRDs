<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	interface Props {
		data: {
			therapist: { name: string; email: string; crp: string };
			clinic: { name: string; timezone: string };
		};
	}
	let { data }: Props = $props();
</script>

<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Configurações</h1>
		<p class="mt-1 text-sm text-ink-muted">Perfil profissional e dados da clínica.</p>
	</div>

	<Card title="Perfil profissional">
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
		</dl>
	</Card>

	<Card title="Clínica">
		<dl class="grid gap-5 sm:grid-cols-2">
			<div>
				<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Nome</dt>
				<dd class="mt-1 font-medium text-ink dark:text-bg">{data.clinic.name}</dd>
			</div>
			<div>
				<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Fuso horário</dt>
				<dd class="mt-1 font-medium text-ink dark:text-bg">{data.clinic.timezone}</dd>
			</div>
		</dl>
	</Card>

	<Card title="Privacidade e LGPD">
		<p class="text-sm leading-relaxed text-ink-muted">
			Seus dados e os de seus pacientes são criptografados com <code class="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary dark:bg-primary-900/40">pgcrypto</code> e
			protegidos por Row Level Security. Solicitações de exportação ou exclusão devem ser feitas
			por e-mail ao responsável pela plataforma.
		</p>
	</Card>
</div>
