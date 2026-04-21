<script lang="ts">
	import { supabase } from '$lib/supabase/client';
	import { GoogleLogo } from 'phosphor-svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function signInWithGoogle() {
		loading = true;
		error = null;
		const { error: err } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
				scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events',
				queryParams: { access_type: 'offline', prompt: 'consent' }
			}
		});
		if (err) {
			error = err.message;
			loading = false;
		}
	}
</script>

<div class="grid min-h-screen place-items-center px-6">
	<div class="surface w-full max-w-md p-8 text-center">
		<h1 class="font-heading text-3xl font-bold text-primary">Bem-vinda ao Psi</h1>
		<p class="mt-2 text-sm text-ink-muted">
			Entre com sua conta Google para acessar sua clínica.
		</p>

		<button
			class="btn btn-primary mt-8 w-full"
			onclick={signInWithGoogle}
			disabled={loading}
			data-testid="btn-google-login"
		>
			<GoogleLogo size={18} weight="bold" />
			{loading ? 'Redirecionando…' : 'Entrar com Google'}
		</button>

		{#if error}
			<p class="mt-4 text-sm text-red-600" data-testid="login-error">{error}</p>
		{/if}

		<p class="mt-6 text-xs text-ink-muted">
			Ao entrar, você concorda com a nossa Política de Privacidade em conformidade com a LGPD.
		</p>
	</div>
</div>
