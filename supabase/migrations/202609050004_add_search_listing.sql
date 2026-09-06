-- Whether a public profile may be listed in sitemap.xml for search engines.
--
-- Separate from `is_public` on purpose. Public means "anyone holding the link can open
-- this". Listed means "put it in a machine-readable index of every profile on Sia" —
-- which, now that profiles carry phone numbers and email addresses, is a different and
-- larger decision. It defaults to false, so nobody is enumerated by accident.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS list_in_search boolean NOT NULL DEFAULT false;

-- The sitemap reads exactly this set: listed, public, and not deleted.
CREATE INDEX IF NOT EXISTS profiles_listed_idx
  ON public.profiles (username)
  WHERE list_in_search = true AND is_public = true AND deleted_at IS NULL;
