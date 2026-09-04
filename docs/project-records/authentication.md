# Authentication and profile-draft handoff

**Status:** Implemented for email/password and Google OAuth

**Last verified:** 2026-09-04

## Purpose and user outcome

Authentication gives a profile a durable owner without forcing someone to register before they
understand the product. A person can build their Sia first, create or access an account, and then
save that draft to the verified identity.

Supabase Auth provides account/session functionality. The Fastify API remains authoritative for
application ownership and verifies every protected request independently.

## Trust boundary

```text
Browser
├── Supabase browser client ──► sign-up, login, reset and local session
└── Sia REST client ──────────► Authorization: Bearer <access token>
                                  │
                                  ▼
                              Fastify API
                                  │
                                  ▼
                        SupabaseAuthProvider.getUser(token)
                                  │
                                  ▼
                         trusted auth.users.id
                                  │
                                  ▼
                       owner-scoped application action
```

The browser never sends an authoritative owner ID. Request bodies cannot choose which user owns or
edits a profile.

## Current authentication methods

Implemented:

- Email/password sign-up
- Optional email confirmation, depending on Supabase project settings
- Email/password login
- Sign-out
- Forgotten-password email
- Password update after opening the recovery link
- Google sign-up and login through Supabase OAuth
- Session observation and authenticated route redirection

Not implemented:

- Social providers other than Google
- Magic-link login in the Sia interface
- Multi-factor authentication
- Account deletion
- Account data export
- Email-address change UI

Google sign-in was discussed as future work. It should be recorded in the roadmap, not described as
shipped, until code and production configuration are complete.

## Browser session lifecycle

[`AuthProvider`](../../apps/web/components/auth-provider.tsx) creates one application-level auth
context. On mount it:

1. Gets the current Supabase session.
2. Subscribes to Supabase auth-state changes.
3. Exposes `session`, `loading`, `configured` and `signOut` to client components.
4. Unsubscribes when the provider unmounts.

[`useOwnedProfile`](../../apps/web/hooks/use-owned-profile.ts) builds the owner-route behaviour on top:

- No authenticated session redirects to `/login`.
- A session loads `GET /profiles/me` using its access token.
- `PROFILE_NOT_FOUND` redirects to `/create`.
- Other errors remain visible rather than being mistaken for an absent profile.

## Creation-first draft flow

```text
/create
→ complete and validate profile wizard
→ save profile fields to sessionStorage
→ save optional prepared photo to IndexedDB
→ /login?from=create
→ sign up or log in through Supabase
→ if confirmation is required, keep the local draft until a later login
→ when a session exists, POST /profiles with the access token
→ upload optional photo through the protected photo endpoint
→ clear both draft stores
→ /profile?created=1
```

The shared field-draft key is defined in [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts).
The photo draft is separate because it is binary data. See [`profile-photos.md`](./profile-photos.md).

The API prevents a second profile for the same verified user. If the creation handoff encounters
`PROFILE_EXISTS`, the browser treats profile creation as already complete and continues with the
remaining photo/redirect work.

## Sign-up and login

The login page chooses sign-up mode automatically when reached from profile creation. It calls:

```text
supabase.auth.signUp({ email, password, emailRedirectTo: <site>/login })
supabase.auth.signInWithPassword({ email, password })
```

If sign-up immediately returns a session, the held draft is saved. If email confirmation is
required, the page tells the person to confirm and return; the draft stays in browser storage.

Google appears above the email form as the primary low-friction option. The login page calls:

```text
supabase.auth.signInWithOAuth({ provider: "google", redirectTo: <site>/login })
```

Google returns through Supabase's hosted callback and then redirects to `/login`. `AuthProvider`
observes the restored Supabase session; the login page completes the same profile-draft and photo
handoff used by email/password authentication before replacing the route with `/profile`.

## Password recovery

```text
Forgot password form
→ supabase.auth.resetPasswordForEmail(email)
→ authentication email delivered through Resend
→ secure link opens /reset-password
→ supabase.auth.updateUser({ password })
→ redirect to /profile
```

Email delivery configuration is documented separately in
[`authentication-email.md`](./authentication-email.md).

## API authentication and authorisation

Protected routes require `Authorization: Bearer <token>`. The API:

1. Rejects a missing, malformed or empty bearer header.
2. Passes the token to `SupabaseAuthProvider`.
3. Uses Supabase `auth.getUser(token)` to verify it.
4. Receives the trusted `user.id`.
5. Passes that ID into owner-scoped services and repositories.

Public endpoints are limited to health and public-profile reads. A private profile and a nonexistent
profile produce the same public not-found response.

## Identity and data relationship

```text
Supabase auth.users.id
└── profiles.user_id (unique, cascade delete)
    └── one application profile per Auth user

auth.users.id also owns/references Nearby presence, Waves, connections,
meeting data, blocks and reports.
```

Database RLS is enabled, but there are no browser-facing application-table policies. The server-side
API accesses the database with its service credential after application-level authorisation.

## Configuration

Browser:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Server:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase Dashboard:

- Email/password provider enabled
- Site URL set to `https://siaqr.com`
- `/login` and `/reset-password` allowed as redirect URLs
- Email-confirmation policy chosen explicitly
- Custom SMTP and templates maintained as described in the email record

The anonymous browser key is not the service-role key. Never expose the service-role key through a
`NEXT_PUBLIC_*` variable.

## Validation performed

Automated API coverage verifies that protected endpoints reject absent/invalid tokens and that
authenticated profile creation, owner reads and edits use the verified identity. Tests use a fake
Auth provider so they run without production credentials.

The repository does not contain a browser-level Supabase Auth integration test. The final
confirmation-email and password-recovery inbox smoke test is still recorded as pending.

## Known limitations and risks

- A held draft is local to the browser/tab and is not recoverable on another device.
- Clearing browser data before completing login loses the draft.
- Auth verification currently makes a Supabase network call for every protected API request.
- No account deletion/export flow exists even though database rows cascade from Auth user deletion.
- No social login or MFA is implemented.
- Production Auth settings and redirect allowlists live outside Git and can drift.

## Implementation locations

- [`apps/web/lib/supabase.ts`](../../apps/web/lib/supabase.ts)
- [`apps/web/components/auth-provider.tsx`](../../apps/web/components/auth-provider.tsx)
- [`apps/web/app/login/page.tsx`](../../apps/web/app/login/page.tsx)
- [`apps/web/app/reset-password/page.tsx`](../../apps/web/app/reset-password/page.tsx)
- [`apps/api/src/auth/auth-provider.ts`](../../apps/api/src/auth/auth-provider.ts)
- [`apps/api/src/auth/supabase-auth-provider.ts`](../../apps/api/src/auth/supabase-auth-provider.ts)
- [`apps/api/src/app.ts`](../../apps/api/src/app.ts)

## Change history

| Date | Change |
| --- | --- |
| 2026-09-04 | Created the dedicated authentication, ownership and creation-first draft record. |
