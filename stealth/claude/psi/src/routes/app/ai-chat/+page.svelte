<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { PaperPlaneTilt, SpeakerHigh, SpeakerSlash } from 'phosphor-svelte';

	interface Msg {
		role: 'user' | 'assistant';
		content: string;
		audioUrl?: string;
	}
	interface Props {
		data: {
			conversations: { id: string; title: string | null; updated_at: string }[];
			features: { voice: boolean };
		};
	}
	let { data }: Props = $props();

	let input = $state('');
	let messages = $state<Msg[]>([]);
	let sending = $state(false);
	let voiceOn = $state(data.features.voice);
	let audioEl: HTMLAudioElement | null = $state(null);

	const canSend = $derived(input.trim().length > 0 && !sending);

	async function send() {
		if (!canSend) return;
		const userText = input.trim();
		messages = [...messages, { role: 'user', content: userText }];
		input = '';
		sending = true;

		try {
			const res = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages.concat({ role: 'user', content: userText }).map((m) => ({
						role: m.role,
						content: m.content
					}))
				})
			});
			if (!res.ok) throw new Error(await res.text());
			const { content } = await res.json();

			let audioUrl: string | undefined;
			if (voiceOn) {
				const ttsRes = await fetch('/api/ai/tts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: content })
				});
				if (ttsRes.ok) {
					const blob = await ttsRes.blob();
					audioUrl = URL.createObjectURL(blob);
					if (audioEl) {
						audioEl.src = audioUrl;
						audioEl.play().catch(() => {});
					}
				}
			}

			messages = [...messages, { role: 'assistant', content, audioUrl }];
		} catch (err) {
			messages = [
				...messages,
				{ role: 'assistant', content: `Erro: ${err instanceof Error ? err.message : 'desconhecido'}` }
			];
		} finally {
			sending = false;
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="space-y-8">
	<div class="flex items-start justify-between border-b border-primary-100/40 pb-6 dark:border-white/5">
		<div>
			<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Assistente IA</h1>
			<p class="mt-1 text-sm text-ink-muted">Converse com a IA — com ou sem voz.</p>
		</div>
		{#if data.features.voice}
			<button
				onclick={() => (voiceOn = !voiceOn)}
				data-testid="btn-toggle-voice"
				class="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition
					{voiceOn
					? 'border-primary-200 bg-primary-50 text-primary dark:border-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
					: 'border-primary-100/60 text-ink-muted hover:border-primary-200 dark:border-white/10 dark:text-bg/60'}"
			>
				{#if voiceOn}
					<SpeakerHigh size={16} weight="fill" /> Voz ativa
				{:else}
					<SpeakerSlash size={16} /> Voz desligada
				{/if}
			</button>
		{/if}
	</div>

	<section class="surface flex min-h-[60vh] flex-col p-5">
		<div class="flex-1 space-y-4 overflow-y-auto" data-testid="chat-messages">
			{#if messages.length === 0}
				<div class="flex h-full flex-col items-center justify-center py-16 text-center">
					<p class="text-sm text-ink-muted">
						Comece uma conversa — por exemplo,<br />
						<span class="mt-1 block font-medium text-ink dark:text-bg">"como organizar minha agenda desta semana?"</span>
					</p>
				</div>
			{/if}
			{#each messages as m, i (i)}
				<div class={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
					<div
						class="max-w-[78%] rounded-2xl px-4 py-3 {m.role === 'user'
							? 'rounded-br-sm bg-primary text-white'
							: 'rounded-bl-sm bg-primary-50 text-ink dark:bg-white/5 dark:text-bg'}"
					>
						<p class="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
					</div>
				</div>
			{/each}
			{#if sending}
				<div class="flex justify-start">
					<div class="rounded-2xl rounded-bl-sm bg-primary-50 px-4 py-3 dark:bg-white/5">
						<span class="flex gap-1">
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:0ms]"></span>
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:150ms]"></span>
							<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:300ms]"></span>
						</span>
					</div>
				</div>
			{/if}
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				send();
			}}
			class="mt-4 flex gap-2 border-t border-primary-100/40 pt-4 dark:border-white/5"
		>
			<textarea
				bind:value={input}
				onkeydown={onKey}
				placeholder="Escreva sua mensagem…"
				rows="2"
				class="input resize-none text-sm"
				data-testid="inp-chat"
			></textarea>
			<Button type="submit" disabled={!canSend} loading={sending} data-testid="btn-send">
				<PaperPlaneTilt size={16} weight="fill" />
			</Button>
		</form>
	</section>
</div>

<audio bind:this={audioEl} class="hidden" controls></audio>
