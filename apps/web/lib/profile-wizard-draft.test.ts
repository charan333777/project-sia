import { beforeEach, describe, expect, it } from "vitest";
import { emptyProfile } from "@/components/profile-form";
import { clearWizardDraft, PROFILE_WIZARD_KEY, readWizardDraft, saveWizardDraft } from "./profile-wizard-draft";
import { PROFILE_DRAFT_KEY } from "@sia/shared";

beforeEach(() => sessionStorage.clear());
const draft = { version: 1 as const, draft_id: "a9bb11ce-6ff0-4d78-b144-f7abc9f9c999", step: 1, avatar_mode: "initial" as const, username_touched: false, value: emptyProfile };

describe("unfinished setup storage", () => {
  it("restores incomplete fields without making them eligible for auth replay", () => {
    expect(saveWizardDraft(draft)).toBe(true);
    expect(readWizardDraft()).toEqual(draft);
    expect(sessionStorage.getItem(PROFILE_DRAFT_KEY)).toBeNull();
  });
  it("rejects corrupt, incompatible and out-of-range drafts", () => {
    for (const value of ["{bad", JSON.stringify({ ...draft, version: 99 }), JSON.stringify({ ...draft, step: 8 }), JSON.stringify({ ...draft, value: { ...emptyProfile, profile_character: "unknown" } })]) {
      sessionStorage.setItem(PROFILE_WIZARD_KEY, value);
      expect(readWizardDraft()).toBeNull();
    }
  });
  it("returns the photo scope when discarding the draft", () => {
    saveWizardDraft(draft);
    expect(clearWizardDraft()).toBe(draft.draft_id);
    expect(readWizardDraft()).toBeNull();
  });
});
