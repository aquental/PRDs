-- =============================================================================
-- Psi — ai_usage_logs: enforce clinic_id and model NOT NULL
-- =============================================================================
-- Every AI call belongs to a clinic context. Zero NULL rows confirmed.
-- model is required for priceFromUsage() cost attribution; a NULL model
-- silently produces a zero-cost log and breaks aggregation dashboards.
-- =============================================================================

ALTER TABLE public.ai_usage_logs
  ALTER COLUMN clinic_id SET NOT NULL,
  ALTER COLUMN model     SET NOT NULL;
