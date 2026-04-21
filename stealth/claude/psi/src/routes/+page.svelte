<script lang="ts">
	import { ShieldCheck, Brain, ChartLineUp } from 'phosphor-svelte';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
</script>

<div class="min-h-screen">
	<header class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
		<h1 class="font-heading text-2xl font-bold text-primary">Psi</h1>
		<div class="flex items-center gap-3">
			<ThemeToggle />
			<a href="/login" class="btn btn-primary" data-testid="btn-login">Entrar</a>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
		<h2 class="font-heading text-5xl font-bold leading-tight md:text-6xl">
			Sua clínica, organizada.<br />
			<span class="text-primary">Sem planilhas, sem atritos.</span>
		</h2>
		<p class="mx-auto mt-6 max-w-2xl text-lg text-ink-muted">
			Gestão de pacientes, agenda sincronizada com Google Calendar, financeiro com projeção
			automática e um assistente de IA com voz. Tudo em conformidade com a LGPD.
		</p>
		<a href="/login" class="btn btn-primary mt-8 px-6 py-3 text-base">Começar agora</a>
	</main>

	<section class="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
		<article class="surface p-6">
			<ShieldCheck size={28} class="text-primary" weight="duotone" />
			<h3 class="mt-3 font-heading font-semibold">LGPD por padrão</h3>
			<p class="mt-1 text-sm text-ink-muted">
				Criptografia com pgcrypto e RLS em todas as tabelas.
			</p>
		</article>
		<article class="surface p-6">
			<Brain size={28} class="text-primary" weight="duotone" />
			<h3 class="mt-3 font-heading font-semibold">Assistente com voz</h3>
			<p class="mt-1 text-sm text-ink-muted">
				Fale com a IA, ela responde em áudio natural (ElevenLabs).
			</p>
		</article>
		<article class="surface p-6">
			<ChartLineUp size={28} class="text-primary" weight="duotone" />
			<h3 class="mt-3 font-heading font-semibold">Financeiro claro</h3>
			<p class="mt-1 text-sm text-ink-muted">
				Projeção de receita, pendências e despesas automatizadas.
			</p>
		</article>
	</section>
</div>
