# Database schema

The versioned migration is `supabase/migrations/202608290001_create_profiles.sql`.

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
| `is_public` | boolean | Defaults to true |
| `created_at` | timestamptz | Creation time |
| `updated_at` | timestamptz | Last API update time |

The database includes unique indexes for owner and case-insensitive username integrity plus a partial public-username index. Check constraints provide defense in depth for username format and array size. PostgreSQL queries are parameterized through the `postgres` client.

RLS is enabled. V1 deliberately creates no browser-facing policies because all profile persistence and retrieval flows through the Fastify API. The API service credential must remain server-only.
