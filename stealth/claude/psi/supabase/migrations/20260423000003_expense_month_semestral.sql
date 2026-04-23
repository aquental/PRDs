-- Add semestral (biannual) frequency and month field to expenses
ALTER TYPE expense_frequency ADD VALUE IF NOT EXISTS 'semestral';

-- month: 0 = todos os meses (weekly/biweekly/monthly), 1-12 = mês específico (quarterly/semestral/annual)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS month SMALLINT NOT NULL DEFAULT 0;
