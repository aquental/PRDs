<script lang="ts">
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import { GoogleLogo, Eye, EyeSlash } from 'phosphor-svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let showEmailForm = $state(false);
	let showForgotPassword = $state(false);
	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let resetSent = $state(false);

	const ERROR_MAP: Record<string, string> = {
		'Invalid login credentials': 'E-mail ou senha incorretos.',
		'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
		'User not found': 'Nenhuma conta encontrada com esse e-mail.',
		'Invalid email or password': 'E-mail ou senha incorretos.',
		'Too many requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
		'Email rate limit exceeded': 'Limite de e-mails atingido. Tente novamente mais tarde.'
	};

	function localizeError(msg: string): string {
		return ERROR_MAP[msg] ?? msg;
	}

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
			error = localizeError(err.message);
			loading = false;
		}
	}

	async function signInWithEmail() {
		loading = true;
		error = null;
		const { error: err } = await supabase.auth.signInWithPassword({ email, password });
		if (err) {
			error = localizeError(err.message);
			loading = false;
			return;
		}
		await goto('/app/dashboard');
	}

	async function sendPasswordReset() {
		loading = true;
		error = null;
		const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/auth/callback`
		});
		loading = false;
		if (err) {
			error = localizeError(err.message);
		} else {
			resetSent = true;
		}
	}
</script>

<div class="grid min-h-screen place-items-center px-6">
	<div class="surface w-full max-w-md p-8 text-center">
		<h1 class="font-heading text-3xl font-bold text-primary">Bem-vindo(a) ao Psi</h1>
		<p class="mt-2 text-sm text-ink-muted">
			Entre com sua conta para acessar sua clínica.
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

		<div class="my-6 flex items-center gap-3">
			<hr class="flex-1 border-border" />
			<span class="text-xs text-ink-muted">ou</span>
			<hr class="flex-1 border-border" />
		</div>

		{#if !showEmailForm}
			<button
				class="btn btn-secondary w-full"
				onclick={() => (showEmailForm = true)}
				disabled={loading}
				data-testid="btn-show-email-form"
			>
				Entrar com e-mail e senha
			</button>
		{:else if showForgotPassword}
			{#if resetSent}
				<p class="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
					Link enviado! Verifique seu e-mail.
				</p>
				<button
					class="mt-3 text-xs text-ink-muted underline"
					onclick={() => { showForgotPassword = false; resetSent = false; }}
				>
					Voltar ao login
				</button>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); sendPasswordReset(); }} class="flex flex-col gap-3 text-left">
					<p class="text-sm text-ink-muted">Digite seu e-mail para receber o link de redefinição de senha.</p>
					<div>
						<label for="reset-email" class="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
						<input
							id="reset-email"
							type="email"
							bind:value={email}
							required
							autocomplete="email"
							class="input w-full"
							placeholder="terapeuta@exemplo.com"
						/>
					</div>
					<button type="submit" class="btn btn-primary w-full" disabled={loading}>
						{loading ? 'Enviando…' : 'Enviar link'}
					</button>
					<button
						type="button"
						class="text-xs text-ink-muted underline"
						onclick={() => (showForgotPassword = false)}
					>
						Voltar ao login
					</button>
				</form>
			{/if}
		{:else}
			<form onsubmit={(e) => { e.preventDefault(); signInWithEmail(); }} class="flex flex-col gap-3 text-left">
				<div>
					<label for="email" class="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						class="input w-full"
						placeholder="terapeuta@exemplo.com"
						data-testid="input-email"
					/>
				</div>
				<div>
					<label for="password" class="mb-1 block text-xs font-medium text-ink-muted">Senha</label>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							autocomplete="current-password"
							class="input w-full pr-10"
							placeholder="••••••••"
							data-testid="input-password"
						/>
						<button
							type="button"
							class="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
						>
							{#if showPassword}
								<EyeSlash size={18} />
							{:else}
								<Eye size={18} />
							{/if}
						</button>
					</div>
				</div>
				<button
					type="submit"
					class="btn btn-primary w-full"
					disabled={loading}
					data-testid="btn-email-login"
				>
					{loading ? 'Entrando…' : 'Entrar'}
				</button>
				<button
					type="button"
					class="text-xs text-ink-muted underline"
					onclick={() => (showForgotPassword = true)}
				>
					Esqueci minha senha
				</button>
			</form>
		{/if}

		{#if error}
			<p class="mt-4 text-sm text-red-600" data-testid="login-error">{error}</p>
		{/if}

		<p class="mt-6 text-xs text-ink-muted">
			Ao entrar, você concorda com a nossa Política de Privacidade em conformidade com a LGPD.
		</p>
	</div>
</div>
