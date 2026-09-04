import type { ProfileInput, ProfileStatusDuration, ProfileStatusState, StoredProfile } from "@sia/validation";

export type ProfileStatusPatch = {
  state: ProfileStatusState;
  duration: ProfileStatusDuration | null;
  expiresAt: Date | null;
  detail?: string;
};

export interface ProfileRepository {
  create(userId: string, input: ProfileInput): Promise<StoredProfile>;
  findByUserId(userId: string): Promise<StoredProfile | null>;
  findPublicByUsername(username: string): Promise<StoredProfile | null>;
  update(userId: string, input: ProfileInput): Promise<StoredProfile | null>;
  updateAvatarPath(userId: string, avatarPath: string | null): Promise<StoredProfile | null>;
  updateStatus(userId: string, patch: ProfileStatusPatch): Promise<StoredProfile | null>;
}
