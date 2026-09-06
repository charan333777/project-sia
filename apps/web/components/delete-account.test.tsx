import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@sia/validation";
import { DeleteAccount } from "./delete-account";
import { api } from "@/lib/api";

const profile = {
  id: "p1", user_id: "u1", username: "charan", display_name: "Charan", role: "", bio: "",
  current_context: "", interests: [], open_to: [], is_public: true, profile_theme: "calm",
  profile_character: "plain", contact_items: [], list_in_search: false, avatar_path: null,
  avatar_url: null, deleted_at: null, status_state: "off", status_duration: null,
  status_expires_at: null, status: null, created_at: "", updated_at: "",
} as unknown as Profile;

afterEach(() => vi.restoreAllMocks());

describe("DeleteAccount", () => {
  it("does not delete on a single press", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "deleteProfile");
    render(<DeleteAccount profile={profile} token="t" onDeleted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Delete my Sia/ }));
    expect(spy).not.toHaveBeenCalled();
    // The real action is disabled until the username is typed.
    expect(screen.getByRole("button", { name: /Delete permanently/ })).toHaveProperty("disabled", true);
  });

  it("says plainly that the username never comes back", async () => {
    const user = userEvent.setup();
    render(<DeleteAccount profile={profile} token="t" onDeleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Delete my Sia/ }));

    expect(screen.getByText(/can never be used again/)).toBeTruthy();
    expect(screen.getByText(/30 days/)).toBeTruthy();
  });

  it("deletes only once the username matches", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "deleteProfile").mockResolvedValue({ deleted_at: "now", purges_at: "later", grace_days: 30 });
    const onDeleted = vi.fn();
    render(<DeleteAccount profile={profile} token="t" onDeleted={onDeleted} />);

    await user.click(screen.getByRole("button", { name: /Delete my Sia/ }));
    await user.type(screen.getByLabelText(/Type/), "wrong-name");
    expect(screen.getByRole("button", { name: /Delete permanently/ })).toHaveProperty("disabled", true);

    await user.clear(screen.getByLabelText(/Type/));
    await user.type(screen.getByLabelText(/Type/), "charan");
    await user.click(screen.getByRole("button", { name: /Delete permanently/ }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("t"));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it("backs out cleanly", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "deleteProfile");
    render(<DeleteAccount profile={profile} token="t" onDeleted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Delete my Sia/ }));
    await user.click(screen.getByRole("button", { name: /Keep my Sia/ }));

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Delete my Sia/ })).toBeTruthy();
  });
});
