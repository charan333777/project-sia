ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_theme text NOT NULL DEFAULT 'calm';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_theme_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_theme_check
  CHECK (profile_theme IN ('calm', 'warm', 'bold', 'play'));
