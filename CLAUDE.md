# Sia — working notes for Claude

Sia makes the first moment between two strangers easier. Someone creates a lightweight, current
profile, shares its QR code, and another person understands who they are and what they are open to
in a few seconds.

**Read [`docs/project/overview.md`](docs/project/overview.md) first.** It is the current state of the
product — what is live, what each feature area does, and which rules must not be broken. Read it
instead of sweeping the codebase. [`docs/project/roadmap.md`](docs/project/roadmap.md) holds what is
planned; [`docs/project/progress-log.md`](docs/project/progress-log.md) holds what has shipped.

## Workspaces

pnpm monorepo, Node 20+, TypeScript everywhere.

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 15 App Router, React 19. No CSS framework — all styles live in `app/globals.css`. |
| `apps/api` | Fastify 5 REST API, ESM. The only thing that talks to PostgreSQL. |
| `packages/validation` | Zod schemas and profile/Nearby types. Source of truth for both web and API. |
| `packages/shared` | API response envelope types and `PROFILE_DRAFT_KEY`. |
| `supabase/migrations` | Versioned PostgreSQL schema, applied with `supabase db push`. |

## Commands

```bash
pnpm dev          # web on :3000, API on :4000 (builds workspace packages first)
pnpm test         # validation + API route tests, no Supabase credentials needed
pnpm typecheck
pnpm build
```

The root `package.json` scripts already build `@sia/validation` and `@sia/shared` before the apps —
keep that ordering when adding scripts, or the apps will compile against stale `dist/`.

## Git

**Never run `git commit`, `git push`, `git merge`, or open a PR.** Charan lands every change
himself. Finish the work, run the tests, and leave it in the working tree — then report what
changed and where. A plan that mentions pushing later is not authorisation to commit now. Do not
create branches pre-emptively either.

## Conventions

- Validation lives in `@sia/validation` and is shared. Never redefine a schema inside an app.
- API and database fields are `snake_case`; repository internals use `camelCase` and map at the edge.
- The browser talks to Supabase **only** for authentication. All profile and Nearby data goes through
  the Fastify API, which derives `user_id` from the verified token — request bodies never carry it.
- The service role key is server-only. It must never reach a `NEXT_PUBLIC_*` variable.
- A schema change means a new timestamped file in `supabase/migrations/`. Existing migrations are not
  edited.
- Provider-specific code stays behind the `AuthProvider`, `ProfileRepository` and `NearbyRepository`
  interfaces. Routes and services do not import vendor SDKs.

## Reference docs

[API](docs/api/v1.md) · [system architecture](docs/architecture/system.md) ·
[backend architecture](docs/architecture/backend.md) · [database schema](docs/database/schema.md) ·
[local development](docs/development/local-development.md) · [design](docs/design/)

## Keeping these docs alive

After shipping a change, in the same pass: update the affected row and any stage detail in
`docs/project/overview.md`, and append a dated entry to `docs/project/progress-log.md`. Keep the docs
pointing at code rather than copying it — copied API tables and column lists are what go stale.
