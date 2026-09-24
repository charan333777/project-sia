import { usernameSchema } from "@sia/validation";
import { describe, expect, it } from "vitest";
import { cleanUsernameInput, usernameFromName } from "./username";

describe("cleanUsernameInput", () => {
  it("drops characters the schema would reject as they are typed", () => {
    expect(cleanUsernameInput("Smoke Test!")).toBe("smoketest");
    expect(cleanUsernameInput("john.doe")).toBe("johndoe");
    expect(cleanUsernameInput("maya_k-2")).toBe("maya_k-2");
  });

  it("keeps a trailing separator while someone is still typing", () => {
    expect(cleanUsernameInput("maya-")).toBe("maya-");
  });

  it("caps the length at 30", () => {
    expect(cleanUsernameInput("a".repeat(40))).toHaveLength(30);
  });
});

describe("usernameFromName", () => {
  it("suggests a valid username from a display name", () => {
    expect(usernameFromName("Zoë Park")).toBe("zoepark");
    expect(usernameSchema.safeParse(usernameFromName("Zoë Park")).success).toBe(true);
    expect(usernameFromName("-Charan-")).toBe("charan");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(usernameFromName("李雷")).toBe("");
  });
});
