import {
  isProfileRestorable,
  profileDeletionGraceDays,
  profileInputSchema,
  profileStatusExpiry,
  profileStatusInputSchema,
  profileUpdateSchema,
  profilePurgeDueAt,
  publicContactItems,
  resolveProfileStatus,
  type Profile,
  type ProfileInput,
  type ProfileStatusInput,
  type ProfileUpdate,
  type StoredProfile,
} from "@sia/validation";
import { AppError, profileNotFound } from "../errors.js";
import type { ProfileRepository } from "../repositories/profile-repository.js";
import {
  detectProfilePhotoType,
  MAX_PROFILE_PHOTO_BYTES,
  sanitizeProfilePhoto,
  type ProfilePhotoStorage,
} from "./profile-photo-storage.js";

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

const purgeIntervalMs = 60_000;

export class ProfileService {
  private lastPurgedAt = 0;
  private purgeInFlight: Promise<void> | null = null;

  constructor(
    private readonly profiles: ProfileRepository,
    private readonly photos?: ProfilePhotoStorage,
  ) {}

  /**
   * Purges profiles whose 30-day grace window has closed, at most once a minute.
   *
   * Reads already exclude deleted rows, so this is not what hides a deleted profile —
   * it is what performs the erasure that backs the promise, the same division of labour
   * Nearby uses for its expiring data.
   */
  private async purgeDueProfiles() {
    if (Date.now() - this.lastPurgedAt < purgeIntervalMs) return;
    if (this.purgeInFlight) return this.purgeInFlight;
    this.purgeInFlight = this.profiles
      .purgeDeleted(profileDeletionGraceDays)
      .then(async (avatarPaths) => {
        for (const path of avatarPaths) await this.photos?.remove(path).catch(() => undefined);
        this.lastPurgedAt = Date.now();
      })
      .catch(() => undefined)
      .finally(() => {
        this.purgeInFlight = null;
      });
    return this.purgeInFlight;
  }

  private async present(profile: StoredProfile): Promise<Profile> {
    let avatarUrl: string | null = null;
    if (profile.avatar_path && this.photos) {
      try {
        avatarUrl = await this.photos.createSignedUrl(profile.avatar_path);
      } catch {
        // A storage outage should not make the rest of a profile unavailable.
      }
    }
    // An expired status is presented as no status at all, and the stored columns are
    // normalised with it so no caller can read a live-looking state off a stale row.
    const status = resolveProfileStatus(profile);
    return {
      ...profile,
      // A profile stored before the contact column existed reads back without it.
      contact_items: profile.contact_items ?? [],
      status_state: status ? profile.status_state : "off",
      status_duration: status ? profile.status_duration : null,
      status_expires_at: status ? profile.status_expires_at : null,
      avatar_url: avatarUrl,
      status,
    };
  }

  /**
   * The one place a profile is narrowed for a stranger. Hidden contact details are
   * dropped here rather than in the browser, so they never reach the page source, the
   * JSON payload, the Open Graph image or a downloaded vCard. Every public read path
   * goes through this — see `getPublic`, its only caller.
   */
  private async presentPublic(profile: StoredProfile): Promise<Profile> {
    const presented = await this.present(profile);
    return { ...presented, contact_items: publicContactItems(presented.contact_items) };
  }

  async create(userId: string, rawInput: ProfileInput) {
    const input = profileInputSchema.parse(rawInput);
    void this.purgeDueProfiles();
    if (await this.profiles.findByUserId(userId, true)) {
      throw new AppError(409, "PROFILE_EXISTS", "You already have a Sia profile.");
    }
    await this.assertUsernameAvailable(input.username);
    try {
      return await this.present(await this.profiles.create(userId, input));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
      }
      throw error;
    }
  }

  /** A name belonging to a purged account is never reissued — printed cards outlive accounts. */
  private async assertUsernameAvailable(username: string) {
    if (await this.profiles.isUsernameRetired(username)) {
      throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
    }
  }

  async getMine(userId: string) {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) throw profileNotFound();
    return await this.present(profile);
  }

  async getPublic(username: string) {
    void this.purgeDueProfiles();
    const profile = await this.profiles.findPublicByUsername(username);
    if (!profile) throw profileNotFound();
    return await this.presentPublic(profile);
  }

  async updateMine(userId: string, rawInput: ProfileUpdate) {
    const patch = profileUpdateSchema.parse(rawInput);
    const current = await this.profiles.findByUserId(userId);
    if (!current) throw profileNotFound();
    const input = profileInputSchema.parse({ ...current, ...patch });
    if (input.username !== current.username) await this.assertUsernameAvailable(input.username);
    try {
      const updated = await this.profiles.update(userId, input);
      if (!updated) throw profileNotFound();
      return await this.present(updated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
      }
      throw error;
    }
  }

  /**
   * Sets or clears the owner's status. The expiry is derived here from the chosen
   * duration — a client never states when its own status ends.
   */
  async setStatus(userId: string, rawInput: ProfileStatusInput) {
    const input = profileStatusInputSchema.parse(rawInput);
    const current = await this.profiles.findByUserId(userId);
    if (!current) throw profileNotFound();

    const patch =
      input.state === "off"
        ? { state: "off" as const, duration: null, expiresAt: null, detail: "" }
        : {
            state: input.state,
            duration: input.duration,
            expiresAt: profileStatusExpiry(input.duration),
            detail: input.detail,
          };

    const updated = await this.profiles.updateStatus(userId, patch);
    if (!updated) throw profileNotFound();
    return await this.present(updated);
  }

  async clearStatus(userId: string) {
    return await this.setStatus(userId, { state: "off" });
  }

  /**
   * Marks the account deleted. The profile disappears from every read at once — the public
   * page 404s and the QR stops resolving — while the row is kept for the grace window so a
   * misclick is recoverable.
   */
  async deleteMine(userId: string) {
    const deleted = await this.profiles.softDelete(userId);
    if (!deleted) throw profileNotFound();
    return {
      deleted_at: deleted.deleted_at,
      purges_at: deleted.deleted_at ? profilePurgeDueAt(deleted.deleted_at).toISOString() : null,
      grace_days: profileDeletionGraceDays,
    };
  }

  /** Brings a profile back, but only while it is still inside the grace window. */
  async restoreMine(userId: string) {
    const current = await this.profiles.findByUserId(userId, true);
    if (!current) throw profileNotFound();
    if (!current.deleted_at) return await this.present(current);
    if (!isProfileRestorable(current.deleted_at)) {
      throw new AppError(410, "PROFILE_PURGED", "That profile has been permanently deleted.");
    }
    const restored = await this.profiles.restore(userId);
    if (!restored) throw profileNotFound();
    return await this.present(restored);
  }

  /**
   * Reports a pending deletion to its owner. Returns null for a live account, so the web
   * app can offer recovery without a second request.
   */
  async pendingDeletion(userId: string) {
    const current = await this.profiles.findByUserId(userId, true);
    if (!current?.deleted_at) return null;
    return {
      deleted_at: current.deleted_at,
      purges_at: profilePurgeDueAt(current.deleted_at).toISOString(),
      restorable: isProfileRestorable(current.deleted_at),
    };
  }

  /** Counts one open of a public profile. Nothing about the visitor is recorded. */
  async recordPublicView(username: string) {
    const profile = await this.profiles.findPublicByUsername(username);
    if (!profile) return { counted: false };
    await this.profiles.recordView(profile.id);
    return { counted: true };
  }

  async viewSummaryForOwner(userId: string) {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) throw profileNotFound();
    return await this.profiles.viewSummary(profile.id);
  }

  /** The profiles their owners chose to list in search engines. */
  async searchableProfiles() {
    void this.purgeDueProfiles();
    return await this.profiles.listSearchableUsernames();
  }

  async uploadPhoto(userId: string, bytes: Buffer) {
    if (!this.photos) throw new AppError(503, "PHOTO_STORAGE_UNAVAILABLE", "Photo uploads aren’t available right now.");
    if (bytes.length === 0 || bytes.length > MAX_PROFILE_PHOTO_BYTES) {
      throw new AppError(400, "INVALID_PROFILE_PHOTO", "Choose a photo smaller than 5 MB.");
    }
    const contentType = detectProfilePhotoType(bytes);
    if (!contentType) {
      throw new AppError(400, "INVALID_PROFILE_PHOTO", "Choose a JPEG, PNG, or WebP photo.");
    }
    const sanitized = sanitizeProfilePhoto(bytes, contentType);
    const current = await this.profiles.findByUserId(userId);
    if (!current) throw profileNotFound();
    const nextPath = await this.photos.upload(userId, sanitized, contentType);
    let updated: StoredProfile | null;
    try {
      updated = await this.profiles.updateAvatarPath(userId, nextPath);
    } catch (error) {
      await this.photos.remove(nextPath).catch(() => undefined);
      throw error;
    }
    if (!updated) {
      await this.photos.remove(nextPath).catch(() => undefined);
      throw profileNotFound();
    }
    if (current.avatar_path) await this.photos.remove(current.avatar_path).catch(() => undefined);
    return await this.present(updated);
  }

  async removePhoto(userId: string) {
    const current = await this.profiles.findByUserId(userId);
    if (!current) throw profileNotFound();
    if (!current.avatar_path) return await this.present(current);
    const updated = await this.profiles.updateAvatarPath(userId, null);
    if (!updated) throw profileNotFound();
    if (this.photos) await this.photos.remove(current.avatar_path).catch(() => undefined);
    return await this.present(updated);
  }
}
