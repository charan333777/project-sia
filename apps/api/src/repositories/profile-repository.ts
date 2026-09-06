import type { ProfileInput, ProfileStatusDuration, ProfileStatusState, ProfileViewSummary, StoredProfile } from "@sia/validation";

export type ProfileStatusPatch = {
  state: ProfileStatusState;
  duration: ProfileStatusDuration | null;
  expiresAt: Date | null;
  detail?: string;
};

export interface ProfileRepository {
  create(userId: string, input: ProfileInput): Promise<StoredProfile>;
  /** Live profiles only. Pass `includeDeleted` to reach one inside its grace window. */
  findByUserId(userId: string, includeDeleted?: boolean): Promise<StoredProfile | null>;
  findPublicByUsername(username: string): Promise<StoredProfile | null>;
  update(userId: string, input: ProfileInput): Promise<StoredProfile | null>;
  updateAvatarPath(userId: string, avatarPath: string | null): Promise<StoredProfile | null>;
  updateStatus(userId: string, patch: ProfileStatusPatch): Promise<StoredProfile | null>;
  /** Marks a profile deleted. Reads stop returning it immediately. */
  softDelete(userId: string): Promise<StoredProfile | null>;
  /** Clears the deletion mark. Only valid inside the grace window. */
  restore(userId: string): Promise<StoredProfile | null>;
  /** True when the name belongs to a purged account and can never be reissued. */
  isUsernameRetired(username: string): Promise<boolean>;
  /**
   * Purges profiles whose grace window has closed and retires their usernames.
   * Returns the storage paths of purged avatars so the caller can delete the files.
   */
  purgeDeleted(graceDays: number): Promise<string[]>;
  /** Counts one open of a public profile, keyed by UTC day. */
  recordView(profileId: string): Promise<void>;
  viewSummary(profileId: string): Promise<ProfileViewSummary>;
  /** Public, listed, not deleted — the set the sitemap may enumerate. */
  listSearchableUsernames(): Promise<{ username: string; updated_at: string }[]>;
}
