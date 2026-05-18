/**
 * Fixtures realistas para desenvolvimento da aba Operacional.
 * Baseados nos exemplos numéricos do spec: R$180/sessão, repasse fixo=30 + 40%.
 */
import type {
  CancellationPolicy,
  DuePayment,
  MonthClosure,
  OperationalSession,
  RepasseConfig,
} from "$lib/core/types";

export const MOCK_CANCELLATION_POLICY: CancellationPolicy = {
  windowHours: 24,
};

export const MOCK_REPASSE_CONFIG: RepasseConfig = {
  fixo: 30,
  percentual: 40,
};

const today = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const monthYear = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

export const MOCK_TODAY_SESSIONS: OperationalSession[] = [
  {
    id: "sess-001",
    patientId: "pat-001",
    patientName: "Ana Silva",
    scheduledAt: `${todayStr}T09:00:00-03:00`,
    durationMinutes: 50,
    fee: 180,
    status: "scheduled",
    cancelledAt: null,
    paid: false,
  },
  {
    id: "sess-002",
    patientId: "pat-002",
    patientName: "Bruno Costa",
    scheduledAt: `${todayStr}T10:00:00-03:00`,
    durationMinutes: 50,
    fee: 180,
    status: "completed",
    cancelledAt: null,
    paid: true,
  },
  {
    id: "sess-003",
    patientId: "pat-003",
    patientName: "Carla Mendes",
    scheduledAt: `${todayStr}T11:00:00-03:00`,
    durationMinutes: 50,
    fee: 180,
    status: "scheduled",
    cancelledAt: null,
    paid: false,
  },
  {
    id: "sess-004",
    patientId: "pat-004",
    patientName: "Diego Rocha",
    scheduledAt: `${todayStr}T14:00:00-03:00`,
    durationMinutes: 50,
    fee: 200,
    status: "no_show",
    cancelledAt: null,
    paid: false,
  },
  {
    id: "sess-005",
    patientId: "pat-005",
    patientName: "Eva Pinto",
    scheduledAt: `${todayStr}T15:00:00-03:00`,
    durationMinutes: 50,
    fee: 180,
    status: "scheduled",
    cancelledAt: null,
    paid: false,
  },
];

export const MOCK_DUE_PAYMENTS: DuePayment[] = [
  {
    id: "pay-001",
    description: "Aluguel da sala",
    amount: 1200,
    dueDate: new Date(today.getFullYear(), today.getMonth(), 5)
      .toISOString()
      .slice(0, 10),
    paid: false,
  },
  {
    id: "pay-002",
    description: "Internet",
    amount: 120,
    dueDate: todayStr,
    paid: false,
  },
  {
    id: "pay-003",
    description: "Plataforma de agendamento",
    amount: 59.9,
    dueDate: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 3,
    )
      .toISOString()
      .slice(0, 10),
    paid: false,
  },
  {
    id: "pay-004",
    description: "Supervisão",
    amount: 350,
    dueDate: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 5,
    )
      .toISOString()
      .slice(0, 10),
    paid: false,
  },
];

export const MOCK_MONTH_CLOSURE: MonthClosure = {
  id: "mc-001",
  clinicId: "clinic-001",
  therapistId: "therapist-001",
  monthYear,
  status: "open",
  log: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
