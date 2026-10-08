import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProfileInput } from "@sia/validation";
import { emptyProfile, ProfileForm } from "./profile-form";

/**
 * These cover the wiring between form state and the rendered error — where both of the
 * 2026-09-05 bugs lived, and the one thing a schema unit test cannot reach.
 */

/** Optional contacts live in the final review stage. */
async function openConnectStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "New User");
  await user.clear(screen.getByLabelText("Username"));
  await user.type(screen.getByLabelText("Username"), "newuser");
  await user.click(screen.getByRole("button", { name: /^Next/ }));
  await screen.findByLabelText(/What.s happening/);
  await user.click(screen.getByRole("button", { name: /^Next/ }));
  await user.click(screen.getByText("Ways to reach you", { selector: "summary" }));
}

async function finishWizard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: /Anyone who scans/ }));
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
    await user.click(screen.getByRole("button", { name: "Create my Sia" }));

    expect(await screen.findByText("Link cannot be empty.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    // Still on Reach, where the offending field is.
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy();
  });

  it("refuses a link that is not a web address", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={onSubmit} />);

    await openConnectStep(user);
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Link value"), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Create my Sia" }));

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

describe("ProfileForm — username", () => {
  it("suggests a username from the name until the person edits it", async () => {
    const user = userEvent.setup();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Your name"), "Zoë Park");
    expect(screen.getByLabelText("Username")).toHaveProperty("value", "zoepark");

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "zoe");
    await user.type(screen.getByLabelText("Your name"), "r");
    expect(screen.getByLabelText("Username")).toHaveProperty("value", "zoe");
  });

  it("drops characters a username cannot hold as they are typed", async () => {
    const user = userEvent.setup();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Username"), "Smoke Test!");
    expect(screen.getByLabelText("Username")).toHaveProperty("value", "smoketest");
  });

  it("clears an error as soon as the value it described changes", async () => {
    const user = userEvent.setup();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Your name"), "Al");
    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "al");
    await user.click(screen.getByRole("button", { name: /^Next/ }));
    expect(await screen.findByText(/at least 3 characters/)).toBeTruthy();

    await user.type(screen.getByLabelText("Username"), "ex");
    expect(screen.queryByText(/at least 3 characters/)).toBeNull();
  });

  it("opens a resumed draft on the username, with the reason showing", () => {
    render(
      <ProfileForm
        initialValue={{ ...emptyProfile, username: "taken", display_name: "Taken Name", is_public: true }}
        resume={{ errors: { username: "That username is taken. Try another one." } }}
        submitLabel="Create my Sia"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Username")).toHaveProperty("value", "taken");
    expect(screen.getByText("That username is taken. Try another one.")).toBeTruthy();
  });
});

describe("ProfileForm — right now", () => {
  it("fills the line from an idea, and clears it when the same idea is tapped again", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Create my Sia" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Your name"), "New User");
    await user.click(screen.getByRole("button", { name: /^Next/ }));
    const line = (await screen.findByLabelText(/What.s happening/)) as HTMLInputElement;

    const idea = screen.getByRole("button", { name: "New in town" });
    await user.click(idea);
    expect(line.value).toBe("New in town");
    expect(idea.getAttribute("aria-pressed")).toBe("true");

    // Still an ordinary field: the idea is a starting point, not a fixed choice.
    await user.type(line, ", here till Friday");
    expect(line.value).toBe("New in town, here till Friday");
    expect(idea.getAttribute("aria-pressed")).toBe("false");

    await user.clear(line);
    await user.click(idea);
    await user.click(idea);
    expect(line.value).toBe("");
  });
});


describe("three-stage creation", () => {
  it("saves privately by default without requiring optional personalization", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Save" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Your name"), "Maya");
    await user.click(screen.getByRole("button", { name: /^Next/ }));
    await user.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByRole("radio", { name: /Only me for now/ }).getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit.mock.calls[0]?.[0].is_public).toBe(false);
    expect(onSubmit.mock.calls[0]?.[0].list_in_search).toBe(false);
  });
});
