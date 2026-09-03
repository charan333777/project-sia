CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- PostGIS may already be installed in `public`, `gis`, or another schema.
-- `CREATE EXTENSION IF NOT EXISTS` does not relocate an existing installation,
-- so resolve the real schema before referring to the geography type.
DO $nearby_presence$
DECLARE
  postgis_schema text;
BEGIN
  SELECT namespace.nspname
  INTO postgis_schema
  FROM pg_extension extension
  JOIN pg_namespace namespace ON namespace.oid = extension.extnamespace
  WHERE extension.extname = 'postgis';

  IF postgis_schema IS NULL THEN
    RAISE EXCEPTION 'PostGIS must be installed before creating Nearby tables';
  END IF;

  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS public.nearby_presence (
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      location %I.geography(POINT, 4326) NOT NULL,
      accuracy_m real NOT NULL CHECK (accuracy_m >= 0 AND accuracy_m <= 5000),
      duration text NOT NULL CHECK (duration IN ('15m', '60m', 'until_leave')),
      visible_until timestamptz NOT NULL,
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  $sql$, postgis_schema);
END
$nearby_presence$;

CREATE INDEX IF NOT EXISTS nearby_presence_location_idx ON public.nearby_presence USING gist (location);
CREATE INDEX IF NOT EXISTS nearby_presence_visible_until_idx ON public.nearby_presence (visible_until);

CREATE TABLE IF NOT EXISTS public.nearby_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent text NOT NULL CHECK (intent IN ('hello', 'interested', 'coffee', 'chat', 'network', 'collaborate')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (sender_user_id <> recipient_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS nearby_signals_pending_pair_idx
  ON public.nearby_signals (sender_user_id, recipient_user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS nearby_signals_recipient_idx ON public.nearby_signals (recipient_user_id, status, expires_at);

CREATE TABLE IF NOT EXISTS public.nearby_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (user_a_id < user_b_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS nearby_connections_pair_idx ON public.nearby_connections (user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS nearby_connections_active_idx ON public.nearby_connections (expires_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.nearby_meet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.nearby_connections(id) ON DELETE CASCADE,
  proposer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  place_kind text NOT NULL CHECK (place_kind IN ('main_entrance', 'reception', 'coffee_counter', 'outside', 'custom')),
  place_label varchar(60) NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS nearby_meet_plans_open_connection_idx
  ON public.nearby_meet_plans (connection_id) WHERE status IN ('proposed', 'accepted');

CREATE TABLE IF NOT EXISTS public.nearby_meet_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_plan_id uuid NOT NULL REFERENCES public.nearby_meet_plans(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code IN ('coming', 'here', 'five_minutes', 'outside', 'inside', 'cant_make_it')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nearby_meet_statuses_plan_idx ON public.nearby_meet_statuses (meet_plan_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.nearby_blocks (
  blocker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id <> blocked_user_id)
);

CREATE TABLE IF NOT EXISTS public.nearby_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('unsafe', 'harassment', 'spam', 'fake_profile', 'other')),
  details varchar(300) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_user_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS nearby_reports_review_idx ON public.nearby_reports (created_at DESC);

ALTER TABLE public.nearby_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_meet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_meet_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_reports ENABLE ROW LEVEL SECURITY;

-- Nearby is API-only. Exact geography is never exposed through browser-facing Supabase policies.
