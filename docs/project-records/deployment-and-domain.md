# Production deployment and domain

**Status:** Implemented and live

**Last verified:** 2026-09-04

## Purpose and user outcome

This record explains how Sia reaches production, which provider owns each part, how `siaqr.com` is
routed, and which settings must agree across providers. Most of this configuration lives in hosted
dashboards rather than Git, so recording the boundaries is essential for safe maintenance.

## Production topology

```text
User
└── https://siaqr.com
    └── GoDaddy DNS
        └── Vercel — Next.js web application
            ├── Supabase Auth — browser sign-up/login/session
            └── Render — Fastify API
                ├── Supabase Auth — server-side token verification
                ├── Supabase PostgreSQL/PostGIS — application data
                └── Supabase Storage — private profile photos

GitHub repository
├── GitHub Actions — test, type-check and build
├── Vercel Git integration — web deployment
└── Render Git integration — API Docker deployment

GoDaddy DNS
└── auth.siaqr.com records — authenticate Resend email delivery
```

## Service ownership

| Service | Responsibility | Current production identity |
| --- | --- | --- |
| GoDaddy | DNS authority for the Sia domain | `siaqr.com` |
| Vercel | Builds and hosts the Next.js application | `https://siaqr.com` |
| Render | Builds and runs the Fastify API container | `https://project-sia-w8sz.onrender.com/api/v1` |
| Supabase | Auth, PostgreSQL/PostGIS and private Storage | Project reference recorded in [`docs/project/overview.md`](../project/overview.md) |
| Resend | Delivers Supabase authentication email | `auth.siaqr.com` sending subdomain |
| GitHub Actions | Verifies pushes and pull requests | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |

Provider dashboards are the source of truth for live environment values and account ownership. This
record intentionally contains no credentials.

## Canonical domain decision

The root domain is canonical:

```text
https://siaqr.com       Primary website origin
https://www.siaqr.com   Redirects to https://siaqr.com
```

This direction matters because the API allows one exact browser origin through CORS. During setup,
`siaqr.com` initially redirected to `www.siaqr.com`, while the API allowed the root origin. The
Vercel redirect direction was reversed so the address in the browser matches `WEB_ORIGIN`.

The final domain check recorded:

- `siaqr.com` loaded through HTTPS.
- `www.siaqr.com` redirected to `siaqr.com`.
- GoDaddy DNS resolved to Vercel.
- Main web routes responded successfully.
- The Render health endpoint responded successfully.
- The API CORS preflight allowed `https://siaqr.com`, including authentication headers.

## Vercel web deployment

| Setting | Value or rule |
| --- | --- |
| Application | [`apps/web`](../../apps/web) |
| Framework | Next.js |
| Production domain | `siaqr.com` |
| Build dependency | `apps/web` must build `@sia/shared` and `@sia/validation` first |

The first Vercel build failed because it built only the web workspace while the two internal
packages had no generated `dist` output. The durable fix is the `prebuild` script in
[`apps/web/package.json`](../../apps/web/package.json), which builds both workspace dependencies
before `next build`. Do not remove it unless package exports/build handling is redesigned.

Required Vercel application variables:

| Variable | Production purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Auth project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase key |
| `NEXT_PUBLIC_API_URL` | Render API URL ending in `/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://siaqr.com` for links, QR and canonical metadata |
| Search verification values | Optional Google/Bing ownership metadata |

Changes to Vercel environment variables require a new web deployment before they appear in the
application bundle.

## Render API deployment

The API is shipped using the repository's multi-stage
[`apps/api/Dockerfile`](../../apps/api/Dockerfile).

Recorded deployment shape:

| Setting | Value or rule |
| --- | --- |
| Service type | Web Service using Docker |
| Repository root | Left at repository root |
| Dockerfile | `./apps/api/Dockerfile` |
| Docker build context | `.` |
| Health check | `/api/v1/health` |
| Host | `0.0.0.0` |
| Port | Provider-supplied/production value; setup used `10000` |

The root must remain available as Docker context because the API build needs the root lockfile and
the shared workspace packages.

Required Render variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `PROFILE_PHOTO_BUCKET`
- `WEB_ORIGIN=https://siaqr.com`
- `HOST=0.0.0.0`
- `PORT`
- `LOG_LEVEL`

The Supabase service-role key and database URL are server-only. Never copy them into Vercel
`NEXT_PUBLIC_*` settings.

## Supabase production configuration

Supabase has three runtime roles:

- Auth issues browser sessions and verifies API bearer tokens.
- PostgreSQL/PostGIS stores profiles and Nearby state.
- Private Storage holds profile photos.

The database schema is versioned in [`supabase/migrations`](../../supabase/migrations), but applying
those migrations is a separate deployment action; the current GitHub Actions workflow does not push
them automatically.

Auth URL configuration must align with the canonical domain:

```text
Site URL:       https://siaqr.com
Redirect URLs: https://siaqr.com/login
               https://siaqr.com/reset-password
```

Custom SMTP and email-template configuration are covered by
[`authentication-email.md`](./authentication-email.md).

## Deployment order

For a change that affects multiple layers:

1. Merge code only after `pnpm test`, `pnpm typecheck`, and `pnpm build` pass.
2. Apply backward-compatible database migrations before code that requires the new schema.
3. Deploy the API and confirm `/api/v1/health`.
4. Deploy the web application with the matching API URL and canonical origin.
5. Check browser CORS from `https://siaqr.com`.
6. Test the affected user journey, not only the health endpoint.
7. Update the progress log and the relevant Project Record.

## Production smoke check

At minimum, verify:

- `/`, `/create`, `/login`, `/profile`, `/profile/qr`, and `/nearby` respond as expected.
- `www` redirects to the root domain without a loop.
- `/api/v1/health` returns `{ "data": { "status": "ok" } }`.
- A protected API preflight from `https://siaqr.com` receives the correct CORS headers.
- Sign-up confirmation and password-reset links return to the correct origin.
- An authenticated profile can be created, edited and opened publicly when made public.
- A real QR scan opens the canonical public profile URL.

## Known limitations and risks

- Vercel, Render, Supabase, Resend and GoDaddy configuration is not represented as infrastructure
  as code and can drift independently of the repository.
- Database migrations are not automated in CI/CD.
- A sleeping/free API tier, if used, can create a poor first QR-scan experience; confirm the active
  Render plan before a public event.
- There is no separate custom API domain such as `api.siaqr.com`; the web app currently uses the
  Render hostname.
- There is no recorded automated production smoke test or uptime monitor.

## Implementation locations

- [`.env.example`](../../.env.example)
- [`apps/web/package.json`](../../apps/web/package.json)
- [`apps/api/Dockerfile`](../../apps/api/Dockerfile)
- [`apps/api/src/config.ts`](../../apps/api/src/config.ts)
- [`apps/api/src/server.ts`](../../apps/api/src/server.ts)
- [`apps/web/lib/api.ts`](../../apps/web/lib/api.ts)
- [`apps/web/lib/site.ts`](../../apps/web/lib/site.ts)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

## Change history

| Date | Change |
| --- | --- |
| 2026-09-04 | Created from the production deployment, Vercel build-fix and GoDaddy domain tasks plus current repository configuration. |
