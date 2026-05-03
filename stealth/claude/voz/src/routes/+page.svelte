<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { VoiceAgent } from '$lib/voice-agent.svelte';
	import MicButton from '$lib/components/MicButton.svelte';
	import AudioVisualizer from '$lib/components/AudioVisualizer.svelte';
	import Settings from '$lib/components/Settings.svelte';

	const agent = new VoiceAgent();

	let settingsOpen = $state(false);
	let textInput = $state('');
	let scrollEl: HTMLDivElement | undefined = $state();

	const isLive = $derived(agent.status === 'connecting' || agent.status === 'active');

	// Auto-scroll on new messages or streaming content
	$effect(() => {
		const msgs = agent.messages;
		if (msgs.length === 0) return;
		const last = msgs[msgs.length - 1];
		void last.content;
		void last.isStreaming;
		tick().then(() => {
			scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
		});
	});

	function handleMicClick() {
		if (isLive) {
			agent.disconnect();
		} else {
			agent.connect();
		}
	}

	function handleSendText() {
		const text = textInput.trim();
		if (!text) return;
		agent.sendText(text);
		textInput = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendText();
		}
	}

	onDestroy(() => agent.destroy());
</script>

<svelte:head>
	<title>Voz — Voice Agent</title>
</svelte:head>

<div class="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
	<!-- Header -->
	<header class="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
		<div class="flex items-center gap-3">
			<h1 class="text-lg font-semibold">Voz</h1>

			<!-- Status badge -->
			{#if agent.status === 'active'}
				<span class="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
					<span class="h-1.5 w-1.5 rounded-full bg-green-400"></span>
					Active
				</span>
			{:else if agent.status === 'connecting'}
				<span class="flex items-center gap-1.5 rounded-full bg-zinc-700/50 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
					<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
						<path d="M4 12a8 8 0 018-8V0" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
					</svg>
					Connecting
				</span>
			{:else if agent.status === 'error'}
				<span class="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
					<span class="h-1.5 w-1.5 rounded-full bg-red-400"></span>
					Error
				</span>
			{/if}
		</div>

		<button
			class="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
			onclick={() => (settingsOpen = true)}
			aria-label="Open settings"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		</button>
	</header>

	<!-- Transcript area -->
	<div bind:this={scrollEl} class="flex-1 overflow-y-auto">
		{#if !isLive && agent.messages.length === 0}
			<!-- Idle state: centered mic -->
			<div class="flex h-full flex-col items-center justify-center gap-6">
				<AudioVisualizer level={agent.micLevel} active={isLive} />
				<MicButton active={false} onclick={handleMicClick} />
				<p class="text-sm text-zinc-500">Tap to start talking</p>
				{#if agent.error}
					<p class="max-w-sm text-center text-sm text-red-400">{agent.error}</p>
				{/if}
			</div>
		{:else}
			<!-- Messages -->
			<div class="mx-auto max-w-3xl space-y-4 px-4 py-6">
				{#each agent.messages as msg (msg.id)}
					<div class="flex gap-3 items-start {msg.interrupted ? 'opacity-50' : ''}">
						<!-- Avatar -->
						<div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium
							{msg.role === 'user' ? 'bg-zinc-700 text-zinc-300' : 'bg-indigo-600/20 text-indigo-300'}">
							{msg.role === 'user' ? 'U' : 'A'}
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium mb-1
								{msg.role === 'user' ? 'text-zinc-400' : 'text-indigo-400'}">
								{msg.role === 'user' ? 'You' : 'Assistant'}
							</p>
							<p class="text-sm leading-relaxed {msg.role === 'user' ? 'text-zinc-100' : 'text-zinc-300'}">
								{msg.content || '…'}{#if msg.isStreaming}<span class="inline-block w-1 h-4 bg-zinc-400 ml-0.5 animate-pulse"></span>{/if}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer — visible when session is live -->
	{#if isLive}
		<footer class="sticky bottom-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
			<!-- Audio visualizer -->
			<div class="mx-auto mb-3 flex max-w-3xl justify-center">
				<AudioVisualizer level={agent.micLevel} active={true} />
			</div>

			<div class="mx-auto flex max-w-3xl items-center gap-2">
				<input
					type="text"
					bind:value={textInput}
					onkeydown={handleKeydown}
					placeholder="Type a message…"
					class="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100
						placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
				/>

				<!-- Send button -->
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100
						disabled:opacity-30 disabled:cursor-not-allowed"
					onclick={handleSendText}
					disabled={!textInput.trim()}
					aria-label="Send message"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
						<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
					</svg>
				</button>

				<!-- Mic / Stop button -->
				<MicButton active={true} level={agent.micLevel} size="sm" onclick={handleMicClick} />
			</div>

			{#if agent.error}
				<p class="mx-auto mt-2 max-w-3xl text-center text-xs text-red-400">{agent.error}</p>
			{/if}
		</footer>
	{/if}
</div>

<!-- Settings Sheet -->
<Settings
	open={settingsOpen}
	bind:settings={agent.settings}
	isActive={agent.status === 'active'}
	onclose={() => (settingsOpen = false)}
/>
