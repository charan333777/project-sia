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
      contact_items: input.contact_items ?? [],
      deleted_at: null,
      status_state: "off",
      status_duration: null,
      status_expires_at: null,
      created_at: now,
      updated_at: now,
    };
    this.records.push(profile);
    return profile;
  }

  async findByUserId(userId: string, includeDeleted = false) {
    const found = this.records.find((profile) => profile.user_id === userId) ?? null;
    if (!found) return null;
    return includeDeleted || !found.deleted_at ? found : null;
  }

  async findPublicByUsername(username: string) {
    return this.records.find((p) => p.username === username && p.is_public && !p.deleted_at) ?? null;
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

  retiredUsernames = new Set<string>();
  views = new Map<string, number>();

  async softDelete(userId: string) {
    const index = this.records.findIndex((p) => p.user_id === userId && !p.deleted_at);
    if (index < 0) return null;
    const updated = { ...this.records[index]!, deleted_at: new Date().toISOString() };
    this.records[index] = updated;
    return updated;
  }

  async restore(userId: string) {
    const index = this.records.findIndex((p) => p.user_id === userId && p.deleted_at);
    if (index < 0) return null;
    const updated = { ...this.records[index]!, deleted_at: null };
    this.records[index] = updated;
    return updated;
  }

  async isUsernameRetired(username: string) {
    return this.retiredUsernames.has(username);
  }

  async purgeDeleted(graceDays: number) {
    const cutoff = Date.now() - graceDays * 24 * 60 * 60_000;
    const due = this.records.filter((p) => p.deleted_at && new Date(p.deleted_at).getTime() <= cutoff);
    for (const profile of due) this.retiredUsernames.add(profile.username);
    this.records = this.records.filter((p) => !due.includes(p));
    return due.map((p) => p.avatar_path).filter((path): path is string => Boolean(path));
  }

  async recordView(profileId: string) {
    this.views.set(profileId, (this.views.get(profileId) ?? 0) + 1);
  }

  async viewSummary(profileId: string) {
    const total = this.views.get(profileId) ?? 0;
    return { total, last_7_days: total, last_30_days: total };
  }

  async listSearchableUsernames() {
    return this.records
      .filter((p) => p.list_in_search && p.is_public && !p.deleted_at)
      .map((p) => ({ username: p.username, updated_at: p.updated_at }));
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
  contact_items: [],
  list_in_search: false,
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

  it("keeps hidden contact details out of a public profile entirely", async () => {
    const headers = { authorization: "Bearer valid" };
    const contact_items = [
      { type: "link", label: "LinkedIn", value: "https://linkedin.com/in/zach", is_public: true },
      { type: "phone", label: "Mobile", value: "+44 7700 900123", is_public: false },
      { type: "email", label: "Personal", value: "zach@example.com", is_public: false },
    ];
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: { ...input, contact_items } });

    const mine = await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers });
    expect(mine.json().data.contact_items).toHaveLength(3);

    const scanned = await app.inject({ method: "GET", url: "/api/v1/public/profiles/zach" });
    const published = scanned.json().data.contact_items;
    expect(published).toEqual([
      { type: "link", label: "LinkedIn", value: "https://linkedin.com/in/zach", is_public: true },
    ]);
    // The hidden values must be absent from the payload, not merely unrendered.
    expect(scanned.payload).not.toContain("7700 900123");
    expect(scanned.payload).not.toContain("zach@example.com");
  });

  it("still serves a profile stored before the contact column existed", async () => {
    // Reproduces the production failure of 2026-09-05: the API shipped ahead of the
    // migration, every stored row lacked `contact_items`, and every public profile 500'd.
    await repository.create("user-1", input);
    const stored = repository.records[0]! as Partial<StoredProfile>;
    delete stored.contact_items;

    const scanned = await app.inject({ method: "GET", url: "/api/v1/public/profiles/zach" });
    expect(scanned.statusCode).toBe(200);
    expect(scanned.json().data.contact_items).toEqual([]);

    const mine = await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers: { authorization: "Bearer valid" } });
    expect(mine.statusCode).toBe(200);
    expect(mine.json().data.contact_items).toEqual([]);
  });

  it("refuses a contact link that is not http or https", async () => {
    const headers = { authorization: "Bearer valid" };
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers,
      payload: { ...input, contact_items: [{ type: "link", value: "javascript:alert(1)", is_public: true }] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("does not publish a contact detail added without an explicit choice", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers,
      payload: { ...input, contact_items: [{ type: "phone", value: "+44 7700 900123" }] },
    });
    const scanned = await app.inject({ method: "GET", url: "/api/v1/public/profiles/zach" });
    expect(scanned.json().data.contact_items).toEqual([]);
  });

  it("hides a deleted profile everywhere at once, and can bring it back", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });

    const deleted = await app.inject({ method: "DELETE", url: "/api/v1/profiles/me", headers });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().data.grace_days).toBe(30);

    // Gone from the scanner's view and from the owner's, immediately — not on a sweep.
    expect((await app.inject({ method: "GET", url: "/api/v1/public/profiles/zach" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers })).statusCode).toBe(404);

    const pending = await app.inject({ method: "GET", url: "/api/v1/profiles/me/deletion", headers });
    expect(pending.json().data.restorable).toBe(true);

    const restored = await app.inject({ method: "POST", url: "/api/v1/profiles/me/restore", headers });
    expect(restored.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/v1/public/profiles/zach" })).statusCode).toBe(200);
  });

  it("refuses writes to a profile that is awaiting purge", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });
    await app.inject({ method: "DELETE", url: "/api/v1/profiles/me", headers });

    const edit = await app.inject({ method: "PATCH", url: "/api/v1/profiles/me", headers, payload: { bio: "Back again" } });
    expect(edit.statusCode).toBe(404);
  });

  it("never reissues the username of a purged account", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });
    await app.inject({ method: "DELETE", url: "/api/v1/profiles/me", headers });

    // Age the deletion past the grace window and let the sweep run.
    const record = repository.records[0]!;
    record.deleted_at = new Date(Date.now() - 31 * 24 * 60 * 60_000).toISOString();
    await repository.purgeDeleted(30);
    expect(repository.records).toHaveLength(0);

    // A printed card pointing at /u/zach must never resolve to somebody else.
    const reuse = await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });
    expect(reuse.statusCode).toBe(409);
    expect(reuse.json().error.code).toBe("USERNAME_TAKEN");
  });

  it("counts a public view without recording anything about the visitor", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });

    await app.inject({ method: "POST", url: "/api/v1/public/profiles/zach/view" });
    await app.inject({ method: "POST", url: "/api/v1/public/profiles/zach/view" });

    const summary = await app.inject({ method: "GET", url: "/api/v1/profiles/me/views", headers });
    expect(summary.json().data.total).toBe(2);
  });

  it("lists only profiles whose owners opted into search", async () => {
    const headers = { authorization: "Bearer valid" };
    await app.inject({ method: "POST", url: "/api/v1/profiles", headers, payload: input });

    const hidden = await app.inject({ method: "GET", url: "/api/v1/public/profiles" });
    expect(hidden.json().data).toEqual([]);

    await app.inject({ method: "PATCH", url: "/api/v1/profiles/me", headers, payload: { list_in_search: true } });
    const listed = await app.inject({ method: "GET", url: "/api/v1/public/profiles" });
    expect(listed.json().data.map((row: { username: string }) => row.username)).toEqual(["zach"]);
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

  it("rate limits per signed-in user, not per shared network", async () => {
    // A meetup is one wifi and one IP. An IP-keyed limiter would throttle the whole room as
    // though it were a single person — exactly the situation Nearby is built for.
    const jwtFor = (sub: string) => {
      const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
      return `${part({ alg: "HS256", typ: "JWT" })}.${part({ sub })}.signature`;
    };
    const headersFor = (sub: string) => ({ authorization: `Bearer ${jwtFor(sub)}` });

    // Spend the first person's whole per-minute budget from this IP.
    const first = headersFor("person-a");
    for (let index = 0; index < 100; index += 1) {
      await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers: first });
    }
    const exhausted = await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers: first });
    expect(exhausted.statusCode).toBe(429);
    expect(exhausted.json().error.code).toBe("RATE_LIMITED");

    // Someone else on the same wifi still gets their own budget.
    const second = await app.inject({ method: "GET", url: "/api/v1/profiles/me", headers: headersFor("person-b") });
    expect(second.statusCode).toBe(401);
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
