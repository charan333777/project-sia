ALTER TABLE public.profiles
  ALTER COLUMN profile_character SET DEFAULT 'plain';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_character_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_character_check
  CHECK (profile_character IN ('plain', 'puppy', 'elephant', 'panda', 'play'));
