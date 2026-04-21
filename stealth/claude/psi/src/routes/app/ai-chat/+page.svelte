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
				{ role: 'assistant', content: `⚠️ Erro: ${err instanceof Error ? err.message : 'desconhecido'}` }
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

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<div>
			<h1 class="font-heading text-3xl font-bold">Assistente IA</h1>
			<p class="text-ink-muted">Converse com a IA — com ou sem voz.</p>
		</div>
		{#if data.features.voice}
			<Button
				variant="ghost"
				onclick={() => (voiceOn = !voiceOn)}
				data-testid="btn-toggle-voice"
			>
				{#if voiceOn}
					<SpeakerHigh size={18} /> Voz ativa
				{:else}
					<SpeakerSlash size={18} /> Voz desligada
				{/if}
			</Button>
		{/if}
	</header>

	<Card class="flex flex-col min-h-[60vh]">
		<div class="flex-1 space-y-3 overflow-y-auto p-2" data-testid="chat-messages">
			{#if messages.length === 0}
				<p class="py-12 text-center text-ink-muted">
					Comece uma conversa — por exemplo, "como organizar minha agenda desta semana?"
				</p>
			{/if}
			{#each messages as m, i (i)}
				<div class={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
					<div
						class="max-w-[80%] rounded-xl px-4 py-2.5 {m.role === 'user'
							? 'bg-primary text-white'
							: 'bg-primary-50 dark:bg-white/5'}"
					>
						<p class="whitespace-pre-wrap text-sm">{m.content}</p>
					</div>
				</div>
			{/each}
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				send();
			}}
			class="mt-4 flex gap-2 border-t border-primary-100/40 dark:border-white/5 pt-4"
		>
			<textarea
				bind:value={input}
				onkeydown={onKey}
				placeholder="Escreva sua mensagem…"
				rows="2"
				class="input resize-none"
				data-testid="inp-chat"
			></textarea>
			<Button type="submit" disabled={!canSend} loading={sending} data-testid="btn-send">
				<PaperPlaneTilt size={18} />
			</Button>
		</form>
	</Card>

	<audio bind:this={audioEl} class="hidden" controls></audio>
</div>
