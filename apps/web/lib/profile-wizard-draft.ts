import { profileWizardDraftSchema, type ProfileWizardDraft } from "@sia/validation";

export const PROFILE_WIZARD_KEY = "sia-profile-wizard-v1";

/** Unfinished work never enters the completed draft key that /login replays. */
export function readWizardDraft(): ProfileWizardDraft | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_WIZARD_KEY);
    if (!raw) return null;
    const parsed = profileWizardDraftSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    sessionStorage.removeItem(PROFILE_WIZARD_KEY);
  } catch { /* Storage may be disabled. The form still works. */ }
  return null;
}

export function saveWizardDraft(draft: ProfileWizardDraft): boolean {
  try {
    sessionStorage.setItem(PROFILE_WIZARD_KEY, JSON.stringify(draft));
    return true;
  } catch { return false; }
}

export function clearWizardDraft() {
  const id = readWizardDraft()?.draft_id;
  try { sessionStorage.removeItem(PROFILE_WIZARD_KEY); } catch { /* optional local storage */ }
  return id;
}
