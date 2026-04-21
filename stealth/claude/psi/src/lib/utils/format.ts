/** Utilitários de formatação para a UI (pt-BR). */

export function formatBRL(value: number | null | undefined): string {
	if (value == null) return '—';
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(value);
}

export function formatDateTime(iso: string, tz = 'America/Sao_Paulo'): string {
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: tz,
		dateStyle: 'short',
		timeStyle: 'short'
	}).format(new Date(iso));
}

export function formatDate(iso: string, tz = 'America/Sao_Paulo'): string {
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: tz,
		dateStyle: 'medium'
	}).format(new Date(iso));
}

export function formatCPF(cpf: string): string {
	const d = cpf.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
	return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function formatPhone(phone: string): string {
	const d = phone.replace(/\D/g, '');
	if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
	if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
	return phone;
}
