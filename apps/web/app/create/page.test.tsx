import { PROFILE_DRAFT_KEY } from "@sia/shared";
import type { Profile } from "@sia/validation";
import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, api } from "@/lib/api";
import CreatePage from "./page";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "",
  session: null as { access_token: string } | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
  usePathname: () => "/create",
}));

vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({ session: mocks.session, loading: false, configured: true, signOut: vi.fn() }),
}));

vi.mock("@/lib/profile-photo-draft", () => ({
  loadProfilePhotoDraft: vi.fn(async () => undefined),
  clearProfilePhotoDraft: vi.fn(async () => undefined),
  saveProfilePhotoDraft: vi.fn(async () => undefined),
}));

const savedDraft = {
  username: "taken", display_name: "Taken Name", role: "", bio: "", current_context: "", interests: [], open_to: [],
  is_public: true, profile_theme: "calm", profile_character: "plain", contact_items: [], list_in_search: false,
};

beforeEach(() => {
  mocks.search = "";
  mocks.session = null;
});

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("the create page", () => {
  it("reopens a draft /login could not save, on the username that failed", async () => {
    // StrictMode runs the effect twice; the first run must not eat the draft the second needs.
    sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(savedDraft));
    mocks.search = "resume=username";
    mocks.session = { access_token: "token" };
    vi.spyOn(api, "getMyProfile").mockRejectedValue(new ApiRequestError("PROFILE_NOT_FOUND", "Profile not found.", 404));
    vi.spyOn(api, "getPendingDeletion").mockResolvedValue(null);
    render(<StrictMode><CreatePage /></StrictMode>);

    expect(await screen.findByDisplayValue("taken")).toBeTruthy();
    expect(screen.getByText("That username is taken. Try another one.")).toBeTruthy();
    // Out of storage, so /login cannot replay it on a later visit.
    await waitFor(() => expect(sessionStorage.getItem(PROFILE_DRAFT_KEY)).toBeNull());
  });

  it("sends someone who already has a Sia to it instead of the wizard", async () => {
    mocks.session = { access_token: "token" };
    vi.spyOn(api, "getMyProfile").mockResolvedValue({ username: "charan" } as unknown as Profile);
    render(<CreatePage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/profile"));
    expect(screen.queryByLabelText("Username")).toBeNull();
  });

  it("starts empty without a resume request, even if a draft is lying around", async () => {
    sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(savedDraft));
    render(<CreatePage />);

    expect(await screen.findByLabelText("Username")).toHaveProperty("value", "");
  });
});
