-- =============================================================================
-- Psi — add attendance_status to sessions for the Fechamento Mensal feature
-- =============================================================================

-- Enum shared by sessions.attendance_status and appointment_log.previous/new_value
CREATE TYPE public.attendance_status AS ENUM ('presente', 'faltou');

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS attendance_status       public.attendance_status,
  ADD COLUMN IF NOT EXISTS attendance_updated_at   TIMESTAMPTZ;

-- Covers the main monthly listing: sessions by therapist within a date range
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_scheduled
  ON public.sessions (therapist_id, scheduled_at);

-- Partial index for the pending-count badge query (hot path, small result set)
CREATE INDEX IF NOT EXISTS idx_sessions_attendance_pending
  ON public.sessions (therapist_id, scheduled_at)
  WHERE attendance_status IS NULL AND status != 'cancelled';
