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
  });
});
