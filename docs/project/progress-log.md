# Progress log

What has shipped, newest first. One entry per meaningful change: what it was, why it mattered, and
where it lives. Entries below the 2026-09-04 line were reconstructed from git history.

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
