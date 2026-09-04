# Sia — project overview

The single place to understand what Sia is and where it stands. Read this before opening source
files. Last verified: 2026-09-04.

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

The draft lives in `sessionStorage` (and IndexedDB for a chosen photo) until authentication. No
anonymous database row is ever created.

## Current stage — V1 is shipped and live

| Piece | Where | State |
| --- | --- | --- |
| Web app | https://siaqr.com (Vercel) | Live, returns 200 |
| API | https://project-sia-w8sz.onrender.com/api/v1 (Render) | Live, `/health` returns `{"data":{"status":"ok"}}` |
| Database + Auth + Storage | Supabase project `jnsdualsptqeajfreqhy` | PostgreSQL + PostGIS, email/password auth, private `profile-photos` bucket |
| CI | `.github/workflows/ci.yml` | `pnpm test`, `typecheck`, `build` on every push and PR |
| Repo | `github.com/charan333777/project-sia`, single `main` branch | — |

The URLs and the Supabase project ref above are already public in the deployed browser bundle. No
secrets are recorded here or anywhere in the repo.

## Feature areas

| Area | State | Primary source |
| --- | --- | --- |
| Profile create / edit / public view | Done | `apps/api/src/services/profile-service.ts`, `apps/web/components/profile-form.tsx`, `apps/web/app/u/[username]/page.tsx` |
| Profile status | Built, not yet deployed — four states (`open`/`around`/`focused`/`off`) with a server-derived expiry | `apps/api/src/services/profile-service.ts`, `apps/web/components/profile-status-picker.tsx`, `apps/web/components/profile-status-panel.tsx` |
| Authentication | Done — Supabase email/password, sign-up, login, password reset | `apps/web/components/auth-provider.tsx`, `apps/api/src/auth/supabase-auth-provider.ts` |
| Pre-auth draft handoff | Done — profile in `sessionStorage`, photo in IndexedDB, written after the session exists | `apps/web/lib/profile-photo-draft.ts`, `apps/web/app/login/page.tsx` |
| QR code + poster export | Done — generated on demand from the canonical URL, never stored; downloadable SVG poster | `apps/web/app/profile/qr/page.tsx`, `apps/web/components/qr-viewer.tsx` |
| Personalisation | Done — 4 themes (calm/warm/bold/play), 5 characters (plain/puppy/elephant/panda/play) | `apps/web/components/profile-themes.ts`, `apps/web/components/profile-characters.ts`, `apps/web/public/mascots/` |
| Profile photos | Done — private bucket, file-signature check, EXIF/XMP/IPTC stripped server-side, 1-hour signed URLs | `apps/api/src/services/profile-photo-storage.ts` |
| Nearby | Done — opt-in presence, 200 m PostGIS search, preset Waves, 2-hour connections, Meet Cards, blocks, reports | `apps/api/src/services/nearby-service.ts`, `apps/api/src/repositories/postgres-nearby-repository.ts`, `apps/web/components/nearby-experience.tsx` |
| SEO / discoverability | Done — metadata, OG images, sitemap, robots, web manifest, JSON-LD (Organization, WebSite, SoftwareApplication, FAQPage, ProfilePage) | `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/sitemap.ts`, `apps/web/lib/site.ts` |

## How Nearby works

Opt-in and hidden by default. The browser sends precise coordinates only to the authenticated API.
PostGIS runs a 200 m search and the response contains only:

- a **distance band** — under 50 m, 50–100 m, or 100–200 m,
- a **bearing sector** — one of eight 45° sectors,
- a shared-interest count and the person's public summary fields.

A Wave carries one of six preset intentions. Acceptance creates a two-hour mutual connection, which
can hold one Meet Card: a time within the next two hours plus a public-place label, followed by
preset coordination statuses (`coming`, `here`, `five_minutes`, …). The web client watches position
and refreshes presence roughly every 45 seconds while visible, and polls the snapshot every 8
seconds.

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
Helmet, CORS pinned to `WEB_ORIGIN`, and per-route rate limits are applied in `app.ts`.

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
- `/nearby` is `noindex`; public profiles at `/u/:username` are indexable.
- The service role key never reaches the browser.

## Known gaps and loose ends

Facts, not recommendations:

- No web-side component tests — `@sia/web`'s test script is `vitest run --passWithNoTests`. Coverage
  today is validation schemas plus API route tests against fake providers.
- Root `CHANGELOG.md` still describes 1.0.0 only; it predates themes, characters, photos, Nearby and
  the SEO pass.
- Empty leftover route folders: `apps/web/app/nearby-qa/` and `apps/web/app/qr-personality-demo/`.
- `apps/web/app/sitemap.ts` lists only `/` and `/create` — public profiles are not enumerated.
- No account deletion or data export flow.
- `nearby_reports` has no admin or moderation surface; rows accumulate unread.
- V1 deliberately has no map tiles, exact pins, permanent inbox, feed, friends/followers, push
  notifications, payments, AI, or admin dashboard.

## Keeping this document current

When something ships, update the affected row in **Feature areas**, any changed detail in **Current
stage**, and append to [`progress-log.md`](progress-log.md). Link to code rather than copying it —
copied endpoint lists and column tables are the parts that rot.
