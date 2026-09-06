import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProfileInput } from "@sia/validation";
import { ProfileForm } from "./profile-form";

/**
 * These cover the wiring between form state and the rendered error — where both of the
 * 2026-09-05 bugs lived, and the one thing a schema unit test cannot reach.
 */

/** Walks the wizard to the Connect step, where contact details are entered. */
async function openConnectStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "New User");
  await user.type(screen.getByLabelText("Username"), "newuser");
  await user.click(screen.getByRole("button", { name: /^Next/ }));
  await screen.findByLabelText(/What.s happening/);
  await user.click(screen.getByRole("button", { name: /^Next/ }));
  await screen.findByRole("button", { name: "Link" });
}

/** Advances from Connect through Style to Visibility, then chooses Public. */
async function finishWizard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Next/ }));
  await screen.findByText(/How would you like to appear/);
  await user.click(screen.getByRole("button", { name: /^Next/ }));
  await screen.findByText(/Who can open your profile/);
  await user.click(screen.getByRole("radio", { name: /Public/ }));
}

describe("ProfileForm — contact details", () => {
  it("submits when a contact row was opened but never filled in", async () => {
    // The reported signup dead end: tapping "+ Link" out of curiosity made the profile
    // unsaveable, because the error rendered on a step the person had already left.
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={onSubmit} />);

    await openConnectStep(user);
    await user.click(screen.getByRole("button", { name: "Link" }));
    await finishWizard(user);
    await user.click(screen.getByRole("button", { name: "Create my Sia" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0]![0] as ProfileInput;
    expect(submitted.contact_items).toEqual([]);
  });

  it("shows the reason on the step that owns it instead of failing silently", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={onSubmit} />);

    await openConnectStep(user);
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Link label"), "LinkedIn");
    // A label with no address is a real mistake and must be visible, not discarded.
    await user.click(screen.getByRole("button", { name: /^Next/ }));

    expect(await screen.findByText("Link cannot be empty.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    // Still on Connect, where the offending field is.
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy();
  });

  it("refuses a link that is not a web address", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={onSubmit} />);

    await openConnectStep(user);
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Link value"), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: /^Next/ }));

    expect(await screen.findByText(/Enter a web address/)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("carries a completed contact detail through, hidden until published", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={onSubmit} />);

    await openConnectStep(user);
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Link label"), "LinkedIn");
    await user.type(screen.getByLabelText("Link value"), "linkedin.com/in/me");
    await finishWizard(user);
    await user.click(screen.getByRole("button", { name: "Create my Sia" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0]![0] as ProfileInput;
    expect(submitted.contact_items).toEqual([
      { type: "link", label: "LinkedIn", value: "https://linkedin.com/in/me", is_public: false },
    ]);
  });

  it("publishes a detail only when the visibility toggle is used", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={onSubmit} />);

    await openConnectStep(user);
    await user.click(screen.getByRole("button", { name: "Phone" }));
    await user.type(screen.getByLabelText("Phone value"), "+44 7700 900123");
    await user.click(screen.getByRole("button", { name: /Hidden/ }));
    await finishWizard(user);
    await user.click(screen.getByRole("button", { name: "Create my Sia" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0]![0] as ProfileInput;
    expect(submitted.contact_items[0]!.is_public).toBe(true);
  });
});
