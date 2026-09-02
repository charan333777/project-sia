# System architecture

## Product flow

```text
Homepage → profile draft → Supabase sign-up/login → authenticated API write
    → owner profile + QR → anonymous public profile → create-your-own CTA
    → opt-in Nearby → mutual Wave → temporary Meet Card
```

The profile draft exists only in React state and `sessionStorage` before authentication. No anonymous database row is created. Once Supabase supplies an authenticated session, the browser sends the draft and bearer token to the API.

## Boundaries

```text
Next.js web application
  ├─ Supabase browser client (authentication only)
  └─ REST client
       ↓
Fastify routes → ProfileService / NearbyService → repositories → PostgreSQL + PostGIS
                    ↑
              AuthProvider → Supabase Auth
```

The web application does not perform profile CRUD against Supabase. Provider-specific code is isolated in `SupabaseAuthProvider` and `PostgresProfileRepository`, while routes depend on the interfaces.

## Deployment shape

The web app can run on any Next.js-compatible host. The API is a portable Docker container. PostgreSQL and authentication are initially supplied by Supabase. The API and web origins are configured independently through environment variables.

## Key decisions

- A modular monolith is sufficient for V1; there are no microservices.
- The canonical public URL is `/u/:username` and requires no authentication.
- QR images are generated on demand from the canonical URL and are never stored.
- RLS is enabled as defense in depth, while V1 database access remains API-only through a server credential.
- The API is authoritative for validation, username uniqueness and ownership.
- Exact Nearby geography stays in PostgreSQL. Browser responses contain only one of three distance bands and one of eight direction sectors.
- Nearby presence, signals, connections, meeting plans, and preset statuses are temporary and pruned after expiry.
