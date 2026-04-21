<script lang="ts">
	interface Props {
		label?: string;
		name: string;
		type?: string;
		value?: string;
		placeholder?: string;
		required?: boolean;
		autocomplete?: string;
		'data-testid'?: string;
	}
	let {
		label,
		name,
		type = 'text',
		value = $bindable(''),
		placeholder,
		required = false,
		autocomplete,
		...rest
	}: Props = $props();
</script>

<div>
	{#if label}
		<label class="label" for={name}>{label}{#if required}<span class="text-secondary">*</span>{/if}</label>
	{/if}
	<input
		id={name}
		{name}
		{type}
		{placeholder}
		{required}
		{autocomplete}
		class="input"
		bind:value
		data-testid={rest['data-testid']}
	/>
</div>
