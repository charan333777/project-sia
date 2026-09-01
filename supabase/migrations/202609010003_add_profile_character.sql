ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_character text NOT NULL DEFAULT 'elephant';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_character_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_character_check
  CHECK (profile_character IN ('puppy', 'elephant', 'panda', 'play'));
