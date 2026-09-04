-- Profile status: a chosen state that expires on its own.
--
-- `current_context` stays as the optional free-text detail shown under the state.
-- Expiry is enforced on read by the API, so a stale row can never be presented as live;
-- the partial index exists so a future pruning job stays cheap.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_state text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS status_duration text,
  ADD COLUMN IF NOT EXISTS status_expires_at timestamptz;

DO $profile_status$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_state_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_state_check
      CHECK (status_state IN ('open', 'around', 'focused', 'off'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_duration_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_duration_check
      CHECK (status_duration IS NULL OR status_duration IN ('30m', '1h', '3h', '8h'));
  END IF;

  -- An active status always carries both a duration and an expiry; 'off' carries neither.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_shape_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_shape_check
      CHECK (
        (status_state = 'off' AND status_duration IS NULL AND status_expires_at IS NULL)
        OR (status_state <> 'off' AND status_duration IS NOT NULL AND status_expires_at IS NOT NULL)
      );
  END IF;
END
$profile_status$;

CREATE INDEX IF NOT EXISTS profiles_status_expires_at_idx
  ON public.profiles (status_expires_at)
  WHERE status_state <> 'off';
