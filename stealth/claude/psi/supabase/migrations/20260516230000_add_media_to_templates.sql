CREATE TYPE template_media AS ENUM ('whatsapp', 'email', 'print');

ALTER TABLE public.templates
  ADD COLUMN media template_media NOT NULL DEFAULT 'whatsapp';
