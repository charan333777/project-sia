import { profileInputSchema, profileUpdateSchema, type Profile, type ProfileInput, type ProfileUpdate, type StoredProfile } from "@sia/validation";
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

  private async withPhotoUrl(profile: StoredProfile): Promise<Profile> {
    let avatarUrl: string | null = null;
    if (profile.avatar_path && this.photos) {
      try {
        avatarUrl = await this.photos.createSignedUrl(profile.avatar_path);
      } catch {
        // A storage outage should not make the rest of a profile unavailable.
      }
    }
    return { ...profile, avatar_url: avatarUrl };
  }

  async create(userId: string, rawInput: ProfileInput) {
    const input = profileInputSchema.parse(rawInput);
    if (await this.profiles.findByUserId(userId)) {
      throw new AppError(409, "PROFILE_EXISTS", "You already have a Sia profile.");
    }
    try {
      return await this.withPhotoUrl(await this.profiles.create(userId, input));
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
    return await this.withPhotoUrl(profile);
  }

  async getPublic(username: string) {
    const profile = await this.profiles.findPublicByUsername(username);
    if (!profile) throw profileNotFound();
    return await this.withPhotoUrl(profile);
  }

  async updateMine(userId: string, rawInput: ProfileUpdate) {
    const patch = profileUpdateSchema.parse(rawInput);
    const current = await this.profiles.findByUserId(userId);
    if (!current) throw profileNotFound();
    const input = profileInputSchema.parse({ ...current, ...patch });
    try {
      const updated = await this.profiles.update(userId, input);
      if (!updated) throw profileNotFound();
      return await this.withPhotoUrl(updated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
      }
      throw error;
    }
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
    return await this.withPhotoUrl(updated);
  }

  async removePhoto(userId: string) {
    const current = await this.profiles.findByUserId(userId);
    if (!current) throw profileNotFound();
    if (!current.avatar_path) return await this.withPhotoUrl(current);
    const updated = await this.profiles.updateAvatarPath(userId, null);
    if (!updated) throw profileNotFound();
    if (this.photos) await this.photos.remove(current.avatar_path).catch(() => undefined);
    return await this.withPhotoUrl(updated);
  }
}
