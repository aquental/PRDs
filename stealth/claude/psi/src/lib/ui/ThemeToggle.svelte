<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from 'phosphor-svelte';
	import { getTheme, toggleTheme, type Theme } from '$lib/utils/theme';

	let theme = $state<Theme>('light');

	onMount(() => {
		theme = getTheme();
	});

	function onClick() {
		theme = toggleTheme();
	}
</script>

<button
	class="btn btn-ghost p-2 rounded-xl"
	onclick={onClick}
	aria-label="Alternar tema"
	data-testid="theme-toggle"
>
	{#if theme === 'dark'}
		<Sun size={20} weight="duotone" />
	{:else}
		<Moon size={20} weight="duotone" />
	{/if}
</button>
