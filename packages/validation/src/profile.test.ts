import { describe, expect, it } from "vitest";
import { profileInputSchema, usernameSchema } from "./profile.js";

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
