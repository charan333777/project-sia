import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ProfileCharacter } from "@sia/validation";
import { expect, it } from "vitest";
import { ProfileCharacterPicker } from "./profile-character-picker";

function Picker() {
  const [character, setCharacter] = useState<ProfileCharacter>("elephant");
  return <ProfileCharacterPicker value={character} onChange={setCharacter} />;
}
it("moves focus and selection together with arrows and only tabs into the selected radio", async () => {
  const user = userEvent.setup();
  render(<Picker />);
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: /Elephant/ }));
  await user.keyboard("{ArrowRight}");
  const panda = screen.getByRole("radio", { name: /Panda/ });
  expect(panda.getAttribute("aria-checked")).toBe("true");
  expect(document.activeElement).toBe(panda);
  expect(screen.getAllByRole("radio").filter((node) => node.tabIndex === 0)).toHaveLength(1);
  await user.keyboard("{End}");
  expect(screen.getByRole("radio", { name: /Spark/ }).getAttribute("aria-checked")).toBe("true");
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("radio", { name: /Plain/ }).getAttribute("aria-checked")).toBe("true");
});
