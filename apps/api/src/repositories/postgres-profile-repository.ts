import postgres, { type Sql } from "postgres";
import type { ProfileInput, StoredProfile } from "@sia/validation";
import type { ProfileRepository } from "./profile-repository.js";

type ProfileRow = Omit<StoredProfile, "created_at" | "updated_at"> & {
  created_at: Date;
  updated_at: Date;
};

function serialize(row: ProfileRow): StoredProfile {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
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
        user_id, username, display_name, role, bio, current_context, interests, open_to, is_public, profile_theme, profile_character
      ) VALUES (
        ${userId}, ${input.username}, ${input.display_name}, ${input.role}, ${input.bio},
        ${input.current_context}, ${this.sql.array(input.interests)}, ${this.sql.array(input.open_to)}, ${input.is_public}, ${input.profile_theme}, ${input.profile_character}
      )
      RETURNING *
    `;
    if (!row) throw new Error("Profile insert returned no row");
    return serialize(row);
  }

  async findByUserId(userId: string): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`;
    return row ? serialize(row) : null;
  }

  async findPublicByUsername(username: string): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      SELECT * FROM profiles WHERE username = ${username} AND is_public = true LIMIT 1
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
        updated_at = now()
      WHERE user_id = ${userId}
      RETURNING *
    `;
    return row ? serialize(row) : null;
  }

  async updateAvatarPath(userId: string, avatarPath: string | null): Promise<StoredProfile | null> {
    const [row] = await this.sql<ProfileRow[]>`
      UPDATE profiles SET
        avatar_path = ${avatarPath},
        updated_at = now()
      WHERE user_id = ${userId}
      RETURNING *
    `;
    return row ? serialize(row) : null;
  }
}
