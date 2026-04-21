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

<div class="space-y-6">
	<h1 class="font-heading text-3xl font-bold">Configurações</h1>

	<Card title="Perfil profissional">
		<dl class="grid gap-4 sm:grid-cols-2 text-sm">
			<div>
				<dt class="text-ink-muted">Nome</dt>
				<dd>{data.therapist.name}</dd>
			</div>
			<div>
				<dt class="text-ink-muted">E-mail</dt>
				<dd>{data.therapist.email}</dd>
			</div>
			<div>
				<dt class="text-ink-muted">CRP</dt>
				<dd>{data.therapist.crp}</dd>
			</div>
		</dl>
	</Card>

	<Card title="Clínica">
		<dl class="grid gap-4 sm:grid-cols-2 text-sm">
			<div>
				<dt class="text-ink-muted">Nome</dt>
				<dd>{data.clinic.name}</dd>
			</div>
			<div>
				<dt class="text-ink-muted">Fuso horário</dt>
				<dd>{data.clinic.timezone}</dd>
			</div>
		</dl>
	</Card>

	<Card title="Privacidade e LGPD">
		<p class="text-sm">
			Seus dados e os de seus pacientes são criptografados com <code>pgcrypto</code> e
			protegidos por Row Level Security. Solicitações de exportação ou exclusão devem ser feitas
			por e-mail para o responsável pela plataforma.
		</p>
	</Card>
</div>
