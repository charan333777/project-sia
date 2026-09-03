# Database schema

The versioned schema is maintained in `supabase/migrations/`.

## `profiles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key, generated with `gen_random_uuid()` |
| `user_id` | UUID | Unique, required, references `auth.users` with cascade delete |
| `username` | varchar(30) | Unique, normalized public identifier |
| `display_name` | varchar(60) | Required visible name |
| `role` | varchar(80) | Free-form V1 role |
| `bio` | text | Short biography, application limit 300 |
| `current_context` | varchar(160) | Highly visible current activity/context |
| `interests` | text[] | Up to 10 tags |
| `open_to` | text[] | Up to 10 interaction signals |
| `is_public` | boolean | Defaults to false |
| `profile_theme` | text | One of `calm`, `warm`, `bold`, or `play` |
| `profile_character` | text | One of `plain`, `puppy`, `elephant`, `panda`, or `play`; defaults to `plain` |
| `avatar_path` | text | Nullable path to a private Supabase Storage object |
| `created_at` | timestamptz | Creation time |
| `updated_at` | timestamptz | Last API update time |

The database includes unique indexes for owner and case-insensitive username integrity plus a partial public-username index. Check constraints provide defense in depth for username format, array size, theme, and character choices. PostgreSQL queries are parameterized through the `postgres` client.

RLS is enabled. V1 deliberately creates no browser-facing policies because all profile persistence and retrieval flows through the Fastify API. The API service credential must remain server-only.

Profile photos live in the private `profile-photos` Storage bucket. The API validates uploads, owns replacement/deletion, and returns one-hour signed URLs only after the same owner/public-profile access checks used for profile data.

## Nearby tables

- `nearby_presence` stores an authenticated user's PostGIS geography point, accuracy, selected duration, and expiry. A GiST index powers the 200 m search.
- `nearby_signals` stores expiring preset-intention Waves.
- `nearby_connections` stores mutual, two-hour connections using one normalized row per user pair.
- `nearby_meet_plans` and `nearby_meet_statuses` store temporary time/place proposals and preset coordination updates.
- `nearby_blocks` permanently excludes a user pair from discovery and interaction.
- `nearby_reports` retains moderation evidence separately from temporary social data.

RLS is enabled on every Nearby table with no browser policies. Expired location and coordination rows are opportunistically deleted by the API; blocking and reports are retained for safety.
