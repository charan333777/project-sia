import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps a same-site path", () => {
    expect(safeNextPath("/nearby")).toBe("/nearby");
    expect(safeNextPath("/profile/qr")).toBe("/profile/qr");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("nearby")).toBeNull();
  });

  it("rejects empty values and a loop back to login", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath("/login?next=/nearby")).toBeNull();
  });
});
