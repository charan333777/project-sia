import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@sia/validation";
import { ProfileStatusNudge } from "./profile-status-nudge";
import { api } from "@/lib/api";

const profile = {
  id: "p1", user_id: "u1", username: "charan", display_name: "Charan", role: "", bio: "",
  current_context: "At the design meetup", interests: [], open_to: [], is_public: true, profile_theme: "calm",
  profile_character: "plain", contact_items: [], list_in_search: false, avatar_path: null,
  avatar_url: null, deleted_at: null, status_state: "off", status_duration: null,
  status_expires_at: null, status: null, created_at: "", updated_at: "",
} as unknown as Profile;

const live = {
  ...profile,
  status_state: "open",
  status_duration: "3h",
  status: { state: "open", duration: "3h", expires_at: "2026-09-24T21:00:00.000Z", detail: "At the design meetup" },
} as unknown as Profile;

/**
 * Node 25 ships its own `localStorage` global, which shadows jsdom's and has no methods
 * unless Node is given a storage file — so each test gets a plain in-memory one.
 */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key); },
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { value: memoryStorage(), configurable: true });
});
afterEach(() => vi.restoreAllMocks());

describe("ProfileStatusNudge", () => {
  it("sets Open for three hours in one tap, keeping the right-now line", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "setProfileStatus").mockResolvedValue(live);
    const onChange = vi.fn();
    render(<ProfileStatusNudge profile={profile} token="t" onChange={onChange} />);

    await user.click(await screen.findByRole("button", { name: "Open for 3h" }));

    // Sending the detail back matters: it is the right-now line, and leaving it out clears it.
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ state: "open", duration: "3h", detail: "At the design meetup" }, "t"));
    expect(onChange).toHaveBeenCalledWith(live);
  });

  it("stays out of the way when a status is already showing, or nobody can see it", () => {
    const { rerender } = render(<ProfileStatusNudge profile={live} token="t" onChange={vi.fn()} />);
    expect(screen.queryByText("Heading out?")).toBeNull();

    rerender(<ProfileStatusNudge profile={{ ...profile, is_public: false }} token="t" onChange={vi.fn()} />);
    expect(screen.queryByText("Heading out?")).toBeNull();
  });

  it("stays quiet on this device after Not now", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ProfileStatusNudge profile={profile} token="t" onChange={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "Not now" }));
    expect(screen.queryByText("Heading out?")).toBeNull();

    unmount();
    render(<ProfileStatusNudge profile={profile} token="t" onChange={vi.fn()} />);
    // Give the storage read its effect, then confirm it is still hidden.
    await waitFor(() => expect(screen.queryByText("Heading out?")).toBeNull());
  });
});
