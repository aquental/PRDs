/**
 * Tipos de domínio puros (sem dependência de Supabase ou libs externas).
 * Mantidos alinhados com MODEL.md.
 */

export type SessionStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type SessionFrequency = "weekly" | "biweekly" | "monthly" | "detached";
export type FinanceEntryType = "revenue" | "expense";
export type AICallType = "llm_chat" | "tts_synthesis" | "stt_transcription";
export type ChatMessageRole = "user" | "assistant" | "system" | "tool";

export interface Relative {
  name: string;
  relation: string;
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
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  therapist_id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  birth_date?: string | null;
  session_fee?: number | null;
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
  frequency: SessionFrequency;
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
  type: FinanceEntryType;
  amount: number;
  occurred_at: string; // YYYY-MM-DD
  created_at: string;
}

export type ExpenseFrequency = "monthly" | "quarterly" | "annual" | "one_time";

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

// ── Operacional ──────────────────────────────────────────────────────────────

export type PatientCancellationPolicy =
  | "default"
  | "sempre_abona"
  | "sempre_cobra"
  | "janela_custom";

export interface CancellationPolicy {
  windowHours: number;
}

export interface PatientCancellationOverride {
  policy: PatientCancellationPolicy;
  windowHours?: number;
}

export interface RepasseConfig {
  fixo: number;
  percentual: number;
}

export interface RepasseResult {
  repasse: number;
  liquido: number;
  disabled: boolean;
}

export type PendencyType = "sessao_sem_registro" | "conta_atrasada";

export interface Pendency {
  type: PendencyType;
  description: string;
  id: string;
}

export interface DuePayment {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
}

export interface OperationalSession {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  durationMinutes: number;
  fee: number;
  status: SessionStatus;
  cancelledAt?: string | null;
  paid: boolean;
}

export type MonthClosureStatus = "open" | "closed";
export type MonthClosureRole = "profissional" | "clinica";

export interface MonthClosureLogEntry {
  action: "closed" | "reopened";
  at: string;
  by: string;
  role: MonthClosureRole;
}

export interface MonthClosure {
  id: string;
  clinicId: string;
  therapistId: string;
  monthYear: string;
  status: MonthClosureStatus;
  log: MonthClosureLogEntry[];
  createdAt: string;
  updatedAt: string;
}

// ── Push notifications ────────────────────────────────────────────────────────

export type PushTrigger =
  | "unregistered_sessions"
  | "due_payments"
  | "month_close_reminder"
  | "month_reopened";

export interface PushPayload {
  trigger: PushTrigger;
  title: string;
  body: string;
  url: string;
  scheduledFor?: string;
  data?: Record<string, string | number | boolean>;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export type TemplateCategory = "evolucao" | "relatorio" | "outro";
export type TemplateMedia = "whatsapp" | "email" | "print";

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  evolucao: "Evolução",
  relatorio: "Relatório",
  outro: "Outro",
};

export interface Template {
  id: string;
  clinic_id: string;
  therapist_id: string;
  patient_id: string | null;
  category: TemplateCategory;
  media: TemplateMedia;
  title: string;
  body: string;
  is_active: boolean;
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
  status: "success" | "error";
  error_message?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
