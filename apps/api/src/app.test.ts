import { randomUUID } from "node:crypto";
import type { Profile, ProfileInput } from "@sia/validation";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthProvider } from "./auth/auth-provider.js";
import { buildApp } from "./app.js";
import type { ProfileRepository } from "./repositories/profile-repository.js";

class FakeAuth implements AuthProvider {
  async verifyAccessToken(token: string) {
    return token === "valid" ? { userId: "user-1", email: "zach@example.com" } : null;
  }
}

class MemoryProfiles implements ProfileRepository {
  records: Profile[] = [];

  async create(userId: string, input: ProfileInput) {
    if (this.records.some((profile) => profile.username === input.username)) {
      throw Object.assign(new Error("duplicate"), { code: "23505" });
    }
    const now = new Date().toISOString();
    const profile = { ...input, id: randomUUID(), user_id: userId, created_at: now, updated_at: now };
    this.records.push(profile);
    return profile;
  }

  async findByUserId(userId: string) {
    return this.records.find((profile) => profile.user_id === userId) ?? null;
  }

  async findPublicByUsername(username: string) {
    return this.records.find((profile) => profile.username === username && profile.is_public) ?? null;
  }

  async update(userId: string, input: ProfileInput) {
    const index = this.records.findIndex((profile) => profile.user_id === userId);
    if (index < 0) return null;
    const existing = this.records[index]!;
    const updated = { ...existing, ...input, updated_at: new Date().toISOString() };
    this.records[index] = updated;
    return updated;
  }
}

const input = {
  username: "zach",
  display_name: "Zach",
  role: "AI Engineer",
  bio: "Building useful things.",
  current_context: "Heading to an AI meetup",
  interests: ["AI", "Startups"],
  open_to: ["A quick chat", "Coffee"],
  is_public: true,
  profile_theme: "calm" as const,
  profile_character: "elephant" as const,
};

describe("profile API", () => {
  let repository: MemoryProfiles;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    repository = new MemoryProfiles();
    app = await buildApp({ authProvider: new FakeAuth(), profileRepository: repository });
  });

  afterEach(async () => app.close());

  it("rejects protected endpoints without a valid token", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/profiles/me" });
    expect(response.statusCode).toBe(401);
  });

  it("creates, retrieves, and edits an owned profile", async () => {
    const headers = { authorization: "Bearer valid" };
    const created = await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });
    expect(created.statusCode).toBe(201);

    const mine = await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers });
    expect(mine.json().data.username).toBe("zach");

    const edited = await app.inject({ method: "PATCH", url: "/api/v1/profiles/me", headers, payload: { current_context: "Having coffee" } });
    expect(edited.json().data.current_context).toBe("Having coffee");

    const themed = await app.inject({ method: "PATCH", url: "/api/v1/profiles/me", headers, payload: { profile_theme: "warm" } });
    expect(themed.json().data.profile_theme).toBe("warm");

    const characterised = await app.inject({ method: "PATCH", url: "/api/v1/profiles/me", headers, payload: { profile_character: "panda" } });
    expect(characterised.json().data.profile_character).toBe("panda");
  });

  it("serves public profiles without authentication", async () => {
    await repository.create("user-1", input);
    const response = await app.inject({ method: "GET", url: "/api/v1/public/profiles/ZACH" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.display_name).toBe("Zach");
  });

  it("returns a friendly 404 for a missing public profile", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/public/profiles/missing" });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("PROFILE_NOT_FOUND");
  });

  it("returns a conflict for duplicate usernames", async () => {
    await repository.create("another-user", input);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers: { authorization: "Bearer valid" },
      payload: input,
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("USERNAME_TAKEN");
  });
});
