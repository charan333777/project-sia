-- Account deletion with a 30-day grace period.
--
-- `deleted_at` marks a profile as gone. Every read filters on it, so from the outside the
-- profile disappears the moment it is set: the public page 404s and the QR stops resolving.
-- The row survives for 30 days so a misclick is recoverable, then a sweep purges it.
--
-- Reads filter for themselves rather than relying on the sweep, exactly as Nearby's
-- expiring data does — an unswept row must never be served.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- The sweep looks only at rows that are actually pending purge.
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- The existing public-username index assumed every public row was live.
DROP INDEX IF EXISTS profiles_public_username_idx;
CREATE INDEX IF NOT EXISTS profiles_public_username_idx
  ON public.profiles (username)
  WHERE is_public = true AND deleted_at IS NULL;

-- A username is retired permanently once its profile is purged.
--
-- Printed QR codes and cards outlive accounts. If `siaqr.com/u/charan` were handed to
-- somebody new, every card already in circulation would start pointing at a stranger —
-- so a released name is never reissued.
CREATE TABLE IF NOT EXISTS public.retired_usernames (
  username varchar(30) PRIMARY KEY,
  retired_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.retired_usernames ENABLE ROW LEVEL SECURITY;

-- As everywhere else, the Fastify API owns access through the server-only service role;
-- no browser-facing policies are created.
