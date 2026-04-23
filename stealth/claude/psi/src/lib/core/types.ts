/**
 * Tipos de domínio puros (sem dependência de Supabase ou libs externas).
 * Mantidos alinhados com MODEL.md.
 */

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type FinanceEntryType = 'revenue' | 'expense';
export type AICallType = 'llm_chat' | 'tts_synthesis' | 'stt_transcription';
export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Relative {
	name: string;
	relation: string;
	phone?: string;
	email?: string;
}

export interface InvoiceData {
	cpf?: string;
	address?: string;
	phone?: string;
	email?: string;
}

export interface Clinic {
	id: string;
	name: string;
	cnpj?: string | null;
	address?: string | null;
	timezone: string;
	created_at: string;
	updated_at: string;
}

export interface Therapist {
	id: string;
	user_id: string;
	clinic_id: string;
	name: string;
	crp: string;
	cnpj?: string | null;
	phone?: string | null;
	email: string;
	address?: string | null;
	avatar_url?: string | null;
	google_calendar_id?: string | null;
	created_at: string;
	updated_at: string;
}

export interface Patient {
	id: string;
	clinic_id: string;
	therapist_id: string;
	name: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	birth_date?: string | null;
	relatives: Relative[];
	invoice_data: InvoiceData;
	session_fee?: number | null;
	sessions_per_month: number;
	frequency?: string | null;
	active: boolean;
	google_calendar_attendee_email?: string | null;
	created_at: string;
	updated_at: string;
}

export interface Session {
	id: string;
	clinic_id: string;
	therapist_id: string;
	patient_id: string;
	scheduled_at: string;
	duration_minutes: number;
	fee?: number | null;
	status: SessionStatus;
	google_calendar_event_id?: string | null;
	paid: boolean;
	paid_at?: string | null;
	created_at: string;
	updated_at: string;
}

export interface FinanceEntry {
	id: string;
	clinic_id: string;
	therapist_id: string;
	patient_id?: string | null;
	session_id?: string | null;
	type: FinanceEntryType;
	amount: number;
	description?: string | null;
	occurred_at: string; // YYYY-MM-DD
	created_at: string;
}

export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';

export interface Expense {
	id: string;
	clinic_id: string;
	description: string;
	amount: number;
	frequency: ExpenseFrequency;
	due_day?: number | null;
	due_date?: string | null;
	is_active: boolean;
	notes?: string | null;
	created_at: string;
	updated_at: string;
}

export interface AIUsageLog {
	id: string;
	clinic_id?: string | null;
	therapist_id?: string | null;
	call_type: AICallType;
	provider: string;
	model?: string | null;
	input_tokens: number;
	output_tokens: number;
	characters: number;
	cost_usd: number;
	duration_ms?: number | null;
	status: 'success' | 'error';
	error_message?: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
}
