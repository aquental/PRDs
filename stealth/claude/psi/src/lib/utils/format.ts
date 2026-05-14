/** Utilitários de formatação para a UI (pt-BR). */

export function formatBRL(value: number | null | undefined): string {
	// EC-06: also guard NaN and Infinity which pass the `== null` check
	if (value == null || !Number.isFinite(value)) return '—';
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(value);
}

export function formatDateTime(iso: string, tz = 'America/Sao_Paulo'): string {
	// EC-02: guard against invalid date strings to prevent RangeError
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: tz,
		dateStyle: 'short',
		timeStyle: 'short'
	}).format(d);
}

function formatDate(iso: string, tz = 'America/Sao_Paulo'): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: tz,
		dateStyle: 'medium'
	}).format(d);
}

function formatCPF(cpf: string): string {
	const d = cpf.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
	return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function formatPhone(phone: string): string {
	const d = phone.replace(/\D/g, '');
	if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
	if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
	return phone;
}
