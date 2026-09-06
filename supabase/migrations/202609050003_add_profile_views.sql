-- How many times a card was opened. A count, and nothing else.
--
-- One row per profile per UTC day holding an integer. No visitor identity, no IP, no
-- location, no device, no referrer — there is deliberately nowhere to put any of it, so
-- the schema itself is the guarantee rather than a promise in a policy.
--
-- Counted from the browser after the page loads, which is what keeps crawlers and link
-- previews (Slack, WhatsApp, search bots) out of the number: they fetch HTML but do not
-- run scripts.

CREATE TABLE IF NOT EXISTS public.profile_views (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_on date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, viewed_on),
  CONSTRAINT views_non_negative CHECK (views >= 0)
);

-- The owner's summary reads a recent window for one profile.
CREATE INDEX IF NOT EXISTS profile_views_recent_idx
  ON public.profile_views (profile_id, viewed_on DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Deleting a profile removes its counts through the cascade above, so a purged account
-- leaves no trace here either.
