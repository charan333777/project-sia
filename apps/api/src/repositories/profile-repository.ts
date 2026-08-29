import type { Profile, ProfileInput } from "@sia/validation";

export interface ProfileRepository {
  create(userId: string, input: ProfileInput): Promise<Profile>;
  findByUserId(userId: string): Promise<Profile | null>;
  findPublicByUsername(username: string): Promise<Profile | null>;
  update(userId: string, input: ProfileInput): Promise<Profile | null>;
}
