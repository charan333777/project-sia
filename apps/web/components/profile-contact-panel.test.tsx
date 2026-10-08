import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProfileContactPanel } from "./profile-contact-panel";
import { buildVCard } from "@/lib/vcard";

const profile = { username: "maya", display_name: "Maya", role: "Designer", bio: "Hello" };
it("offers a contact with the Sia link even without published contact details", () => {
  render(<ProfileContactPanel profile={profile} items={[]} profileUrl="https://siaqr.com/u/maya" />);
  expect(screen.getByRole("button", { name: "Save contact" })).toBeTruthy();
  const card = buildVCard(profile, [], "https://siaqr.com/u/maya");
  expect(card).toContain("FN:Maya");
  expect(card).toContain("URL:https://siaqr.com/u/maya");
  expect(card).not.toMatch(/EMAIL|TEL/);
});
