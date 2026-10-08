import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Profile } from "@sia/validation";
import { api } from "@/lib/api";
import { sampleProfile } from "@/lib/sample-profile";
import { EventReadyPanel } from "./event-ready-panel";

const profile = { ...sampleProfile, user_id: "u1", status: null } as Profile;
beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  } });
});
afterEach(() => vi.restoreAllMocks());

it("only applies a preset after an explicit action, keeps location and visibility separate", async () => {
  const user = userEvent.setup();
  const update = vi.spyOn(api, "updateProfile").mockResolvedValue(profile);
  const status = vi.spyOn(api, "setProfileStatus").mockResolvedValue(profile);
  const nearby = vi.spyOn(api, "updateNearbyPresence");
  const onChange = vi.fn();
  render(<EventReadyPanel profile={profile} token="token" onChange={onChange} />);
  await user.click(screen.getByText("Heading out? Set your moment"));
  await user.click(screen.getByRole("button", { name: "Café" }));
  expect(update).not.toHaveBeenCalled();
  expect(status).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Open for 3h" }));
  await waitFor(() => expect(status).toHaveBeenCalledWith({ state: "open", duration: "3h", detail: "Working from a café" }, "token"));
  expect(update).toHaveBeenCalledWith({ open_to: ["Coffee", "Sharing ideas"] }, "token");
  expect(nearby).not.toHaveBeenCalled();
  expect(onChange).toHaveBeenCalledTimes(2);
});

it("keeps device presets isolated by owner and provides removal", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<EventReadyPanel profile={profile} token="t" onChange={vi.fn()} />);
  await user.click(screen.getByText("Heading out? Set your moment"));
  await user.type(screen.getByLabelText("Save your current details as a preset"), "Design night");
  await user.click(screen.getByRole("button", { name: "Save on this device" }));
  expect(screen.getByRole("button", { name: "Design night" })).toBeTruthy();
  rerender(<EventReadyPanel profile={{ ...profile, user_id: "u2" }} token="t" onChange={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Design night" })).toBeNull();
  rerender(<EventReadyPanel profile={profile} token="t" onChange={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Remove saved presets" }));
  expect(window.localStorage.getItem("sia-event-presets:u1")).toBeNull();
});

it("shows a recoverable message when an update cannot finish", async () => {
  const user = userEvent.setup();
  vi.spyOn(api, "updateProfile").mockRejectedValue(new Error("offline"));
  const status = vi.spyOn(api, "setProfileStatus");
  render(<EventReadyPanel profile={{ ...profile, is_public: false }} token="t" onChange={vi.fn()} />);
  await user.click(screen.getByText("Heading out? Set your moment"));
  await user.click(screen.getByRole("button", { name: "Open for 3h" }));
  await screen.findByText("We couldn’t finish updating your moment. Check your status and try again.");
  expect(status).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Open for 3h" }).hasAttribute("disabled")).toBe(false);
});
