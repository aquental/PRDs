-- Add weekly and biweekly (quinzenal) options to expense_frequency enum
ALTER TYPE expense_frequency ADD VALUE IF NOT EXISTS 'weekly';
ALTER TYPE expense_frequency ADD VALUE IF NOT EXISTS 'biweekly';
