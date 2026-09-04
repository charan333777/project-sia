# Testing and release process

**Status:** Implemented baseline; important coverage gaps remain

**Last verified:** 2026-09-04

## Purpose

This record explains what the project automatically verifies, what still requires a human check,
and how to release changes across the web app, API and Supabase schema without confusing a green
build with a proven production journey.

## Local verification commands

Run from the repository root:

```bash
pnpm test
pnpm typecheck
pnpm build
```

The root scripts understand workspace order:

- `pnpm test` builds the validation/shared packages and runs workspace tests.
- `pnpm typecheck` checks every workspace.
- `pnpm build` builds all workspaces.

For an infrastructure-affecting change, also build the API image:

```bash
docker build -f apps/api/Dockerfile -t sia-api .
```

## Continuous integration

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on every push and pull request:

```text
Checkout
→ pnpm 11.19.0
→ Node.js 22
→ pnpm install --frozen-lockfile
→ pnpm test
→ pnpm typecheck
→ pnpm build
```

CI confirms that the checked-in lockfile installs and the repository compiles/tests. It does not
deploy database migrations, inspect provider dashboards or exercise production email delivery.

## Automated coverage inventory

### Shared validation

Profile validation tests cover:

- Username normalisation
- Unsafe/reserved username rejection
- Tag deduplication
- Allowed/rejected profile themes
- Allowed/rejected profile characters

Nearby validation tests cover:

- Valid time-limited presence input
- Impossible coordinate rejection
- Free-form Wave rejection
- Meeting label and timestamp constraints

### Fastify API

API route tests use fake Auth, repository and photo-storage implementations. They cover:

- Protected endpoint rejection without a valid token
- Owned profile create/read/edit
- Anonymous public profile reads
- Friendly public not-found behaviour
- Duplicate username conflicts
- Private photo upload, replacement and removal
- Invalid photo content rejection
- Nearby hidden-by-default and authenticated presence lifecycle
- Rejection of unapproved free-form Nearby messages

These are fast, deterministic tests that do not require live Supabase credentials.

### Web application

The web package currently runs Vitest with `--passWithNoTests`. It has no committed component,
browser or end-to-end tests. `pnpm build` and TypeScript catch compilation/type failures but do not
prove user interactions.

## What remains manual

- Sign-up, email confirmation, login and password reset against production Supabase/Resend
- Creation-first profile draft and IndexedDB photo handoff
- Camera permission and capture across devices
- Private/public profile behaviour with real storage signed URLs
- QR scanability on physical devices and exported SVG posters
- Nearby geolocation permission, two-person Waves, Meet Cards, blocks and reports
- Domain redirects, HTTPS, API health and CORS
- Search metadata and social-link previews after production deployment

## Release path

```text
Code and docs
→ local tests/type-check/build
→ commit and push
→ GitHub Actions
→ apply required Supabase migrations separately
→ deploy/verify Render API
→ deploy/verify Vercel web
→ run feature-specific production smoke test
→ update changelog/progress log/project record
```

For schema changes, prefer additive/backward-compatible migrations and deploy them before code that
requires the new columns/tables. The repository contains no automated rollback migrations; treat
destructive schema changes as a separate reviewed operation.

## General release checklist

### Before merge

- Confirm the change has focused automated coverage where practical.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Check `git diff --check` and review only intended files.
- Add a migration for every persistent schema change.
- Update `.env.example` for new configuration names without adding real secrets.
- Update the relevant API, schema, architecture and Project Record documents.

### After deploy

- Confirm `https://siaqr.com` and the affected routes load.
- Confirm `www.siaqr.com` redirects to the root domain.
- Confirm the API health endpoint and browser CORS.
- Exercise the changed journey with a non-administrator account.
- Check browser console/network errors and server logs without copying secrets into records.
- Verify privacy-negative cases: private profile, missing/invalid token, hidden Nearby and invalid
  file/input.
- Record the smoke-test result and any remaining operational action.

## Feature-specific release gates

| Feature | Minimum extra check |
| --- | --- |
| Auth | New signup, confirmation return, login, reset link and new password |
| Resend | Sender domain, inbox/spam placement, tracking off and secure links intact |
| Profile photos | Upload, signed display, replacement, deletion and private-profile denial |
| QR | Real phone scan from screen plus downloaded poster |
| Nearby | Two real accounts/devices; visibility, Wave, acceptance, Meet Card, hide and block |
| SEO | Canonical, robots, sitemap, OG image and structured-data inspection |
| Domain/deployment | Root/www redirect, HTTPS, API health and CORS preflight |

## Failure and rollback principles

- Web/API code can normally be restored by redeploying or reverting to a previously known-good Git
  revision.
- Do not use a destructive Git reset to handle a production incident when a revert/deployment is
  sufficient.
- Database migrations need a specific forward-fix or reviewed rollback; application rollback alone
  does not remove schema changes.
- Provider-dashboard changes must be reversed in the provider that owns them and documented.
- When an API/web contract changes, keep old and new versions compatible during deployment where
  possible.

## Current gaps

- No web component tests
- No committed end-to-end browser suite
- No automated production smoke tests
- No automated database migration deployment
- No load/performance suite
- No visual regression tests
- No automated accessibility scan
- No QR image scanability regression
- Root `CHANGELOG.md` still describes the original 1.0.0 foundation and does not include later
  themes, characters, Nearby, photos or SEO work

## Source locations

- [`package.json`](../../package.json)
- [`apps/api/src/app.test.ts`](../../apps/api/src/app.test.ts)
- [`packages/validation/src/profile.test.ts`](../../packages/validation/src/profile.test.ts)
- [`packages/validation/src/nearby.test.ts`](../../packages/validation/src/nearby.test.ts)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- [`docs/development/local-development.md`](../development/local-development.md)
- [`deployment-and-domain.md`](./deployment-and-domain.md)

## Change history

| Date | Change |
| --- | --- |
| 2026-09-04 | Created the testing inventory, release workflow, manual gates and known-gap record. |
