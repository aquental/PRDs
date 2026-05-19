<script lang="ts">
	import { Microphone, StopCircle, Check, X, WarningCircle, CircleNotch } from 'phosphor-svelte';
	import type { AttendanceSession } from './SessionItem.svelte';

	export interface VoiceDecision {
		sessionId: string;
		patientName: string;
		status: 'presente' | 'faltou';
	}

	interface Props {
		sessions: AttendanceSession[];
		onConfirm: (decisions: VoiceDecision[]) => void;
	}

	let { sessions, onConfirm }: Props = $props();

	const pendingSessions = $derived(sessions.filter((s) => s.attendance_status === null));

	type Phase = 'idle' | 'listening' | 'processing' | 'proposal' | 'error';
	let phase = $state<Phase>('idle');
	let transcript = $state('');
	let decisions = $state<VoiceDecision[]>([]);
	let errorMsg = $state('');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let recognition: any = null;

	function startListening() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
		if (!SR) {
			errorMsg = 'Reconhecimento de voz não suportado. Use Chrome ou Edge.';
			phase = 'error';
			return;
		}

		recognition = new SR();
		recognition.lang = 'pt-BR';
		recognition.continuous = true;
		recognition.interimResults = true;

		let finalText = '';

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		recognition.onresult = (e: any) => {
			let interim = '';
			for (let i = e.resultIndex; i < e.results.length; i++) {
				if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
				else interim += e.results[i][0].transcript;
			}
			transcript = (finalText + interim).trim();
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		recognition.onerror = (e: any) => {
			if (e.error === 'no-speech') return;
			errorMsg = 'Erro no microfone. Verifique as permissões do navegador.';
			phase = 'error';
			recognition = null;
		};

		phase = 'listening';
		transcript = '';
		finalText = '';
		recognition.start();
	}

	async function stopAndProcess() {
		if (recognition) {
			recognition.stop();
			recognition = null;
		}

		const text = transcript.trim();
		if (!text) {
			phase = 'idle';
			return;
		}

		phase = 'processing';

		try {
			const res = await fetch('/api/ai/voice-appoint', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transcript: text,
					sessions: pendingSessions.map((s) => ({
						id: s.id,
						patientName: s.patientName,
						scheduled_at: s.scheduled_at
					}))
				})
			});

			if (!res.ok) {
				errorMsg = 'Erro ao processar fala. Tente novamente.';
				phase = 'error';
				return;
			}

			const data: { decisions: VoiceDecision[] } = await res.json();

			if (!data.decisions?.length) {
				errorMsg = 'Não identifiquei presenças. Fale os nomes dos pacientes.';
				phase = 'error';
				return;
			}

			decisions = data.decisions;
			phase = 'proposal';
		} catch {
			errorMsg = 'Erro de conexão. Tente novamente.';
			phase = 'error';
		}
	}

	function dismiss() {
		if (recognition) {
			recognition.stop();
			recognition = null;
		}
		phase = 'idle';
		transcript = '';
		decisions = [];
		errorMsg = '';
	}

	function confirm() {
		const confirmed = [...decisions];
		dismiss();
		onConfirm(confirmed);
	}

	$effect(() => {
		return () => {
			if (recognition) {
				recognition.stop();
				recognition = null;
			}
		};
	});
</script>

{#if phase === 'idle' || phase === 'error'}
	<div class="flex flex-wrap items-center gap-2">
		<button
			onclick={startListening}
			class="flex items-center gap-1.5 rounded-lg border border-primary-100/80 px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:hover:border-primary-400/60 dark:hover:text-primary-300"
			aria-label="Apontar sessões por voz"
		>
			<Microphone size={13} weight="bold" />
			Voz
		</button>

		{#if phase === 'error'}
			<span class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
				<WarningCircle size={13} weight="fill" />
				{errorMsg}
			</span>
		{/if}
	</div>

{:else if phase === 'listening'}
	<div
		class="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary-50/40 px-3 py-2.5 dark:border-primary-400/20 dark:bg-primary-900/10"
	>
		<div class="flex items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-xs font-medium text-primary dark:text-primary-300">
				<span class="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true"></span>
				Gravando…
			</span>
			<button
				onclick={stopAndProcess}
				class="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-primary/90"
				aria-label="Parar gravação e processar"
			>
				<StopCircle size={12} weight="fill" />
				Parar
			</button>
		</div>
		{#if transcript}
			<p class="text-xs italic text-ink-muted dark:text-bg/70" aria-live="polite">{transcript}</p>
		{:else}
			<p class="text-xs text-ink-muted/60">Fale os nomes dos pacientes e o status…</p>
		{/if}
	</div>

{:else if phase === 'processing'}
	<div class="flex items-center gap-2 py-1.5 text-xs text-ink-muted">
		<CircleNotch size={13} class="animate-spin" aria-hidden="true" />
		Processando fala…
	</div>

{:else if phase === 'proposal'}
	<div
		class="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary-50/30 px-3 py-2.5 dark:border-primary-400/20 dark:bg-primary-900/10"
		role="region"
		aria-label="Proposta de apontamentos por voz"
	>
		<p class="text-xs font-medium text-ink dark:text-bg">Confirmar apontamentos?</p>

		<div class="flex flex-col gap-1" role="list">
			{#each decisions as d (d.sessionId)}
				<div class="flex items-center gap-2 text-xs" role="listitem">
					<span class="flex-1 text-ink-muted">{d.patientName}</span>
					{#if d.status === 'presente'}
						<span
							class="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400"
						>
							<Check size={11} weight="bold" />
							Presente
						</span>
					{:else}
						<span class="flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
							<X size={11} weight="bold" />
							Faltou
						</span>
					{/if}
				</div>
			{/each}
		</div>

		<div class="flex items-center gap-2 pt-0.5">
			<button
				onclick={confirm}
				class="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary/90"
			>
				<Check size={11} weight="bold" />
				Confirmar
			</button>
			<button
				onclick={dismiss}
				class="rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:text-ink dark:hover:text-bg"
			>
				Cancelar
			</button>
		</div>
	</div>
{/if}
