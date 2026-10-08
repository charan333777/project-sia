# Sia — project overview

The single place to understand what Sia is and where it stands. Read this before opening source
files. Last reviewed locally: 2026-09-30. The changes below marked pending deployment are in the working tree; production has not been changed.

## What Sia is

Sia gives someone a lightweight, current digital profile and a personal QR code, so a stranger can
understand who they are and what they are open to in a few seconds — no app to install on either
side.

The V1 product loop:

```text
Homepage → build a profile draft (no account yet) → sign up → API saves the draft
    → owner profile + QR code → public /u/:username → "create your own" CTA
    → opt-in Nearby → mutual Wave → temporary Meet Card
```

Unfinished signed-out progress lives in a separate, versioned `sessionStorage` record, with a
draft-specific IndexedDB photo key. Step history survives Back/Forward and refresh. Only a submitted
draft enters the authentication handoff record. No anonymous database row is ever created.

## Current stage — V1 is shipped and live

| Piece | Where | State |
| --- | --- | --- |
| Web app | https://siaqr.com (Vercel) | Live, returns 200 |
| API | https://project-sia-1.onrender.com/api/v1 (Render, paid instance) | Live, `/health` returns `{"data":{"status":"ok"}}`; ~150–200 ms warm |
| Database + Auth + Storage | Supabase project `jnsdualsptqeajfreqhy` | PostgreSQL + PostGIS, email/password auth, private `profile-photos` bucket |
| CI | `.github/workflows/ci.yml` | `pnpm test`, `typecheck`, `build` on every push and PR |
| Repo | `github.com/charan333777/project-sia`, single `main` branch | — |

The URLs and the Supabase project ref above are already public in the deployed browser bundle. No
secrets are recorded here or anywhere in the repo.

## Feature areas

| Area | State | Primary source |
| --- | --- | --- |
| Profile create / edit / public view | Done — three stages (You, Your moment, Review), with optional appearance, interests, contacts and theme. Private is preselected; debounced username availability checks give early feedback. Public cards offer a conversation prompt and save-name/link contact even without published details. Pending deployment | `apps/api/src/services/profile-service.ts`, `apps/web/components/profile-form.tsx`, `apps/web/components/profile-preview-strip.tsx`, `apps/web/app/profile/page.tsx`, `apps/web/app/u/[username]/page.tsx` |
| Profile status | Done, live (seen on siaqr.com 2026-09-22) — four states (`open`/`around`/`focused`/`off`) with a server-derived expiry. While nothing is showing, the owner page offers **Open for 3h** in one tap (not yet deployed) | `apps/api/src/services/profile-service.ts`, `apps/web/components/profile-status-picker.tsx`, `apps/web/components/profile-status-panel.tsx`, `apps/web/components/profile-status-nudge.tsx` |
| Authentication | Done — Supabase email/password, sign-up, login, password reset | `apps/web/components/auth-provider.tsx`, `apps/api/src/auth/supabase-auth-provider.ts` |
| Pre-auth draft handoff | Done — separate unfinished progress and completed authentication handoff; refresh, step history, explicit discard and photo recovery. Signed-in drafts are never persisted for login replay. Pending deployment | `apps/web/lib/profile-photo-draft.ts`, `apps/web/lib/profile-handoff.ts`, `apps/web/app/login/page.tsx`, `apps/web/app/create/page.tsx` |
| QR code + poster export | Done — canonical black-on-white QR and SVG poster; status/context, home-screen tip and optional expiring event presets. A private profile offers one-tap "Make my QR scannable" instead of dead-ending at Edit. Custom presets are device-local and owner-scoped; applying one never enables Nearby. Pending deployment | `apps/web/app/profile/qr/page.tsx`, `apps/web/components/qr-viewer.tsx`, `apps/web/lib/qr-poster.ts`, `apps/web/components/home-screen-tip.tsx`, `apps/web/app/manifest.ts` |
| Account deletion | Done — 30-day soft delete, hidden immediately, username retired permanently on purge | `apps/api/src/services/profile-service.ts`, `apps/web/components/delete-account.tsx`, `apps/web/app/profile/deleted/page.tsx` |
| Scan counts | Done — per-day integer per profile, counted from the browser so crawlers do not inflate it; the owner's own `?preview=1` is not counted (not yet deployed) | `apps/web/components/profile-view-counter.tsx`, `apps/web/components/profile-views.tsx` |
| Terms & privacy | Pages exist; controller/address/contact/law now use server environment configuration. Contact route is ready. Accurate owner details remain required; pending deployment | `apps/web/app/privacy/page.tsx`, `apps/web/app/terms/page.tsx` |
| Search listing | Done — per-profile opt-in, default off; sitemap and robots indexing both follow opt-in. Robots change pending deployment | `apps/web/app/sitemap.ts` |
| Contact card | Done — private/public links, emails and phones; copy and vCard export. Saving only a name and Sia URL is supported without an account. Pending deployment | `packages/validation/src/profile.ts`, `apps/api/src/services/profile-service.ts`, `apps/web/components/contact-items-editor.tsx`, `apps/web/components/profile-contact-panel.tsx`, `apps/web/lib/vcard.ts` |
| Personalisation | Done — 4 themes; initials, 4 existing mascots and 4 new illustrated people. Static IDs/assets; no generation service. New constraint migration and API must precede web deployment | `apps/web/components/profile-themes.ts`, `apps/web/components/profile-characters.ts`, `apps/web/public/mascots/` |
| Profile photos | Done — private bucket, file-signature check, EXIF/XMP/IPTC stripped server-side, 1-hour signed URLs | `apps/api/src/services/profile-photo-storage.ts` |
| Nearby | Done — opt-in presence, 200 m discovery, preset Waves, expiring connections/Meet Cards, blocks/reports. Signed-out fictional preview, illustrated characters and empty-state QR fallback added; pending deployment | `apps/api/src/services/nearby-service.ts`, `apps/api/src/repositories/postgres-nearby-repository.ts`, `apps/web/components/nearby-experience.tsx` |
| SEO / discoverability | Done — metadata, OG, sitemap, manifest and JSON-LD. Indexing follows listing opt-in; request-local profile fetch deduplication, Frankfurt route preference and character/photo OG previews. Web security headers plus production report-only CSP added; pending deployment | `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/sitemap.ts`, `apps/web/lib/site.ts` |


## 2026-09-30 local release notes

`/demo` is an interactive fictional scanner experience linked by the homepage CTA and example QR.
The signed-out Nearby preview makes no real location or interaction requests. Mobile homepage
explanation cards now form a compact three-column row. See `apps/web/components/sample-experience.tsx` and
`apps/web/components/nearby-introduction.tsx`.

Before deployment, apply `supabase/migrations/202609300001_add_illustrated_profile_characters.sql`,
deploy the compatible API, then the web app. Configure the four `LEGAL_*` values in the web
environment before its build. The CSP is report-only; enforcement and a nonce strategy remain
follow-up work. No production database migration or deployment was performed in this pass.

## How Nearby works

Opt-in and hidden by default. The browser sends precise coordinates only to the authenticated API.
PostGIS runs a 200 m search and the response contains only:

- a **distance band** — under 50 m, 50–100 m, or 100–200 m,
- a **bearing sector** — one of eight 45° sectors,
- a shared-interest count and the person's public summary fields.

Expired presence, Waves, connections and meeting rows are swept at most once every 60 seconds
rather than on every request. Reads filter on expiry themselves, so an unswept row is never
returned; the sweep performs the erasure that backs the "location expires automatically" promise.

A Wave carries one of six preset intentions. Acceptance creates a two-hour mutual connection, which
can hold one Meet Card: a time within the next two hours plus a public-place label, followed by
preset coordination statuses (`coming`, `here`, `five_minutes`, …). The web client watches position
and refreshes presence roughly every 45 seconds while visible, and polls the snapshot every 8 seconds while something is happening, every 30 seconds on an empty
radar, and not at all while the tab is hidden.

## Architecture in one screen

```text
Next.js web app
  ├─ Supabase browser client — authentication only
  └─ REST client (apps/web/lib/api.ts)
       ↓  Authorization: Bearer <supabase access token>
Fastify routes (apps/api/src/app.ts)
  → AuthProvider verifies the token, yields the trusted user_id
  → ProfileService / NearbyService apply rules + authoritative Zod validation
  → repositories run parameterized SQL
  → PostgreSQL + PostGIS
```

Every route derives identity from the verified token; request bodies cannot assert a user. Errors go
through one handler and return `{ "error": { "code", "message" } }`; successes return `{ "data": … }`.
Helmet, CORS pinned to `WEB_ORIGIN`, and per-route rate limits are applied in `app.ts`. Rate limits
are keyed on the token subject rather than the IP, because Sia is used in rooms where everyone
shares one network.

Details: [system architecture](../architecture/system.md), [backend architecture](../architecture/backend.md),
[API reference](../api/v1.md).

## Data model at a glance

| Table | Purpose |
| --- | --- |
| `profiles` | One row per authenticated user: identity, tags, visibility, theme, character, avatar path, status state + expiry |
| `nearby_presence` | Opt-in PostGIS point, accuracy, chosen duration, expiry. GiST-indexed for the 200 m search |
| `nearby_signals` | Expiring preset-intention Waves |
| `nearby_connections` | Mutual two-hour connections, one normalized row per user pair |
| `nearby_meet_plans` | Temporary time + public-place proposals |
| `nearby_meet_statuses` | Preset coordination updates on an accepted plan |
| `nearby_blocks` | Permanent pair exclusion from discovery and interaction |
| `nearby_reports` | Moderation evidence, kept separately from temporary social data |

RLS is enabled on every table with no browser-facing policies — the API owns all access through a
server-only credential. Columns and constraints: [database schema](../database/schema.md).

## Rules that are easy to break

- Profiles are **private by default**. `is_public` defaults to false in the database.
- A **status expires on its own**. The API derives `status_expires_at` from the chosen duration and
  resolves it against the clock on every read, so an elapsed status is never presented as live and a
  client can never assert its own expiry.
- One authenticated user owns exactly **one** profile (`PROFILE_EXISTS` on a second attempt).
- The API **never** returns latitude, longitude, raw distance, or an exact bearing — only bands and
  sectors.
- Nearby has **no free-form chat**. Only validated preset intentions, a short place label, and preset
  statuses are accepted.
- Nearby presence, Waves, connections and meeting data **expire and are pruned**. Blocks and reports
  are retained for safety.
- Profile photos stay in a **private** bucket, reached only through short-lived signed URLs issued
  after the same access checks used for profile data. Metadata is stripped before storage.
- The QR code stays a conventional high-contrast black-on-white code with a clean quiet zone;
  mascots and colour are decoration outside the panel only — see
  [the QR prototype decision](../design/sia-elephant-qr-final-prototype.md).
- `/nearby` and `/demo` are `noindex`; only public profiles with `list_in_search: true` are indexable.
- **No `loading.tsx` above `/u/[username]`.** A Suspense boundary there sends the 200 before
  `notFound()` runs, so a missing profile answers 200 again. `app/loading.tsx` was removed for this;
  `/u/[username]` is the only page that loads data on the server.
- The manifest's `start_url` is `/profile/qr`, so its **`scope` must stay `/`** — left out, it defaults
  to `/profile/` and the rest of Sia opens outside the installed app.
- A contact detail is **stored and published separately**. `is_public` defaults to false on every
  entry, and `getPublic` strips hidden ones before the profile leaves the API — so a hidden phone
  number is absent from the response, not merely unrendered. Anything built on a public profile
  (the card, the OG image, the JSON-LD, the vCard) inherits that filter by construction.
- Contact links are **`http`/`https` only**, enforced by a protocol allowlist in `@sia/validation`
  rather than a pattern, and rendered with `rel="noopener noreferrer nofollow"`.
- A deleted profile is **hidden by the read, erased by the sweep**. Every read filters `deleted_at`,
  so a row awaiting purge is never served; the 30-day sweep performs the erasure. A **retired
  username is never reissued** — printed cards outlive accounts, and a reused name would point
  strangers at someone else.
- A draft is written **only while signed out**. It exists to survive the trip through
  authentication, so a copy written while already signed in is one `/login` replays on every later
  visit. A hand-off failure is classified by status in `apps/web/lib/profile-handoff.ts`: a 4xx is
  terminal, 408/429/5xx keeps the draft for a real retry, and a 401 earns exactly one silent token
  refresh. A terminal draft is never replayed: `/login` sends it to `/create?resume=username|details`,
  which lifts it out of storage into the form. `PROFILE_EXISTS` is the exception — the existing Sia,
  photo included, is left untouched and the draft is dropped. Retrying a draft that can never
  succeed is what makes an error permanent.
- `/login?next=` accepts **same-site paths only** (`apps/web/lib/next-path.ts`), and keeps the
  destination in sessionStorage across the Google round trip, because OAuth returns to a bare `/login`.
- Scan counts hold **an integer and a date, per profile**. There is nowhere in the schema to record a
  visitor, and counting happens in the browser so crawlers and link previews stay out of the number.
- **Listed is not the same as public.** `list_in_search` is a separate opt-in, default false; only
  opted-in profiles enter `sitemap.xml` and receive indexable robots metadata.
- The web API client must not send `Content-Type: application/json` on a bodyless request — Fastify
  rejects it before routing. `apps/web/lib/api.test.ts` guards this.
- The service role key never reaches the browser.

## Known gaps and loose ends

Facts, not recommendations:

- Web coverage is narrow but real — `@sia/web` runs `vitest run` in jsdom over the profile form, the
  login hand-off, draft storage, keyboard controls, contact export, event presets and public indexing.
  Physical-phone sharing/contact import and a two-person live Nearby session still need release QA. Coverage elsewhere is validation schemas plus API route tests against fake
  providers.
- Root `CHANGELOG.md` still describes 1.0.0 only; it predates themes, characters, photos, Nearby and
  the SEO pass.
- Empty leftover route folders: `apps/web/app/nearby-qa/` and `apps/web/app/qr-personality-demo/`.
- No data export flow. Deletion exists; export on request is described in the privacy policy but not
  automated.
- The four `LEGAL_*` server environment values are not yet supplied. Legal pages retain an honest
  incomplete-details warning, and `/contact` cannot send email until the contact address is configured.
- `nearby_reports` has no admin or moderation surface; rows accumulate unread.
- V1 deliberately has no map tiles, exact pins, permanent inbox, feed, friends/followers, push
  notifications, payments, AI, or admin dashboard.

## Keeping this document current

When something ships, update the affected row in **Feature areas**, any changed detail in **Current
stage**, and append to [`progress-log.md`](progress-log.md). Link to code rather than copying it —
copied endpoint lists and column tables are the parts that rot.
