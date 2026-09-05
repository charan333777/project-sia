import {
  profileInputSchema,
  profileStatusExpiry,
  profileStatusInputSchema,
  profileUpdateSchema,
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

export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly photos?: ProfilePhotoStorage,
  ) {}

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
    if (await this.profiles.findByUserId(userId)) {
      throw new AppError(409, "PROFILE_EXISTS", "You already have a Sia profile.");
    }
    try {
      return await this.present(await this.profiles.create(userId, input));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
      }
      throw error;
    }
  }

  async getMine(userId: string) {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) throw profileNotFound();
    return await this.present(profile);
  }

  async getPublic(username: string) {
    const profile = await this.profiles.findPublicByUsername(username);
    if (!profile) throw profileNotFound();
    return await this.presentPublic(profile);
  }

  async updateMine(userId: string, rawInput: ProfileUpdate) {
    const patch = profileUpdateSchema.parse(rawInput);
    const current = await this.profiles.findByUserId(userId);
    if (!current) throw profileNotFound();
    const input = profileInputSchema.parse({ ...current, ...patch });
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
