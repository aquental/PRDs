<script lang="ts">
	import type { SessionSettings, Voice } from '$lib/types';

	interface Props {
		open: boolean;
		settings: SessionSettings;
		isActive: boolean;
		onclose: () => void;
	}

	let { open, settings = $bindable(), isActive, onclose }: Props = $props();

	const voices: Voice[] = ['Eve', 'Ara', 'Leo', 'Rex', 'Sal'];
</script>

<!-- Backdrop + Sheet -->
<div
	class="fixed inset-0 z-50 {open ? '' : 'pointer-events-none'}"
	role="dialog"
	aria-modal="true"
	aria-label="Settings"
>
	<!-- Backdrop -->
	<button
		class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200
			{open ? 'opacity-100' : 'opacity-0'}"
		onclick={onclose}
		aria-label="Close settings"
		tabindex={open ? 0 : -1}
	></button>

	<!-- Sheet -->
	<div
		class="absolute right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800
			transition-transform duration-300 ease-out overflow-y-auto
			{open ? 'translate-x-0' : 'translate-x-full'}"
	>
		<div class="p-6 space-y-6">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-zinc-100">Settings</h2>
				<button
					class="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
					onclick={onclose}
					aria-label="Close"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if isActive}
				<div class="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
					Changes will take effect when you reconnect.
				</div>
			{/if}

			<!-- Voice -->
			<div class="space-y-2">
				<label for="voice-select" class="text-sm font-medium text-zinc-300">Voice</label>
				<select
					id="voice-select"
					bind:value={settings.voice}
					class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100
						focus:outline-none focus:ring-2 focus:ring-zinc-500"
				>
					{#each voices as v}
						<option value={v}>{v}</option>
					{/each}
				</select>
			</div>

			<!-- Instructions -->
			<div class="space-y-2">
				<label for="instructions" class="text-sm font-medium text-zinc-300">Instructions</label>
				<textarea
					id="instructions"
					bind:value={settings.instructions}
					rows={6}
					class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100
						focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-y"
				></textarea>
			</div>

			<!-- VAD Threshold -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label for="vad-threshold" class="text-sm font-medium text-zinc-300">VAD Threshold</label>
					<span class="text-xs text-zinc-500">{settings.vadThreshold.toFixed(2)}</span>
				</div>
				<input
					id="vad-threshold"
					type="range"
					min="0.1"
					max="0.9"
					step="0.05"
					bind:value={settings.vadThreshold}
					class="w-full accent-zinc-400"
				/>
			</div>

			<!-- Silence Duration -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label for="silence-duration" class="text-sm font-medium text-zinc-300">Silence Duration</label>
					<span class="text-xs text-zinc-500">{settings.silenceDuration}ms</span>
				</div>
				<input
					id="silence-duration"
					type="range"
					min="0"
					max="10000"
					step="100"
					bind:value={settings.silenceDuration}
					class="w-full accent-zinc-400"
				/>
			</div>

			<!-- Prefix Padding -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label for="prefix-padding" class="text-sm font-medium text-zinc-300">Prefix Padding</label>
					<span class="text-xs text-zinc-500">{settings.prefixPadding}ms</span>
				</div>
				<input
					id="prefix-padding"
					type="range"
					min="0"
					max="10000"
					step="100"
					bind:value={settings.prefixPadding}
					class="w-full accent-zinc-400"
				/>
			</div>

			<!-- Web Search Toggle -->
			<div class="flex items-center justify-between">
				<label for="web-search" class="text-sm font-medium text-zinc-300">Web Search</label>
				<button
					id="web-search"
					role="switch"
					aria-label="Toggle web search"
					aria-checked={settings.enableWebSearch}
					class="relative h-6 w-11 rounded-full transition-colors
						{settings.enableWebSearch ? 'bg-green-600' : 'bg-zinc-700'}"
					onclick={() => (settings.enableWebSearch = !settings.enableWebSearch)}
				>
					<span
						class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform
							{settings.enableWebSearch ? 'translate-x-5' : 'translate-x-0'}"
					></span>
				</button>
			</div>

			<!-- X Search Toggle -->
			<div class="flex items-center justify-between">
				<label for="x-search" class="text-sm font-medium text-zinc-300">X Search</label>
				<button
					id="x-search"
					role="switch"
					aria-label="Toggle X search"
					aria-checked={settings.enableXSearch}
					class="relative h-6 w-11 rounded-full transition-colors
						{settings.enableXSearch ? 'bg-green-600' : 'bg-zinc-700'}"
					onclick={() => (settings.enableXSearch = !settings.enableXSearch)}
				>
					<span
						class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform
							{settings.enableXSearch ? 'translate-x-5' : 'translate-x-0'}"
					></span>
				</button>
			</div>
		</div>
	</div>
</div>
