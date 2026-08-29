# Backend architecture

## Request path

Each request moves through a small set of explicit layers:

1. Fastify route parses the request and, for protected endpoints, extracts a bearer token.
2. `AuthProvider` verifies the token and returns the trusted Supabase identity.
3. `ProfileService` applies business rules and authoritative Zod validation.
4. `ProfileRepository` performs parameterized PostgreSQL operations.
5. The centralized error handler returns the stable V1 error envelope.

## Authentication and authorization

`SupabaseAuthProvider` calls Supabase Auth with the access token. A missing, malformed or invalid token returns `401 UNAUTHORIZED`. Creation, owner reads and updates always use the verified identity's user ID; route bodies cannot override it.

## Operational protections

- `@fastify/helmet` adds security headers.
- CORS permits only the configured web origin.
- Global rate limiting allows 100 requests per minute; profile creation has a tighter 20-per-minute limit.
- Fastify structured logging is enabled in the runtime server.
- Unexpected failures are logged server-side and returned as a generic message without a stack trace.
- Tokens, passwords and credentials are not included in application logs.

## Provider replacement

To replace Supabase Auth, implement `AuthProvider`. To replace PostgreSQL access, implement `ProfileRepository`. The route and service layers do not depend on provider SDKs.
