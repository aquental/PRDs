-- Make patients.email NOT NULL.
-- Existing rows with NULL email receive a placeholder so the constraint can be applied.
UPDATE public.patients SET email = 'sem-email@placeholder.invalid' WHERE email IS NULL;
ALTER TABLE public.patients ALTER COLUMN email SET NOT NULL;
