import { describe, expect, it } from "vitest";
import {
  profileInputSchema,
  profileStatusExpiry,
  profileStatusInputSchema,
  resolveProfileStatus,
  usernameSchema,
} from "./profile.js";

describe("profile validation", () => {
  it("normalizes usernames", () => {
    expect(usernameSchema.parse("  Zach_Dev  ")).toBe("zach_dev");
  });

  it("rejects unsafe and reserved usernames", () => {
    expect(usernameSchema.safeParse("bad name").success).toBe(false);
    expect(usernameSchema.safeParse("profile").success).toBe(false);
  });

  it("deduplicates tags", () => {
    const profile = profileInputSchema.parse({
      username: "zach",
      display_name: "Zach",
      interests: ["AI", "AI"],
      open_to: [],
    });
    expect(profile.interests).toEqual(["AI"]);
    expect(profile.is_public).toBe(false);
    expect(profile.profile_theme).toBe("calm");
    expect(profile.profile_character).toBe("plain");
  });

  it("accepts known profile themes and rejects unknown ones", () => {
    const base = { username: "zach", display_name: "Zach" };
    expect(profileInputSchema.parse({ ...base, profile_theme: "play" }).profile_theme).toBe("play");
    expect(profileInputSchema.safeParse({ ...base, profile_theme: "neon-rainbow" }).success).toBe(false);
  });

  it("accepts known profile characters and rejects unknown ones", () => {
    const base = { username: "zach", display_name: "Zach" };
    expect(profileInputSchema.parse({ ...base, profile_character: "plain" }).profile_character).toBe("plain");
    expect(profileInputSchema.parse({ ...base, profile_character: "panda" }).profile_character).toBe("panda");
    expect(profileInputSchema.safeParse({ ...base, profile_character: "dragon" }).success).toBe(false);
  });
});

describe("profile status", () => {
  const active = {
    status_state: "open" as const,
    status_duration: "1h" as const,
    status_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    current_context: "At the design meetup",
  };

  it("derives an expiry from the chosen duration", () => {
    const from = new Date("2026-09-04T10:00:00.000Z");
    expect(profileStatusExpiry("30m", from).toISOString()).toBe("2026-09-04T10:30:00.000Z");
    expect(profileStatusExpiry("8h", from).toISOString()).toBe("2026-09-04T18:00:00.000Z");
  });

  it("resolves a live status, carrying current_context as the detail", () => {
    expect(resolveProfileStatus(active)).toMatchObject({
      state: "open",
      duration: "1h",
      detail: "At the design meetup",
    });
  });

  it("treats an elapsed status as no status", () => {
    const expired = { ...active, status_expires_at: new Date(Date.now() - 1_000).toISOString() };
    expect(resolveProfileStatus(expired)).toBeNull();
  });

  it("treats 'off' and malformed rows as no status", () => {
    expect(resolveProfileStatus({ ...active, status_state: "off" })).toBeNull();
    expect(resolveProfileStatus({ ...active, status_expires_at: null })).toBeNull();
    expect(resolveProfileStatus({ ...active, status_duration: null })).toBeNull();
    expect(resolveProfileStatus({ ...active, status_expires_at: "not-a-date" })).toBeNull();
  });

  it("requires a duration for an active state but not for 'off'", () => {
    expect(profileStatusInputSchema.safeParse({ state: "off" }).success).toBe(true);
    expect(profileStatusInputSchema.safeParse({ state: "open" }).success).toBe(false);
    expect(profileStatusInputSchema.safeParse({ state: "open", duration: "1h" }).success).toBe(true);
    expect(profileStatusInputSchema.safeParse({ state: "open", duration: "2h" }).success).toBe(false);
    expect(profileStatusInputSchema.safeParse({ state: "busy", duration: "1h" }).success).toBe(false);
  });

  it("does not accept an expiry from the client", () => {
    const parsed = profileStatusInputSchema.parse({
      state: "around",
      duration: "3h",
      expires_at: "2099-01-01T00:00:00.000Z",
    });
    expect(parsed).not.toHaveProperty("expires_at");
  });
});
