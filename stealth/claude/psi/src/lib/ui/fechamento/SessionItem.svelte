<script lang="ts">
	import { Check, X, PencilSimple, Dot } from 'phosphor-svelte';

	export interface AttendanceSession {
		id: string;
		scheduled_at: string;
		duration_minutes: number;
		attendance_status: 'presente' | 'faltou' | null;
		patientName: string;
		isModified: boolean;
		lastLogAt: string | null;
	}

	interface Props {
		session: AttendanceSession;
		isClosed: boolean;
		isFuture: boolean;
		onAppoint?: (sessionId: string, status: 'presente' | 'faltou') => void;
	}

	let {
		session,
		isClosed,
		isFuture,
		onAppoint = (id, status) => console.log('[appoint stub]', id, status)
	}: Props = $props();

	let editing = $state(false);

	const time = $derived(
		new Date(session.scheduled_at).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	const lastLogFormatted = $derived(
		session.lastLogAt
			? new Date(session.lastLogAt).toLocaleString('pt-BR', {
					day: '2-digit',
					month: '2-digit',
					hour: '2-digit',
					minute: '2-digit'
				})
			: null
	);

	function handleAppoint(status: 'presente' | 'faltou') {
		onAppoint(session.id, status);
		editing = false;
	}
</script>

<div
	class="flex min-h-[2.75rem] items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors
		{editing
		? 'border border-dashed border-primary/50 bg-primary-50/40 dark:border-primary-400/30 dark:bg-primary-900/10'
		: session.attendance_status !== null
			? 'bg-transparent'
			: 'bg-primary-50/30 dark:bg-white/[0.03]'}"
	role="row"
>
	<!-- Horário + paciente -->
	<span class="shrink-0 tabular-nums text-ink-muted">{time}</span>
	<span class="flex-1 truncate font-medium text-ink dark:text-bg">{session.patientName}</span>

	<!-- Status / ações -->
	{#if isFuture}
		<span class="text-xs text-ink-muted/60">Aguardando</span>

	{:else if isClosed}
		<!-- Somente leitura -->
		{#if session.attendance_status === 'presente'}
			<span
				class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
			>
				Presente
			</span>
		{:else if session.attendance_status === 'faltou'}
			<span
				class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
			>
				Faltou
			</span>
		{:else}
			<span class="text-xs text-ink-muted/60">—</span>
		{/if}

	{:else if editing}
		<!-- Estado de edição inline -->
		<span class="mr-1 text-[10px] uppercase tracking-wide text-primary/70">editando</span>
		<div class="flex items-center gap-1" role="group" aria-label="Confirmar apontamento">
			<button
				onclick={() => handleAppoint('presente')}
				class="flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600 active:scale-95"
				aria-label="Marcar como presente"
			>
				<Check size={12} weight="bold" />
				Presente
			</button>
			<button
				onclick={() => handleAppoint('faltou')}
				class="flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600 active:scale-95"
				aria-label="Marcar como faltou"
			>
				<X size={12} weight="bold" />
				Faltou
			</button>
			<button
				onclick={() => (editing = false)}
				class="rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:text-ink dark:hover:text-bg"
				aria-label="Cancelar edição"
			>
				Cancelar
			</button>
		</div>

	{:else if session.attendance_status !== null}
		<!-- Apontada: pill + botão editar + indicador modificada -->
		<div class="flex items-center gap-1.5">
			{#if session.isModified && lastLogFormatted}
				<span
					class="text-amber-500"
					title="Última edição em {lastLogFormatted}"
					aria-label="Apontamento editado em {lastLogFormatted}"
				>
					<Dot size={16} weight="fill" />
				</span>
			{/if}

			{#if session.attendance_status === 'presente'}
				<span
					class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
				>
					Presente
				</span>
			{:else}
				<span
					class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
				>
					Faltou
				</span>
			{/if}

			<button
				onclick={() => (editing = true)}
				class="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted/60 transition-colors hover:bg-primary-50 hover:text-primary dark:hover:bg-white/5 dark:hover:text-primary-300"
				aria-label="Editar apontamento de {session.patientName}"
			>
				<PencilSimple size={13} />
			</button>
		</div>

	{:else}
		<!-- Não apontada: dois botões -->
		<div class="flex items-center gap-1" role="group" aria-label="Apontar sessão">
			<button
				onclick={() => handleAppoint('presente')}
				class="flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 active:scale-95 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
				aria-label="Marcar {session.patientName} como presente"
			>
				<Check size={12} weight="bold" />
				Presente
			</button>
			<button
				onclick={() => handleAppoint('faltou')}
				class="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-95 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
				aria-label="Marcar {session.patientName} como faltou"
			>
				<X size={12} weight="bold" />
				Faltou
			</button>
		</div>
	{/if}
</div>
