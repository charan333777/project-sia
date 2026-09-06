import postgres, { type Sql } from "postgres";
import type { ProfileInput, ProfileViewSummary, StoredProfile } from "@sia/validation";
import type { ProfileRepository, ProfileStatusPatch } from "./profile-repository.js";

type ProfileRow = Omit<StoredProfile, "created_at" | "updated_at" | "status_expires_at" | "deleted_at"> & {
  created_at: Date;
  updated_at: Date;
  status_expires_at: Date | null;
  deleted_at: Date | null;
};

function serialize(row: ProfileRow): StoredProfile {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    status_expires_at: row.status_expires_at ? row.status_expires_at.toISOString() : null,
    deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly sql: Sql) {}

  static connect(databaseUrl: string) {
    return new PostgresProfileRepository(
      postgres(databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10 }),
    );
  }

  async create(userId: string, input: ProfileInput): Promise<StoredProfile> {
    const [row] = await this.sql<ProfileRow[]>`
      INSERT INTO profiles (
        user_id, username, display_name, role, bio, current_context, interests, open_to, is_public, profile_theme, profile_character, contact_items, list_in_search
      ) VALUES (
        ${userId}, ${input.username}, ${input.display_name}, ${input.role}, ${input.bio},
        ${input.current_context}, ${this.sql.array(input.interests)}, ${this.sql.array(input.open_to)}, ${input.is_public}, ${input.profile_theme}, ${input.profile_character}, ${this.sql.json(input.contact_items)}, ${input.list_in_search}
      )
      RETURNING *
    `;
    if (!row) throw new Error("Profile insert returned no row");
    return serialize(row);
  }

  async findByUserId(userId: string, includeDeleted = false): Promise<StoredProfile | null> {
    // Reads filter on `deleted_at` themselves, so a row awaiting purge is never served —
    // the sweep performs the erasure, it does not police visibility.
    const [row] = includeDeleted
      ? await this.sql<ProfileRow[]>`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`
      : await this.sql<ProfileRow[]>`SELECT * FROM profiles WHERE user_id = ${userId} AND deleted_at IS NULL LIMIT 1`;
    return row ? serialize(row) : null;
  }

  async findPublicByUsername(username: string): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      SELECT * FROM profiles
      WHERE username = ${username} AND is_public = true AND deleted_at IS NULL
      LIMIT 1
    `;
    return row ? serialize(row) : null;
  }

  async update(userId: string, input: ProfileInput): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      UPDATE profiles SET
        username = ${input.username},
        display_name = ${input.display_name},
        role = ${input.role},
        bio = ${input.bio},
        current_context = ${input.current_context},
        interests = ${this.sql.array(input.interests)},
        open_to = ${this.sql.array(input.open_to)},
        is_public = ${input.is_public},
        profile_theme = ${input.profile_theme},
        profile_character = ${input.profile_character},
        contact_items = ${this.sql.json(input.contact_items)},
        list_in_search = ${input.list_in_search},
        updated_at = now()
      WHERE user_id = ${userId} AND deleted_at IS NULL
      RETURNING *
    `;
    return row ? serialize(row) : null;
  }

  async updateStatus(userId: string, patch: ProfileStatusPatch): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      UPDATE profiles SET
        status_state = ${patch.state},
        status_duration = ${patch.duration},
        status_expires_at = ${patch.expiresAt},
        current_context = COALESCE(${patch.detail ?? null}, current_context),
        updated_at = now()
      WHERE user_id = ${userId} AND deleted_at IS NULL
      RETURNING *
    `;
    return row ? serialize(row) : null;
  }

  async softDelete(userId: string): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      UPDATE profiles SET deleted_at = now(), updated_at = now()
      WHERE user_id = ${userId} AND deleted_at IS NULL
      RETURNING *
    `;
    return row ? serialize(row) : null;
  }

  async restore(userId: string): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      UPDATE profiles SET deleted_at = NULL, updated_at = now()
      WHERE user_id = ${userId} AND deleted_at IS NOT NULL
      RETURNING *
    `;
    return row ? serialize(row) : null;
  }

  async isUsernameRetired(username: string): Promise<boolean> {
    const [row] = await this.sql<{ username: string }[]>`
      SELECT username FROM retired_usernames WHERE username = ${username} LIMIT 1
    `;
    return Boolean(row);
  }

  async purgeDeleted(graceDays: number): Promise<string[]> {
    // One transaction: retire the names, then drop the rows. Views and other dependent
    // rows go with them through their cascades.
    return await this.sql.begin(async (transaction) => {
      const due = await transaction<{ username: string; avatar_path: string | null }[]>`
        SELECT username, avatar_path FROM profiles
        WHERE deleted_at IS NOT NULL
          AND deleted_at <= now() - ${`${graceDays} days`}::interval
        FOR UPDATE
      `;
      if (due.length === 0) return [];
      const usernames = due.map((row) => row.username);
      await transaction`
        INSERT INTO retired_usernames (username)
        SELECT unnest(${transaction.array(usernames)}::varchar[])
        ON CONFLICT (username) DO NOTHING
      `;
      await transaction`DELETE FROM profiles WHERE username = ANY(${transaction.array(usernames)}::varchar[])`;
      return due.map((row) => row.avatar_path).filter((path): path is string => Boolean(path));
    });
  }

  async recordView(profileId: string): Promise<void> {
    await this.sql`
      INSERT INTO profile_views (profile_id, viewed_on, views)
      VALUES (${profileId}, (now() AT TIME ZONE 'utc')::date, 1)
      ON CONFLICT (profile_id, viewed_on) DO UPDATE SET views = profile_views.views + 1
    `;
  }

  async viewSummary(profileId: string): Promise<ProfileViewSummary> {
    const [row] = await this.sql<{ total: string; last_7: string; last_30: string }[]>`
      SELECT
        COALESCE(SUM(views), 0) AS total,
        COALESCE(SUM(views) FILTER (WHERE viewed_on > (now() AT TIME ZONE 'utc')::date - 7), 0) AS last_7,
        COALESCE(SUM(views) FILTER (WHERE viewed_on > (now() AT TIME ZONE 'utc')::date - 30), 0) AS last_30
      FROM profile_views WHERE profile_id = ${profileId}
    `;
    return {
      total: Number(row?.total ?? 0),
      last_7_days: Number(row?.last_7 ?? 0),
      last_30_days: Number(row?.last_30 ?? 0),
    };
  }

  async listSearchableUsernames(): Promise<{ username: string; updated_at: string }[]> {
    const rows = await this.sql<{ username: string; updated_at: Date }[]>`
      SELECT username, updated_at FROM profiles
      WHERE list_in_search = true AND is_public = true AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 5000
    `;
    return rows.map((row) => ({ username: row.username, updated_at: row.updated_at.toISOString() }));
  }

  async updateAvatarPath(userId: string, avatarPath: string | null): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      UPDATE profiles SET
        avatar_path = ${avatarPath},
        updated_at = now()
      WHERE user_id = ${userId} AND deleted_at IS NULL
      RETURNING *
    `;
    return row ? serialize(row) : null;
  }
}
