<script lang="ts">
	interface Props {
		level: number;
		active: boolean;
	}

	let { level, active }: Props = $props();

	const scale = $derived(active ? 1 + Math.min(level, 1) * 0.6 : 1);
	const opacity = $derived(active ? 0.3 + Math.min(level, 1) * 0.7 : 0.15);
</script>

<div class="relative flex items-center justify-center">
	<!-- Outer glow -->
	<div
		class="absolute h-32 w-32 rounded-full transition-all duration-100
			{active ? 'bg-red-500/10' : 'bg-zinc-500/5'}"
		style="transform: scale({scale * 1.3}); opacity: {opacity * 0.5}"
	></div>

	<!-- Middle ring -->
	<div
		class="absolute h-24 w-24 rounded-full transition-all duration-100
			{active ? 'bg-red-500/20' : 'bg-zinc-500/10'}"
		style="transform: scale({scale * 1.1}); opacity: {opacity * 0.7}"
	></div>

	<!-- Inner orb -->
	<div
		class="h-16 w-16 rounded-full transition-all duration-100
			{active ? 'bg-red-500/30 shadow-lg shadow-red-500/20' : 'bg-zinc-700/50'}"
		style="transform: scale({scale}); opacity: {opacity}"
	></div>
</div>
