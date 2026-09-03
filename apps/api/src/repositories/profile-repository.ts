import type { ProfileInput, StoredProfile } from "@sia/validation";

export interface ProfileRepository {
  create(userId: string, input: ProfileInput): Promise<StoredProfile>;
  findByUserId(userId: string): Promise<StoredProfile | null>;
  findPublicByUsername(username: string): Promise<StoredProfile | null>;
  update(userId: string, input: ProfileInput): Promise<StoredProfile | null>;
  updateAvatarPath(userId: string, avatarPath: string | null): Promise<StoredProfile | null>;
}
