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

<!-- october:canvas-guide:start -->
# Working in this app (built with October)

This project is built inside **October**, a spatial canvas where each app **screen/route shows up as its own node**. October discovers screens by scanning the route files on disk, so how you structure routes is exactly what the user sees on the canvas.

## One screen = one route file

Give every screen its own route and its own component file, and register each route in the app's router. Use flat, lowercase, hyphenated route paths (e.g. `/sign-up`).

## When the user asks for a flow or multiple screens

Onboarding, a wizard, "a few screens", steps, a set of screens — **create one separate route file per screen.** Never put multiple screens inside a single component: no internal step/pager/carousel state standing in for separate screens, and no extra screen components exported from one file. One screen = one file = one route, so each shows up as its own node on the canvas.

## Dependencies

When you import a new package, add it to `package.json` in the same change (for Expo / React Native, run `npx expo install <pkg>` so it picks a compatible version and writes `package.json` for you). Anything missing from `package.json` disappears on a clean install and crashes the app.

## Working with other agents

If you're connected to October's bus (the october-bus MCP tools), you can bring on helper agents. Use `add_terminal` or `add_chat` without a target to share the current workspace's files; `checkoutId` or `joinTaskOf` selects an existing working location. Use `createWorkspace:{requestId,name,isolated:true}` for independent work in a separate workspace. Keep requestId stable on retry. Creation returns the child workspace, canvas and node references. Use `list_children`, `message_child`, `get_child_status` and `stop_child` for your children across workspaces; they reply with `message_parent`. Same-workspace agents retain ordinary connections and `message_peer`.
<!-- october:canvas-guide:end -->
