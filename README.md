# Sia V1

Sia makes the first moment between two strangers easier. A user creates a lightweight, current profile, shares its QR code, and another person can understand who they are and what they are open to in a few seconds.

This repository contains the complete V1 product loop: create before registration, Supabase email/password authentication, secure profile persistence through a Fastify API, public profiles, owner editing, generated QR codes, and privacy-first Nearby meeting coordination.

## Repository

```text
apps/web                 Next.js web application
apps/api                 Fastify REST API
packages/validation      Shared Zod schemas and profile types
packages/shared          Shared API response and browser-state types
supabase/migrations      Reproducible PostgreSQL schema
docs                     Architecture, API, database and setup notes
```

## Requirements

- Node.js 20 or newer
- Corepack and pnpm 11
- A Supabase project, or the Supabase CLI for a local project
- Docker (optional, for the API container)

## Quick start

1. Enable pnpm and install dependencies.

   ```bash
   corepack enable
   pnpm install
   ```

2. Copy `.env.example` to `.env` and add your Supabase and database values. For Next.js local development, also copy the four `NEXT_PUBLIC_*` values to `apps/web/.env.local`. The API automatically reads the root `.env` (or `apps/api/.env`) during local development.

3. Apply the migration with the Supabase CLI.

   ```bash
   supabase db push
   ```

4. Start both applications.

   ```bash
   pnpm dev
   ```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:4000`. Check the API at `http://localhost:4000/api/v1/health`.

## Environment variables

Browser-visible:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public anon/publishable key.
- `NEXT_PUBLIC_API_URL`: normally `http://localhost:4000/api/v1`.
- `NEXT_PUBLIC_SITE_URL`: canonical origin used by profile links and QR codes.
- `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`: optional ownership tokens for production search-console verification.

API-only:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used to verify user tokens. Never expose this value to the browser.
- `DATABASE_URL`: PostgreSQL connection string. Use the Supabase pooler URL in hosted environments.
- `WEB_ORIGIN`: exact allowed browser origin.
- `PORT`, `HOST`, `LOG_LEVEL`: API runtime settings.

## Authentication setup

Enable email/password authentication in Supabase. Email confirmation can remain enabled; when it is, Sia keeps the unfinished profile draft in `sessionStorage` until the user confirms and logs in. For fast local iteration, confirmation may be disabled in the local Supabase Auth settings.

The browser sends the Supabase access token to Fastify. The API verifies it with Supabase and derives `user_id` from the verified identity. The browser never sends an authoritative user ID and never talks directly to PostgreSQL.

## Commands

```bash
pnpm dev          # start web and API in watch mode
pnpm build        # production builds for all workspaces
pnpm test         # focused validation and API route tests
pnpm typecheck    # TypeScript checks
```

Build and run the portable API container:

```bash
docker build -f apps/api/Dockerfile -t sia-api .
docker run --env-file .env -p 4000:4000 sia-api
```

## Nearby

Nearby is opt-in and hidden by default. The browser sends precise coordinates only to the authenticated API; PostGIS performs a 200 m search and the API returns distance bands plus a quantized direction, never raw coordinates. A Wave uses a preset intention, requires mutual acceptance, and opens a temporary Meet Card with public-place/time suggestions and preset coordination updates. Presence, Waves, connections, and meeting data expire automatically.

PostGIS is installed by the committed Nearby migration. Deployed web origins must use HTTPS for browser geolocation; `localhost` is accepted by browsers during development.

## Search launch checklist

Before deploying, set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. After the site is live, add the optional Google Search Console and Bing Webmaster Tools verification tokens, then submit `/sitemap.xml` in each service. Sia generates canonical metadata, social preview images, `robots.txt`, the sitemap and structured data automatically.

## V1 limitations

Sia V1 has no map tiles, exact public pins, permanent inbox, feed, friends, followers, push notifications, payments, AI, or admin dashboard. Customers can personalise their profile and QR card with an optional private-storage photo, colour theme, character, or simple initial; profiles are private by default, and one authenticated user can own one profile.

See [local development](docs/development/local-development.md), [system architecture](docs/architecture/system.md), and the [API reference](docs/api/v1.md) for implementation details.
