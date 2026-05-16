<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		title: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
	}
	let { title, description, icon, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center gap-3">
	{#if icon}
		<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-200">
			{@render icon()}
		</div>
	{/if}
	<p class="font-semibold text-ink dark:text-bg">{title}</p>
	{#if description}
		<p class="max-w-xs text-sm text-ink-muted">{description}</p>
	{/if}
	{#if action}
		<div class="mt-2">{@render action()}</div>
	{/if}
</div>
