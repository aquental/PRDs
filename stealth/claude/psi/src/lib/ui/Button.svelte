<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost';

	interface Props {
		variant?: Variant;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		'data-testid'?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		loading = false,
		onclick,
		children,
		...rest
	}: Props = $props();

	const classes = $derived(
		['btn', `btn-${variant}`].join(' ')
	);
</script>

<button
	{type}
	class={classes}
	disabled={disabled || loading}
	{onclick}
	data-testid={rest['data-testid']}
>
	{#if loading}
		<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
	{/if}
	{@render children()}
</button>
