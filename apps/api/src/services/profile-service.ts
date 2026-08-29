import { profileInputSchema, profileUpdateSchema, type ProfileInput, type ProfileUpdate } from "@sia/validation";
import { AppError, profileNotFound } from "../errors.js";
import type { ProfileRepository } from "../repositories/profile-repository.js";

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export class ProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  async create(userId: string, rawInput: ProfileInput) {
    const input = profileInputSchema.parse(rawInput);
    if (await this.profiles.findByUserId(userId)) {
      throw new AppError(409, "PROFILE_EXISTS", "You already have a Sia profile.");
    }
    try {
      return await this.profiles.create(userId, input);
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
    return profile;
  }

  async getPublic(username: string) {
    const profile = await this.profiles.findPublicByUsername(username);
    if (!profile) throw profileNotFound();
    return profile;
  }

  async updateMine(userId: string, rawInput: ProfileUpdate) {
    const patch = profileUpdateSchema.parse(rawInput);
    const current = await this.getMine(userId);
    const input = profileInputSchema.parse({ ...current, ...patch });
    try {
      const updated = await this.profiles.update(userId, input);
      if (!updated) throw profileNotFound();
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
      }
      throw error;
    }
  }
}
