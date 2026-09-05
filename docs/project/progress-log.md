# Progress log

What has shipped, newest first. One entry per meaningful change: what it was, why it mattered, and
where it lives. Entries below the 2026-09-04 line were reconstructed from git history.

## 2026-09-05 — The contact card

A scanned Sia now answers "how do I reach this person?". A profile carries up to eight contact
details — links, emails and phone numbers — and the public card renders them under **Reach me**,
each with a copy button, plus **Save contact**, which builds a vCard in the browser so the scanner
can drop the person straight into their phone. That makes the QR useful outside an event: at a
conference, while travelling, or any time the card is shown instead of a number being dictated.

**Storing a detail and publishing it are separate decisions.** Every entry carries its own
`is_public`, defaulting to false, so adding a phone number never publishes it as a side effect. The
filter is applied server-side in `ProfileService.presentPublic`, the sole caller being `getPublic`
— the one public read path. A hidden detail is therefore absent from the API response rather than
present-but-unrendered, which is what keeps it out of the page source, the JSON payload, the Open
Graph image and the downloaded vCard alike. `ProfileCard` filters a second time so the builder
preview shows the owner exactly what a scanner would see.

Links are normalised to absolute URLs and restricted to `http`/`https` by a protocol allowlist
rather than a pattern, so no encoding of `javascript:` or `data:` gets through. Embedded credentials
are stripped, because `https://linkedin.com@evil.example` reads as a trusted host to someone who
just scanned a code in person. Rendered links carry `rel="noopener noreferrer nofollow"`. Published
links also populate `sameAs` in the existing `ProfilePage` JSON-LD.

Stored as one jsonb array rather than a column per contact type, so supporting a new kind of detail
later is a validation change instead of another migration.

Migration `202609050001_add_profile_contact_items.sql`, `packages/validation/src/profile.ts`,
`apps/api/src/services/profile-service.ts`, `apps/web/components/contact-items-editor.tsx`,
`apps/web/components/profile-contact-panel.tsx`, `apps/web/lib/vcard.ts`.

Not built: a third "visible to signed-in scanners only" tier. Deliberate — it is the right answer
for a phone number eventually, but it doubles the states to explain and test, and binary
public/hidden is the honest first version.

## 2026-09-05 — The QR page leads with the code

The owner's QR page rendered the whole "Make it yours" panel permanently between the card and the
actions. The personalisation controls were taller than the QR itself and pushed Full screen, Share
and Save below the fold, so the page opened on pickers rather than on the thing it exists to show.

The panel is now collapsed behind a fourth toolbox action, **Style**, and expands in place beneath
it. Expanding scrolls it just into view; collapsing is the default on every visit. Character and
colour mood are unchanged and still save immediately against the card above them, which is why the
panel stays on this route instead of moving to `/profile/edit` — the live preview is the point.

The toolbox went from three columns to four `minmax(0, 1fr)` ones, stacked icon-over-label at every
width and dropping to 2x2 below 380px. `minmax(0, ...)` rather than plain `1fr` because a single
long label would otherwise widen its own column and leave the row uneven.

Public profiles at `/u/:username` never rendered this panel and are untouched.

`apps/web/app/profile/qr/page.tsx`, `apps/web/app/globals.css`.

## 2026-09-03 — Search and social discoverability

Full SEO pass so a shared Sia link previews well and the site can be indexed. Added canonical
metadata, Open Graph images for the homepage and each public profile, `robots.txt`, `sitemap.xml`,
a web manifest, and JSON-LD (Organization, WebSite, SoftwareApplication, FAQPage, ProfilePage).
`/nearby` is explicitly `noindex`. Introduced `apps/web/lib/site.ts` as the single source for the
canonical origin, plus optional Google/Bing verification tokens.

Commit `88c3edf`.

## 2026-09-03 — Private profile photos

Customers can put a real photo on their profile and QR card. Uploads go through the API as
`multipart/form-data`, are validated by file signature (not by the client's content type), stripped
of EXIF/XMP/IPTC metadata — GPS included — and stored in a **private** Supabase Storage bucket.
Profiles receive one-hour signed URLs only after the same access checks used for profile data.
A photo chosen before sign-up is held in IndexedDB and uploaded once the session exists.

`apps/api/src/services/profile-photo-storage.ts`, `apps/web/components/profile-photo-picker.tsx`,
`apps/web/lib/profile-photo-draft.ts`, migration `202609030001_add_profile_photos.sql`. Commit `23dbff3`.

## 2026-09-02 — Nearby backend

The privacy-first meeting loop, end to end. PostGIS presence with a 200 m GiST-indexed search;
responses carry only a distance band and one of eight bearing sectors, never coordinates. Preset
intention Waves requiring mutual acceptance, two-hour connections, Meet Cards with a public-place
label and preset coordination statuses, plus blocks and reports. Presence, Waves, connections and
plans expire and are pruned; blocks and reports are retained.

`apps/api/src/services/nearby-service.ts`, `apps/api/src/repositories/postgres-nearby-repository.ts`,
`packages/validation/src/nearby.ts`, migration `202609010005_add_nearby.sql`. Commit `6cf63f1`.

## 2026-09-01 — Profile personality and QR poster

Made a Sia feel like its owner: four colour themes, five characters with soft-3D mascot art, and a
redesigned QR page that exports a shareable SVG poster. The QR itself stayed a conventional
high-contrast code with a clean quiet zone — mascot decoration sits outside the panel.

`apps/web/components/profile-themes.ts`, `apps/web/components/profile-characters.ts`,
`apps/web/app/profile/qr/page.tsx`, `apps/web/public/mascots/`,
[design notes](../design/sia-elephant-qr-final-prototype.md). Migrations `…0002`, `…0003`, `…0004`.
Commit `1c68f95`.

## 2026-09-04 — Nearby load and throttling fixes

Four changes found while estimating how many people can use Sia in one room at once.

**The expiry sweep left the request path.** `pruneExpired` ran a four-DELETE write transaction on
*every* Nearby poll — six sequential round trips holding a pooled connection, from every client
every 8 seconds. Every read query already filters expired rows (`visible_until > now()`,
`expires_at > now()`), so an unpruned row was never visible anyway; the sweep only performs the
physical erasure. It now runs at most once every 60 seconds across all callers, with concurrent
polls sharing one in-flight sweep and a failed sweep retried on the next request. This is the
largest single capacity change: roughly 8 snapshots/second becomes roughly 40.

**Rate limiting counts per user, not per IP.** The limiter keyed on `req.ip`, so a room sharing one
wifi — the exact situation Nearby exists for — was throttled as though it were one person, breaking
at about 14 people. It now keys on the token subject, falling back to IP when no token is present.

**Throttled requests return 429 instead of 500.** `@fastify/rate-limit` throws a plain error
carrying a status code, which the error handler did not recognise, so every throttle was answered
with `INTERNAL_ERROR`, logged as an unhandled fault, and gave the client no reason to back off.

**Nearby polls adaptively and pauses when hidden.** 8s while something is happening, 30s on an
empty radar, and nothing at all in a backgrounded tab — there was no visibility handling before.

`apps/api/src/repositories/postgres-nearby-repository.ts`, `apps/api/src/app.ts`,
`apps/web/components/nearby-experience.tsx`. Load-test harness in
`scripts/nearby-load-test.mjs` (refuses non-localhost targets without `--allow-remote`).

## 2026-09-04 — Profile status

Replaced the open-ended "Right now" text box with a chosen **state** that expires by itself:
`open`, `around`, `focused`, or `off`, each active state carrying a duration of `30m`, `1h`, `3h`
or `8h`. `current_context` is kept as the optional detail line shown under the state, so no existing
profile text was lost.

The expiry is derived on the server from the duration and re-checked on every read, which means a
status can go stale in the database but never on screen. Durations are fixed spans rather than
wall-clock targets ("today", "this evening") so expiry never depends on a timezone the API does not
know. Status is deliberately absent from `profileInputSchema` and has its own endpoints, so a
profile update cannot assert its own expiry.

Not yet wired into Nearby — presence keeps its own separate opt-in and duration for now.

`PUT`/`DELETE /api/v1/profiles/me/status`, migration `202609040001_add_profile_status.sql`,
`packages/validation/src/profile.ts`, `apps/api/src/services/profile-service.ts`,
`apps/web/components/profile-status-picker.tsx`, `apps/web/components/profile-status-panel.tsx`.

## 2026-09-01 — Nearby first pass and UI refresh

First Nearby screen and radar visual (`9b76ceb`), on top of a broad UI refresh of the homepage,
profile flow and auth screens (`c28f2c3`). Web app deployed to Vercel (`cbc98bb`).

## 2026-08-29 — V1 foundation

Homepage, creation-before-registration flow, Supabase email/password auth, owner profile, editing,
QR view and public profile. Fastify V1 REST API with token verification, authorization, validation,
a stable error envelope, CORS, security headers and rate limiting. First PostgreSQL migration,
provider interfaces, focused tests, Docker packaging and GitHub Actions.

Commits `d82def3`, `e360abe`, `1cabe7f`.
