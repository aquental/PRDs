-- Migrate existing rows before removing enum values
UPDATE templates SET category = 'outro' WHERE category IN ('anamnese', 'consentimento');

-- Recreate enum without removed values
CREATE TYPE template_category_new AS ENUM ('evolucao', 'relatorio', 'outro');

ALTER TABLE templates
  ALTER COLUMN category TYPE template_category_new
  USING category::text::template_category_new;

DROP TYPE template_category;
ALTER TYPE template_category_new RENAME TO template_category;
