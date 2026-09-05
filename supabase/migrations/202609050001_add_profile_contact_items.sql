-- Contact card: the links, email and phone a scanner may be shown.
--
-- Stored as one jsonb array rather than a column per contact type, so adding a new
-- kind of detail later is a validation change and not another migration.
--
-- Every item carries its own `is_public`. Storing a detail and showing it are separate
-- decisions: the API filters this array before a public profile leaves the server, so a
-- hidden detail is absent from the response rather than merely unrendered.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Shape and size are enforced authoritatively in `@sia/validation`; this constraint is
-- the backstop that keeps a malformed or unbounded array out of the table.
DO $profile_contact_items$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_items_shape'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT contact_items_shape CHECK (
        jsonb_typeof(contact_items) = 'array' AND jsonb_array_length(contact_items) <= 8
      );
  END IF;
END
$profile_contact_items$;
