# Nearby privacy and meeting lifecycle

**Status:** Implemented

**Last verified:** 2026-09-04

## Purpose and user outcome

Nearby helps two people who are physically close discover that they are open to meeting, without
publishing exact map pins or creating a permanent social network. It is deliberately temporary,
opt-in and limited to structured interactions.

## Human-readable flow

```text
Hidden by default
→ user explicitly shares location for 15 minutes, 60 minutes, or while present
→ browser sends precise coordinates to the authenticated API
→ PostGIS finds active people within 200 metres
→ API returns only an approximate distance band and direction sector
→ user sends a preset Wave
→ recipient accepts or declines
→ acceptance creates a temporary two-hour connection
→ either person can suggest a time and public meeting place
→ accepted Meet Card allows preset coordination updates
→ expiry, hiding or blocking ends the relevant visibility/interactions
```

There is no map, exact public pin, free-form chat, permanent inbox, follower graph or friend list.

## Component map

| Component | Responsibility |
| --- | --- |
| [`nearby-experience.tsx`](../../apps/web/components/nearby-experience.tsx) | Permission UI, geolocation watch, radar/list presentation, polling and user actions |
| [`apps/web/lib/api.ts`](../../apps/web/lib/api.ts) | Authenticated REST calls and shared response handling |
| [`apps/api/src/app.ts`](../../apps/api/src/app.ts) | Protected routes, rate limits and no-store/geolocation headers |
| [`nearby-service.ts`](../../apps/api/src/services/nearby-service.ts) | Validation, expiry rules, distance bands, direction sectors and workflow decisions |
| [`NearbyRepository`](../../apps/api/src/repositories/nearby-repository.ts) | Provider-independent persistence contract |
| [`PostgresNearbyRepository`](../../apps/api/src/repositories/postgres-nearby-repository.ts) | Spatial SQL, transactions and table lifecycle |
| [`packages/validation/src/nearby.ts`](../../packages/validation/src/nearby.ts) | Allowed inputs, presets and response types |
| [`202609010005_add_nearby.sql`](../../supabase/migrations/202609010005_add_nearby.sql) | PostGIS extension, tables, indexes, constraints and RLS |

## Location privacy boundary

Precise latitude, longitude, accuracy, distance and bearing remain behind the API boundary.

```text
Browser coordinates
→ authenticated Fastify endpoint
→ private PostGIS geography point
→ ST_DWithin / ST_Distance / ST_Azimuth
→ privacy conversion in NearbyService
→ distance_band + bearing_sector only
→ browser
```

Returned distance bands are:

- Under 50 m
- 50–100 m
- 100–200 m

Returned direction uses one of eight 45-degree sectors. The API never returns raw coordinates, raw
metres or exact bearing.

## Browser behaviour

- Nearby requires an authenticated owner profile.
- Geolocation requires a secure browser context; production therefore requires HTTPS.
- Sharing begins only after the user opts in.
- `watchPosition` requests high accuracy with a 15-second timeout and accepts a 15-second cached
  position.
- Movement-driven updates are limited to at most one every 30 seconds.
- A 45-second heartbeat refreshes active presence using the latest location.
- The complete Nearby snapshot is polled every 8 seconds while the experience is mounted.
- Explicit hiding clears browser tracking and calls the API to delete stored presence.

## Temporary data model

| Table | Purpose | Lifecycle |
| --- | --- | --- |
| `nearby_presence` | Exact geography, accuracy, selected duration and visibility expiry | Deleted on hide or after expiry |
| `nearby_signals` | Preset-intention Waves | Pending rows expire; accepted/declined state is temporary history |
| `nearby_connections` | Normalised pair created after Wave acceptance | Active for two hours unless blocked/closed |
| `nearby_meet_plans` | Time and public-place suggestion | Proposed/accepted plan expires with its connection window |
| `nearby_meet_statuses` | Preset coordination updates | Cascades with its plan |
| `nearby_blocks` | Pair exclusion initiated by one user | Retained for safety |
| `nearby_reports` | Moderation evidence | Retained for review |

Expired presence, signals, plans and connections are pruned opportunistically when a snapshot is
requested. Blocks and reports are not part of that deletion pass.

## Consent and interaction rules

- Only a user with active presence can discover or Wave to another active person within 200 m.
- A Wave contains one approved intention: hello, interested, coffee, chat, network or collaborate.
- A connection begins only when the recipient accepts.
- Accepting either direction normalises the user pair into one connection row.
- Only members of a live connection can create or act on its Meet Card.
- A meeting suggestion must be within the short connection window and uses a preset or short public
  place label.
- Coordination statuses are preset; arbitrary chat text is rejected.
- Blocking removes both directions from discovery, cancels pending signals and closes a live
  connection.
- Reporting stores a controlled reason and an optional short detail without notifying the reported
  person through this feature.

## Security and operational protections

- Every Nearby endpoint verifies a Supabase bearer token.
- Every repository operation is scoped by the verified user, connection membership or recipient.
- Nearby responses use `Cache-Control: no-store`.
- The API sends `Permissions-Policy: geolocation=(self)` on Nearby requests.
- PostgreSQL queries are parameterised and sensitive multi-step changes use transactions.
- PostGIS uses a GiST location index for the 200 m query.
- RLS is enabled with no browser policies; the API owns database access.
- Endpoint-specific rate limits protect presence, Waves, status updates and reports.

## Validation performed

Automated coverage currently verifies:

- Presence stays hidden until an authenticated user shares it.
- Invalid/impossible coordinates are rejected.
- Free-form Wave messages are rejected.
- Presence creation and removal follow the authenticated lifecycle.
- Meeting labels and timestamps follow shared validation constraints.

The repository does not contain a multi-device browser test, high-concurrency spatial load test or
production privacy-response snapshot test.

## Scaling considerations

Nearby is the main load-sensitive part of Sia. At one snapshot every eight seconds, 100 continuously
active users create about 12.5 snapshot requests per second before presence updates and user actions;
500 create about 62.5. Each snapshot performs expiry cleanup and several data queries.

Before using Nearby at a large live event, prioritise the work recorded in
[`capacity-and-scaling.md`](./capacity-and-scaling.md), particularly scheduled cleanup, rate-limit
behaviour behind shared Wi-Fi, token-verification overhead, polling frequency and measured load
testing.

## Known limitations

- Polling means updates are not instant and creates repeated API/database work.
- Cleanup depends on request traffic rather than a scheduled worker.
- The global per-IP rate limit may group many event attendees behind one Wi-Fi/NAT address.
- Reports have no admin/moderation review surface.
- `until_leave` relies on browser heartbeats; closing or suspending the page is handled by short
  server expiry rather than a guaranteed browser event.
- No background or push notification tells a user about a Wave after leaving the page.

## Related documentation

- [`docs/api/v1.md`](../api/v1.md)
- [`docs/database/schema.md`](../database/schema.md)
- [`architecture.md`](./architecture.md)

## Change history

| Date | Change |
| --- | --- |
| 2026-09-04 | Created the dedicated Nearby privacy, safety, lifecycle and scaling record from the shipped implementation. |
