import { describe, expect, it } from "vitest";
import type { Profile } from "@sia/validation";
import { buildQrPoster, posterOpenToLine } from "./qr-poster";

const profile = {
  id: "p1", user_id: "u1", username: "charan", display_name: "Charan", role: "", bio: "",
  current_context: "At the design meetup", interests: [], open_to: ["Coffee", "A quick chat", "Collaborating"],
  is_public: true, profile_theme: "calm", profile_character: "plain", contact_items: [], list_in_search: false,
  avatar_path: null, avatar_url: null, deleted_at: null, status_state: "off", status_duration: null,
  status_expires_at: null, status: null, created_at: "", updated_at: "",
} as unknown as Profile;

function fakeQr() {
  const qr = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  qr.setAttribute("id", "sia-qr-code");
  return qr;
}

function texts(poster: SVGElement) {
  return [...poster.querySelectorAll("text")].map((node) => ({ text: node.textContent ?? "", y: Number(node.getAttribute("y")) }));
}

describe("posterOpenToLine", () => {
  it("takes as many tags as fit on one printed line", () => {
    expect(posterOpenToLine(["Coffee", "A quick chat", "Collaborating", "Making friends"])).toBe("Open to: Coffee · A quick chat · Collaborating");
  });

  it("shortens a single tag that is too long on its own, instead of dropping the line", () => {
    const line = posterOpenToLine(["Talking about accessible design systems"]);
    expect(line).toMatch(/^Open to: Talking about .+…$/);
    expect(line!.length).toBeLessThanOrEqual(48);
  });

  it("allows for capitals printing wider than lower case", () => {
    // Same character count as the mixed-case line above, but it would run off the card.
    expect(posterOpenToLine(["NETWORKING", "COLLABORATING", "COFFEE"])).toBe("Open to: NETWORKING · COLLABORATING");
  });

  it("is absent when there is nothing to say", () => {
    expect(posterOpenToLine([])).toBeNull();
  });
});

describe("buildQrPoster", () => {
  it("prints what the person is open to — never the right-now line, which paper cannot expire", () => {
    const lines = texts(buildQrPoster(profile, fakeQr(), null, "https://siaqr.com/u/charan"));
    expect(lines.map((line) => line.text)).toContain("Open to: Coffee · A quick chat · Collaborating");
    expect(lines.some((line) => line.text.includes("design meetup"))).toBe(false);
  });

  it("keeps every line in order and clear of the next, with or without a photo", () => {
    for (const avatar of [null, "data:image/png;base64,AAAA"]) {
      const lines = texts(buildQrPoster(profile, fakeQr(), avatar, "https://siaqr.com/u/charan"));
      const below = lines.slice(1); // everything after the "Sia" wordmark, top to bottom
      for (let index = 1; index < below.length; index += 1) {
        expect(below[index]!.y - below[index - 1]!.y).toBeGreaterThanOrEqual(50);
      }
      expect(below.at(-1)!.y).toBeLessThan(1350);
    }
  });

  it("gives the code its full size when there is no line to make room for", () => {
    const poster = buildQrPoster({ ...profile, open_to: [] }, fakeQr(), null, "https://siaqr.com/u/charan");
    const qr = poster.querySelector("svg");
    expect(qr?.getAttribute("width")).toBe("720");
    expect(texts(poster).some((line) => line.text.startsWith("Open to"))).toBe(false);
  });
});
