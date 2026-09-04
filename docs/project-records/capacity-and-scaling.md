# Capacity and scaling assumptions

**Status:** Planning record; not load-tested

**Last assessed:** 2026-09-04

## Purpose

This record preserves the current sizing discussion and, more importantly, the assumptions behind
it. It is not a capacity guarantee. Actual limits must be established with production-like load
tests and monitoring before Sia is used at a high-attendance event.

## Short conclusion

Sia does not need a GPU. The frontend is mostly handled by Vercel/CDN infrastructure; the Fastify
API, Supabase Auth calls, PostgreSQL/PostGIS queries and Nearby polling determine runtime capacity.

For hundreds of registered users with only a small number online, resource needs should be modest.
Hundreds of people simultaneously using Nearby is a different workload and requires measurement and
several architectural improvements.

## Workload model

### Ordinary profile usage

Profile reads and edits are request-driven. Public pages read a single profile; owner actions are
infrequent. This workload is unlikely to dominate compared with continuously active Nearby clients.

### Nearby usage

Each active Nearby page currently:

- Requests a complete snapshot every 8 seconds.
- Refreshes presence on a 45-second heartbeat.
- May also send movement updates, limited to at most one every 30 seconds.
- Adds action requests for Waves, meetings, statuses, blocks or reports.

Approximate baseline before actions:

| Simultaneously active Nearby users | Snapshot requests/second | 45-second presence refreshes/second |
| ---: | ---: | ---: |
| 10 | 1.25 | 0.22 |
| 100 | 12.5 | 2.22 |
| 500 | 62.5 | 11.11 |

A snapshot is not one database operation. It performs expiry cleanup and parallel reads for
presence, candidates, signals and connections; listing active Meet Cards may perform an additional
status query. Every protected HTTP request also verifies its bearer token through Supabase Auth.

## Current pressure points

### 1. Request-driven cleanup

`pruneExpired()` issues four delete statements whenever a Nearby snapshot is read. This multiplies
write/lock activity with polling traffic even when little has expired.

### 2. Remote token verification

`SupabaseAuthProvider` calls `auth.getUser(token)` for every protected request. At high request rates,
Auth network latency and provider rate limits can affect the API independently of CPU/RAM.

### 3. Global per-IP rate limit

The API globally permits 100 requests per minute, with tighter route limits. At a venue, many phones
can share one public IP through Wi-Fi or carrier NAT. Per-IP limiting may therefore throttle a group
of legitimate attendees together.

### 4. Polling amplification

Eight-second polling is simple and predictable, but most responses may be unchanged. API instances,
Auth and PostgreSQL all repeat work for inactive screens.

### 5. Database connections

The production composition creates separate PostgreSQL clients for the profile and Nearby
repositories, each configured with a pool maximum of 10. One API instance can therefore request up
to roughly 20 database connections. Horizontal API scaling multiplies that requirement.

### 6. Spatial/event density

PostGIS uses `ST_DWithin` and a GiST index, which is appropriate, and the candidate result is limited
to 50. Dense event traffic still increases matching work, signals and connection reads.

## Earlier sizing hypothesis

The earlier planning discussion used these starting estimates:

| Usage shape | API starting point | Database starting point | GPU |
| --- | --- | --- | --- |
| 100–500 registered; 10–30 online | 0.5 CPU / 512 MB | About 1 GB managed PostgreSQL | None |
| 100 simultaneously active | 1 CPU / 2 GB | About 2 GB managed PostgreSQL | None |
| 500 simultaneous normal users | 2 CPU / 4 GB | About 4 GB managed PostgreSQL | None |
| 500 simultaneous Nearby users | Prefer multiple API instances | 4–8 GB depending on measured query load | None |

These are hypotheses, not benchmarks or provider-plan commitments. Provider products, shared CPU
behaviour, connection limits and prices change; confirm current specifications before purchasing or
promising capacity.

## Recommended improvement order

Before a large event:

1. Define the expected concurrent Nearby population and acceptable response time/error rate.
2. Add request, latency, error, Auth-call, database-connection and slow-query monitoring.
3. Move expired-row cleanup to a scheduled database/server job.
4. Review JWT verification that can be performed locally with appropriately managed signing keys,
   while preserving revocation/security requirements.
5. Replace or tune the per-IP rate-limit identity for authenticated endpoints and account for shared
   venue networks.
6. Reduce polling frequency when the page is hidden or results are unchanged; evaluate realtime or
   long-lived updates only if justified.
7. Load-test the actual API and PostGIS query mix with realistic geographic density.
8. Confirm database pool and provider connection limits before adding API instances.
9. Re-run the test against the exact production plan and region.

None of these improvements should be described as shipped until implemented and verified.

## Load-test scenarios to preserve

- Public-profile read burst after many QR scans.
- 100 and 500 authenticated clients polling Nearby.
- Many clients behind one source IP.
- Dense 200 m candidate set with the 50-person result cap reached.
- Concurrent presence refresh and expiry cleanup.
- Wave acceptance races between the same pair.
- Meeting/status traffic on many active connections.
- Auth provider latency or partial outage.
- Database pool exhaustion and API instance restart.
- Cold API start if the selected hosting plan can sleep.

## Metrics currently missing

- Agreed availability objective
- API p50/p95/p99 response-time objectives
- Acceptable Nearby freshness delay
- Maximum event concurrency commitment
- Production request/error dashboard
- Database slow-query and connection-pool dashboard
- Synthetic profile/QR/Auth smoke monitoring
- Measured throughput and saturation point

## Related implementation

- [`apps/web/components/nearby-experience.tsx`](../../apps/web/components/nearby-experience.tsx)
- [`apps/api/src/services/nearby-service.ts`](../../apps/api/src/services/nearby-service.ts)
- [`apps/api/src/repositories/postgres-nearby-repository.ts`](../../apps/api/src/repositories/postgres-nearby-repository.ts)
- [`apps/api/src/auth/supabase-auth-provider.ts`](../../apps/api/src/auth/supabase-auth-provider.ts)
- [`apps/api/src/app.ts`](../../apps/api/src/app.ts)
- [`nearby-privacy.md`](./nearby-privacy.md)
- [`deployment-and-domain.md`](./deployment-and-domain.md)

## Change history

| Date | Change |
| --- | --- |
| 2026-09-04 | Preserved the earlier 100/500-user sizing discussion, made its assumptions explicit, and mapped current bottlenecks to source. |
