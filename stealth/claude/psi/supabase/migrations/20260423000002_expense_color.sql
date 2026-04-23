-- Add color column to expenses for chart identification
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS color TEXT;
