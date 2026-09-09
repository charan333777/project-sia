import { PROFILE_DRAFT_KEY } from "@sia/shared";
import type { Profile } from "@sia/validation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, api } from "@/lib/api";
import LoginPage from "./page";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signOut: vi.fn(async () => undefined),
  refreshSession: vi.fn(),
  loadPhoto: vi.fn(),
  clearPhoto: vi.fn(async () => undefined),
  session: { access_token: "stale-token" } as { access_token: string } | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/login",
}));

vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({ session: mocks.session, loading: false, configured: true, signOut: mocks.signOut }),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: { refreshSession: mocks.refreshSession } }),
}));

vi.mock("@/lib/profile-photo-draft", () => ({
  loadProfilePhotoDraft: mocks.loadPhoto,
  clearProfilePhotoDraft: mocks.clearPhoto,
  saveProfilePhotoDraft: vi.fn(),
}));

const savedProfile = { username: "charan", display_name: "Charan" } as unknown as Profile;
const draft = () => sessionStorage.getItem(PROFILE_DRAFT_KEY);

beforeEach(() => {
  sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify({ username: "charan", display_name: "Charan" }));
  mocks.session = { access_token: "stale-token" };
  mocks.loadPhoto.mockResolvedValue(undefined);
  mocks.refreshSession.mockResolvedValue({ data: { session: null } });
});

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("the profile draft hand-off", () => {
  it("still treats an existing profile as success", async () => {
    // A 409 is terminal by status, so the PROFILE_EXISTS pardon has to happen first.
    vi.spyOn(api, "createProfile").mockRejectedValue(
      new ApiRequestError("PROFILE_EXISTS", "You already have a Sia profile.", 409),
    );
    render(<LoginPage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/profile?created=1"));
    expect(draft()).toBeNull();
  });

  it("shows the real reason rather than a generic shrug", async () => {
    vi.spyOn(api, "createProfile").mockRejectedValue(
      new ApiRequestError("USERNAME_TAKEN", "That username is already in use.", 409),
    );
    render(<LoginPage />);

    expect(await screen.findByText(/That username is already in use\./)).toBeTruthy();
    expect(screen.queryByText(/That didn’t work\. Try again in a moment\./)).toBeNull();
  });

  it("lets an unrepeatable draft go so the error cannot greet you again", async () => {
    vi.spyOn(api, "createProfile").mockRejectedValue(
      new ApiRequestError("USERNAME_TAKEN", "That username is already in use.", 409),
    );
    render(<LoginPage />);

    await screen.findByText(/That username is already in use\./);
    await waitFor(() => expect(draft()).toBeNull());
    expect(screen.getByRole("button", { name: /Continue/ })).toBeTruthy();
  });

  it("keeps the draft when the moment was wrong, and offers a way out", async () => {
    vi.spyOn(api, "createProfile").mockRejectedValue(new ApiRequestError("INTERNAL", "Something broke.", 503));
    render(<LoginPage />);

    expect(await screen.findByText(/Almost there/)).toBeTruthy();
    expect(draft()).not.toBeNull();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Continue without it/ })).toBeTruthy();
  });

  it("discards the draft when someone takes the way out", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "createProfile").mockRejectedValue(new ApiRequestError("INTERNAL", "Something broke.", 503));
    render(<LoginPage />);

    await screen.findByText(/Almost there/);
    await user.click(screen.getByRole("button", { name: /Continue without it/ }));

    await waitFor(() => expect(draft()).toBeNull());
    expect(mocks.replace).toHaveBeenCalledWith("/profile");
  });

  it("refreshes a dead token once instead of retrying with it", async () => {
    const create = vi
      .spyOn(api, "createProfile")
      .mockRejectedValueOnce(new ApiRequestError("UNAUTHORIZED", "Please log in to continue.", 401))
      .mockResolvedValueOnce(savedProfile);
    mocks.refreshSession.mockResolvedValue({ data: { session: { access_token: "fresh-token" } } });
    render(<LoginPage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/profile?created=1"));
    expect(create.mock.calls.map((call) => call[1])).toEqual(["stale-token", "fresh-token"]);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(draft()).toBeNull();
  });

  it("asks for a fresh login when the refresh is dead too, keeping the draft", async () => {
    vi.spyOn(api, "createProfile").mockRejectedValue(
      new ApiRequestError("UNAUTHORIZED", "Please log in to continue.", 401),
    );
    render(<LoginPage />);

    expect(await screen.findByText(/Please log in again/)).toBeTruthy();
    expect(draft()).not.toBeNull();
    expect(screen.getByRole("button", { name: /Log in again/ })).toBeTruthy();
  });

  it("does not let a rejected photo cost someone the profile", async () => {
    vi.spyOn(api, "createProfile").mockResolvedValue(savedProfile);
    mocks.loadPhoto.mockResolvedValue(new Blob(["x"], { type: "image/webp" }));
    vi.spyOn(api, "uploadProfilePhoto").mockRejectedValue(
      new ApiRequestError("INVALID_PROFILE_PHOTO", "Choose a JPEG, PNG, or WebP photo smaller than 5 MB.", 400),
    );
    render(<LoginPage />);

    expect(await screen.findByText(/Your Sia is saved/)).toBeTruthy();
    expect(screen.getByText(/smaller than 5 MB/)).toBeTruthy();
    await waitFor(() => expect(draft()).toBeNull());
  });

  it("does not let a blocked photo store fail the hand-off", async () => {
    vi.spyOn(api, "createProfile").mockResolvedValue(savedProfile);
    mocks.loadPhoto.mockRejectedValue(new Error("InvalidStateError"));
    const upload = vi.spyOn(api, "uploadProfilePhoto");
    render(<LoginPage />);

    expect(await screen.findByText(/Your Sia is saved/)).toBeTruthy();
    expect(upload).not.toHaveBeenCalled();
    await waitFor(() => expect(draft()).toBeNull());
  });
});
