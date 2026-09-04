import { randomUUID } from "node:crypto";
import type {
  NearbyDuration,
  NearbyIntent,
  NearbyMeetPlanInput,
  NearbyMeetStatusCode,
  NearbyReportInput,
  ProfileInput,
  StoredProfile,
} from "@sia/validation";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthProvider } from "./auth/auth-provider.js";
import { buildApp } from "./app.js";
import type { ProfileRepository, ProfileStatusPatch } from "./repositories/profile-repository.js";
import type { NearbyRepository } from "./repositories/nearby-repository.js";
import type { ProfilePhotoStorage, ProfilePhotoType } from "./services/profile-photo-storage.js";

class FakeAuth implements AuthProvider {
  async verifyAccessToken(token: string) {
    return token === "valid" ? { userId: "user-1", email: "zach@example.com" } : null;
  }
}

class MemoryProfiles implements ProfileRepository {
  records: StoredProfile[] = [];

  async create(userId: string, input: ProfileInput) {
    if (this.records.some((profile) => profile.username === input.username)) {
      throw Object.assign(new Error("duplicate"), { code: "23505" });
    }
    const now = new Date().toISOString();
    const profile: StoredProfile = {
      ...input,
      id: randomUUID(),
      user_id: userId,
      avatar_path: null,
      status_state: "off",
      status_duration: null,
      status_expires_at: null,
      created_at: now,
      updated_at: now,
    };
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

  async updateAvatarPath(userId: string, avatarPath: string | null) {
    const index = this.records.findIndex((profile) => profile.user_id === userId);
    if (index < 0) return null;
    const existing = this.records[index]!;
    const updated = { ...existing, avatar_path: avatarPath, updated_at: new Date().toISOString() };
    this.records[index] = updated;
    return updated;
  }

  async updateStatus(userId: string, patch: ProfileStatusPatch) {
    const index = this.records.findIndex((profile) => profile.user_id === userId);
    if (index < 0) return null;
    const existing = this.records[index]!;
    const updated: StoredProfile = {
      ...existing,
      status_state: patch.state,
      status_duration: patch.duration,
      status_expires_at: patch.expiresAt ? patch.expiresAt.toISOString() : null,
      current_context: patch.detail ?? existing.current_context,
      updated_at: new Date().toISOString(),
    };
    this.records[index] = updated;
    return updated;
  }
}

class MemoryPhotos implements ProfilePhotoStorage {
  files = new Map<string, Buffer>();

  async upload(userId: string, bytes: Buffer, _contentType: ProfilePhotoType) {
    const path = `${userId}/${randomUUID()}.webp`;
    this.files.set(path, bytes);
    return path;
  }

  async remove(path: string) { this.files.delete(path); }
  async createSignedUrl(path: string) { return `https://photos.example/${path}?signed=1`; }
}

class MemoryNearby implements NearbyRepository {
  presence: { duration: NearbyDuration; visibleUntil: Date } | null = null;

  async pruneExpired() {}
  async getPresence() { return this.presence; }
  async upsertPresence(_userId: string, _latitude: number, _longitude: number, _accuracyM: number, duration: NearbyDuration, visibleUntil: Date) {
    this.presence = { duration, visibleUntil };
    return this.presence;
  }
  async removePresence() { this.presence = null; }
  async findNearby() { return []; }
  async createSignal(_userId: string, _targetProfileId: string, _intent: NearbyIntent) { return false; }
  async listSignals() { return []; }
  async respondToSignal(_userId: string, _signalId: string, _action: "accept" | "decline") { return false; }
  async listConnections() { return []; }
  async createMeetPlan(_userId: string, _connectionId: string, _input: NearbyMeetPlanInput, _expiresAt: Date) { return false; }
  async respondToMeetPlan(_userId: string, _meetPlanId: string, _action: "accept" | "decline" | "cancel") { return false; }
  async addMeetStatus(_userId: string, _meetPlanId: string, _code: NearbyMeetStatusCode) { return false; }
  async blockProfile() { return false; }
  async reportProfile(_userId: string, _input: NearbyReportInput) { return false; }
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
  let nearbyRepository: MemoryNearby;
  let photoStorage: MemoryPhotos;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    repository = new MemoryProfiles();
    nearbyRepository = new MemoryNearby();
    photoStorage = new MemoryPhotos();
    app = await buildApp({ authProvider: new FakeAuth(), profileRepository: repository, nearbyRepository, profilePhotoStorage: photoStorage });
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

  it("uploads, replaces, and removes a private profile photo", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });
    const boundary = "sia-photo-boundary";
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="avatar.webp"\r\nContent-Type: image/webp\r\n\r\n`),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const uploaded = await app.inject({
      method: "POST",
      url: "/api/v1/profiles/me/photo",
      headers: { ...headers, "content-type": `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(uploaded.statusCode).toBe(200);
    expect(uploaded.json().data.avatar_url).toContain("https://photos.example/user-1/");
    expect(photoStorage.files.size).toBe(1);

    const removed = await app.inject({ method: "DELETE", url: "/api/v1/profiles/me/photo", headers });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().data.avatar_url).toBeNull();
    expect(photoStorage.files.size).toBe(0);
  });

  it("rejects file content that is not a supported image", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });
    const boundary = "sia-invalid-photo-boundary";
    const payload = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="avatar.webp"\r\nContent-Type: image/webp\r\n\r\nnot-an-image\r\n--${boundary}--\r\n`);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profiles/me/photo",
      headers: { ...headers, "content-type": `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_PROFILE_PHOTO");
  });

  it("keeps Nearby hidden until an authenticated user deliberately shares location", async () => {
    const headers = { authorization: "Bearer valid" };
    const hidden = await app.inject({ method: "GET", url: "/api/v1/nearby", headers });
    expect(hidden.json().data.presence.active).toBe(false);

    const visible = await app.inject({
      method: "PUT",
      url: "/api/v1/nearby/presence",
      headers,
      payload: { latitude: 51.5072, longitude: -0.1276, accuracy_m: 16, duration: "15m" },
    });
    expect(visible.statusCode).toBe(200);
    expect(visible.json().data.presence).toMatchObject({ active: true, duration: "15m" });

    const hiddenAgain = await app.inject({ method: "DELETE", url: "/api/v1/nearby/presence", headers });
    expect(hiddenAgain.json().data.presence.active).toBe(false);
  });

  it("sets a status with a server-derived expiry and clears it again", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });

    const before = Date.now();
    const set = await app.inject({
      method: "PUT",
      url: "/api/v1/profiles/me/status",
      headers,
      payload: { state: "open", duration: "1h", detail: "At the design meetup" },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json().data.status).toMatchObject({ state: "open", duration: "1h", detail: "At the design meetup" });

    // The expiry is derived from the duration on the server, not sent by the client.
    const expiresAt = new Date(set.json().data.status.expires_at).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 59 * 60_000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 61 * 60_000);

    const cleared = await app.inject({ method: "DELETE", url: "/api/v1/profiles/me/status", headers });
    expect(cleared.json().data.status).toBeNull();
    expect(cleared.json().data.status_state).toBe("off");
  });

  it("ignores a client-supplied expiry", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });

    const forged = new Date(Date.now() + 400 * 24 * 60 * 60_000).toISOString();
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/profiles/me/status",
      headers,
      payload: { state: "open", duration: "30m", status_expires_at: forged, expires_at: forged },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.status.expires_at).not.toBe(forged);
    expect(new Date(response.json().data.status.expires_at).getTime()).toBeLessThan(Date.now() + 31 * 60_000);
  });

  it("never presents an expired status as live, on the owner or the public profile", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });
    await app.inject({
      method: "PUT",
      url: "/api/v1/profiles/me/status",
      headers,
      payload: { state: "focused", duration: "30m", detail: "Heads down" },
    });

    // Age the stored row past its expiry, exactly as the clock would.
    const stored = repository.records[0]!;
    stored.status_expires_at = new Date(Date.now() - 60_000).toISOString();

    const mine = await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers });
    expect(mine.json().data.status).toBeNull();
    expect(mine.json().data.status_state).toBe("off");
    expect(mine.json().data.status_expires_at).toBeNull();

    const publicView = await app.inject({ method: "GET", url: "/api/v1/public/profiles/zach" });
    expect(publicView.json().data.status).toBeNull();
    expect(publicView.json().data.status_state).toBe("off");
  });

  it("rejects an active status without a duration, and an unknown state", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });

    const noDuration = await app.inject({
      method: "PUT",
      url: "/api/v1/profiles/me/status",
      headers,
      payload: { state: "open" },
    });
    expect(noDuration.statusCode).toBe(400);
    expect(noDuration.json().error.code).toBe("VALIDATION_ERROR");

    const unknownState = await app.inject({
      method: "PUT",
      url: "/api/v1/profiles/me/status",
      headers,
      payload: { state: "busy", duration: "1h" },
    });
    expect(unknownState.statusCode).toBe(400);
  });

  it("requires a profile before a status can be set", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/profiles/me/status",
      headers: { authorization: "Bearer valid" },
      payload: { state: "around", duration: "3h" },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("PROFILE_NOT_FOUND");
  });

  it("rejects unapproved free-form Nearby messages", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nearby/signals",
      headers: { authorization: "Bearer valid" },
      payload: { target_profile_id: randomUUID(), intent: "send me your number" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });
});
