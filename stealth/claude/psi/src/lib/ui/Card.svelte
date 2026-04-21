<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		title?: string;
		class?: string;
		children: Snippet;
		actions?: Snippet;
	}
	let { title, class: className = '', children, actions }: Props = $props();
</script>

<section class="surface p-5 {className}">
	{#if title || actions}
		<header class="mb-4 flex items-center justify-between">
			{#if title}
				<h2 class="text-lg font-semibold">{title}</h2>
			{/if}
			{#if actions}{@render actions()}{/if}
		</header>
	{/if}
	{@render children()}
</section>
