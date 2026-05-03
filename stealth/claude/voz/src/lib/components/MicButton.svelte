<script lang="ts">
	interface Props {
		active: boolean;
		level?: number;
		size?: 'sm' | 'lg';
		onclick: () => void;
	}

	let { active, level = 0, size = 'lg', onclick }: Props = $props();

	const sizeClasses = $derived(
		size === 'lg' ? 'h-20 w-20 text-3xl' : 'h-12 w-12 text-xl'
	);

	const pulseScale = $derived(1 + Math.min(level, 1) * 0.3);
</script>

<button
	class="relative inline-flex items-center justify-center rounded-full transition-all duration-150
		{sizeClasses}
		{active
		? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25'
		: 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'}"
	{onclick}
	aria-label={active ? 'Stop recording' : 'Start recording'}
>
	<!-- Pulse ring when active -->
	{#if active}
		<span
			class="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
			style="transform: scale({pulseScale})"
		></span>
		<span
			class="absolute inset-0 rounded-full bg-red-500/20 transition-transform duration-100"
			style="transform: scale({pulseScale})"
		></span>
	{/if}

	<!-- Icon -->
	<span class="relative z-10">
		{#if active}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-[1em] w-[1em]">
				<rect x="6" y="6" width="12" height="12" rx="2" />
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-[1em] w-[1em]">
				<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
				<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
			</svg>
		{/if}
	</span>
</button>
