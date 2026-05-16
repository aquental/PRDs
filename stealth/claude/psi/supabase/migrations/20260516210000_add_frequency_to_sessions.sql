-- Extend schedule_frequency enum with new recurrence types
ALTER TYPE schedule_frequency ADD VALUE IF NOT EXISTS 'monthly';
ALTER TYPE schedule_frequency ADD VALUE IF NOT EXISTS 'detached';

-- Add frequency column to sessions (inherits the per-session recurrence type)
ALTER TABLE public.sessions
  ADD COLUMN frequency schedule_frequency NOT NULL DEFAULT 'weekly';
