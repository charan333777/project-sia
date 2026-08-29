CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username varchar(30) UNIQUE NOT NULL,
  display_name varchar(60) NOT NULL,
  role varchar(80) NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  current_context varchar(160) NOT NULL DEFAULT '',
  interests text[] NOT NULL DEFAULT '{}',
  open_to text[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$'),
  CONSTRAINT interests_limit CHECK (cardinality(interests) <= 10),
  CONSTRAINT open_to_limit CHECK (cardinality(open_to) <= 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS profiles_public_username_idx ON public.profiles (username) WHERE is_public = true;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- The Fastify API owns data access in V1 and uses the server-only service role.
-- No browser-facing policies are created because the web app never queries this table directly.
