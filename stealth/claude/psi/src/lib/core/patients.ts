/**
 * Validação e normalização de dados de paciente — puro e testável.
 */
import type { Patient, Relative } from './types';

/** Valida e normaliza o CPF. Retorna apenas dígitos, ou `null` se inválido. */
export function normalizeCPF(cpf: string): string | null {
	const digits = cpf.replace(/\D/g, '');
	if (digits.length !== 11) return null;
	if (/^(\d)\1{10}$/.test(digits)) return null;

	// Check digit 1
	let sum = 0;
	for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
	let d1 = (sum * 10) % 11;
	if (d1 === 10) d1 = 0;
	if (d1 !== Number(digits[9])) return null;

	// Check digit 2
	sum = 0;
	for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
	let d2 = (sum * 10) % 11;
	if (d2 === 10) d2 = 0;
	if (d2 !== Number(digits[10])) return null;

	return digits;
}

/** Formata CPF: 11122233344 -> 111.222.333-44 */
export function formatCPF(digits: string): string {
	const d = digits.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
	return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/** Normaliza telefone BR para dígitos apenas. */
export function normalizePhone(phone: string): string {
	return phone.replace(/\D/g, '');
}

/** Valida estrutura básica de um familiar. */
export function validateRelative(r: Partial<Relative>): r is Relative {
	return typeof r.name === 'string' && r.name.trim().length > 0 &&
	       typeof r.relation === 'string' && r.relation.trim().length > 0;
}

/** Calcula a idade a partir da data de nascimento (ISO YYYY-MM-DD). */
export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number | null {
	const d = new Date(birthDate);
	if (Number.isNaN(d.getTime())) return null;
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age < 0 ? null : age;
}

/** Busca textual simples em pacientes (nome, email, telefone). */
export function searchPatients(patients: Patient[], query: string): Patient[] {
	const q = query.trim().toLowerCase();
	if (!q) return patients;
	return patients.filter((p) => {
		return (
			p.name.toLowerCase().includes(q) ||
			(p.email?.toLowerCase().includes(q) ?? false) ||
			(p.phone?.includes(q) ?? false)
		);
	});
}
