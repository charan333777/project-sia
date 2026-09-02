# Local development

## 1. Install tools

Use Node.js 20+ and pnpm 11 through Corepack:

```bash
corepack enable
pnpm install
```

Install the Supabase CLI if you want the complete stack locally. `supabase start` prints the project URL, anon key, service role key and PostgreSQL URL needed by the applications.

## 2. Configure Supabase

Create a Supabase project or run `supabase start`. Email/password authentication must be enabled. Local email confirmation may be disabled for a shorter create-flow feedback cycle.

Apply all committed database migrations, including the PostGIS-backed Nearby schema:

```bash
supabase db push
```

For a hosted project, link it first with `supabase link --project-ref <project-ref>`.

## 3. Configure applications

Copy `.env.example` to `.env` and fill in real values. Next.js loads its browser-safe values from `apps/web/.env.local`; the API automatically checks `apps/api/.env` and then the repository-root `.env`. Runtime environment variables still take precedence. Do not put the service role key in any `NEXT_PUBLIC_*` variable.

The canonical site URL controls the value encoded into QR codes. Keep it as `http://localhost:3000` locally and set the deployed HTTPS origin later.

Nearby geolocation works on `localhost`. A deployed environment must use HTTPS, and the web origin must be allowed to request its own geolocation permission.

## 4. Run

```bash
pnpm dev
```

Open `http://localhost:3000`. The API health endpoint is `http://localhost:4000/api/v1/health`.

The create page works without authentication and keeps the unfinished draft in the current browser tab's `sessionStorage`. A successful session triggers the authenticated API write.

## 5. Verify

```bash
pnpm test
pnpm typecheck
pnpm build
```

Tests use fake provider implementations and do not need Supabase credentials. They cover shared validation, username normalization, protected access, create/read/edit, anonymous public retrieval, duplicate username handling, public 404 behavior, Nearby privacy defaults, coordinate validation, and the authenticated presence lifecycle.

## 6. API container

From the repository root:

```bash
docker build -f apps/api/Dockerfile -t sia-api .
docker run --env-file .env -p 4000:4000 sia-api
```

The container does not assume a hosting vendor. Provide the same API environment variables on any Docker-compatible host.

## Troubleshooting

- An auth configuration message on `/login` means the two browser-safe Supabase variables are missing.
- `UNAUTHORIZED` normally means the Supabase access token is expired or belongs to a different project than the API configuration.
- `PROFILE_NOT_FOUND` on the owner route sends the user back to creation; on a public route it renders the polished not-found state.
- If a public profile is stale for a few seconds after editing, its server fetch uses a 30-second revalidation window.
- If `nearby_presence` is missing, run `supabase db push` or apply `202609010005_add_nearby.sql` in the Supabase SQL editor.
- If location permission is denied, enable location for the site in the browser and reload `/nearby`.
