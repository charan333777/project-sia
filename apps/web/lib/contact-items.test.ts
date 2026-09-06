import { describe, expect, it } from "vitest";
import type { ProfileInput } from "@sia/validation";
import { fieldStep, pruneEmptyContactItems } from "./contact-items.js";

const base: ProfileInput = {
  username: "zach", display_name: "Zach", role: "", bio: "", current_context: "",
  interests: [], open_to: [], is_public: false, profile_theme: "calm",
  profile_character: "plain", contact_items: [], list_in_search: false,
};

describe("pruneEmptyContactItems", () => {
  it("drops a row that was opened and never filled in", () => {
    // The exact shape the editor creates when someone taps "+ Link" and moves on.
    const value = { ...base, contact_items: [{ type: "link" as const, label: "", value: "", is_public: false }] };
    expect(pruneEmptyContactItems(value).contact_items).toEqual([]);
  });

  it("keeps a row carrying only a label, so it fails where it can be seen", () => {
    const value = { ...base, contact_items: [{ type: "link" as const, label: "LinkedIn", value: "", is_public: false }] };
    expect(pruneEmptyContactItems(value).contact_items).toHaveLength(1);
  });

  it("keeps whitespace-only rows out", () => {
    const value = { ...base, contact_items: [{ type: "phone" as const, label: "  ", value: "  ", is_public: false }] };
    expect(pruneEmptyContactItems(value).contact_items).toEqual([]);
  });

  it("leaves a filled card untouched and returns the same object", () => {
    const value = { ...base, contact_items: [{ type: "link" as const, label: "LinkedIn", value: "https://linkedin.com/in/zach", is_public: true }] };
    expect(pruneEmptyContactItems(value)).toBe(value);
  });

  it("tolerates a profile with no contact field at all", () => {
    const { contact_items: _omitted, ...withoutField } = base;
    expect(pruneEmptyContactItems(withoutField as ProfileInput).contact_items ?? []).toEqual([]);
  });

  it("routes every wizard field to the step that renders it", () => {
    expect(fieldStep.contact_items).toBe(2);
    expect(fieldStep.username).toBe(0);
    expect(fieldStep.is_public).toBe(4);
  });
});
