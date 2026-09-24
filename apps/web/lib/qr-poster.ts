import type { Profile, ProfileCharacter } from "@sia/validation";
import { getProfileCharacterOption } from "@/components/profile-characters";
import { getProfileTheme, profileThemeOptions } from "@/components/profile-themes";

const svgNamespace = "http://www.w3.org/2000/svg";

/**
 * Longest "Open to" line, in average characters, for the printed card. Measured at 34px
 * Arial: mixed-case text runs about 16px a character, so this is roughly 800px of the
 * poster's 1080.
 */
const openToLineLimit = 48;

/** Printed length in average characters. Capitals run about 40% wider than lower case. */
function printedLength(text: string) {
  let length = 0;
  for (const char of text) length += char >= "A" && char <= "Z" ? 1.4 : 1;
  return length;
}

function appendSvgElement<K extends keyof SVGElementTagNameMap>(
  parent: SVGElement,
  tag: K,
  attributes: Record<string, string>,
) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  parent.appendChild(element);
  return element;
}

function addPosterCharacterFrame(poster: SVGElement, characterId: ProfileCharacter, soft: string, accent: string) {
  if (characterId === "plain") return;
  if (characterId === "panda") {
    appendSvgElement(poster, "circle", { cx: "174", cy: "275", r: "104", fill: "#272832", opacity: ".94" });
    appendSvgElement(poster, "circle", { cx: "906", cy: "275", r: "104", fill: "#272832", opacity: ".94" });
    return;
  }
  if (characterId === "play") {
    appendSvgElement(poster, "circle", { cx: "112", cy: "420", r: "34", fill: accent, opacity: ".65" });
    appendSvgElement(poster, "circle", { cx: "968", cy: "710", r: "46", fill: soft, opacity: ".92" });
    return;
  }
  const isPuppy = characterId === "puppy";
  const fill = isPuppy ? "#D9A267" : soft;
  appendSvgElement(poster, "ellipse", { cx: "135", cy: "570", rx: isPuppy ? "92" : "118", ry: isPuppy ? "205" : "222", fill, opacity: ".94", transform: `rotate(${isPuppy ? "10" : "4"} 135 570)` });
  appendSvgElement(poster, "ellipse", { cx: "945", cy: "570", rx: isPuppy ? "92" : "118", ry: isPuppy ? "205" : "222", fill, opacity: ".94", transform: `rotate(${isPuppy ? "-10" : "-4"} 945 570)` });
}

function readablePosterUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * "Open to: Coffee · A quick chat" — as many tags as fit on one printed line. The poster
 * carries these rather than the "right now" line because paper cannot expire: a printed
 * status would go on saying "at the meetup" long after the meetup ended.
 */
export function posterOpenToLine(openTo: readonly string[]) {
  const prefix = "Open to: ";
  let line = "";
  for (const tag of openTo) {
    const next = line ? `${line} · ${tag}` : tag;
    if (printedLength(prefix + next) > openToLineLimit) break;
    line = next;
  }
  const first = openTo[0];
  if (!line && first) {
    // A single tag too long for the line is shortened rather than dropped.
    let short = first;
    while (short && printedLength(`${prefix}${short}…`) > openToLineLimit) short = short.slice(0, -1);
    line = `${short.trimEnd()}…`;
  }
  return line ? prefix + line : null;
}

export function buildQrPoster(profile: Profile, qr: SVGSVGElement, avatarDataUrl: string | null, url: string) {
  const themeId = getProfileTheme(profile.profile_theme);
  const theme = profileThemeOptions.find((option) => option.id === themeId) ?? profileThemeOptions[0]!;
  const character = getProfileCharacterOption(profile.profile_character);
  const openTo = posterOpenToLine(profile.open_to);
  // The "Open to" line's room comes out of the code panel, which stays well over half the
  // poster's width — far larger than any camera needs.
  const lift = openTo ? 60 : 0;
  const panelSize = 770 - lift;
  const panelX = (1080 - panelSize) / 2;
  const poster = document.createElementNS(svgNamespace, "svg");
  poster.setAttribute("xmlns", svgNamespace);
  poster.setAttribute("viewBox", "0 0 1080 1350");
  poster.setAttribute("width", "1080");
  poster.setAttribute("height", "1350");

  appendSvgElement(poster, "rect", { width: "1080", height: "1350", rx: "72", fill: theme.surface });
  appendSvgElement(poster, "circle", { cx: "965", cy: "120", r: "240", fill: theme.soft, opacity: ".76" });
  appendSvgElement(poster, "circle", { cx: "85", cy: "1230", r: "210", fill: theme.soft, opacity: ".48" });
  const brand = appendSvgElement(poster, "text", { x: "540", y: "142", fill: theme.ink, "font-family": "Arial, sans-serif", "font-size": "56", "font-weight": "700", "text-anchor": "middle" });
  brand.textContent = "Sia";
  if (!profile.avatar_url) addPosterCharacterFrame(poster, character.id, theme.soft, theme.accent);
  appendSvgElement(poster, "rect", { x: String(panelX), y: "185", width: String(panelSize), height: String(panelSize), rx: "45", fill: "#ffffff", stroke: theme.soft, "stroke-width": "5" });

  const qrClone = qr.cloneNode(true) as SVGSVGElement;
  qrClone.removeAttribute("id");
  qrClone.setAttribute("x", String(panelX + 25));
  qrClone.setAttribute("y", "210");
  qrClone.setAttribute("width", String(panelSize - 50));
  qrClone.setAttribute("height", String(panelSize - 50));
  poster.appendChild(qrClone);

  const avatarY = 1045 - lift;
  if (avatarDataUrl) {
    appendSvgElement(poster, "circle", { cx: "540", cy: String(avatarY), r: "82", fill: "#ffffff", stroke: theme.soft, "stroke-width": "5" });
    if (profile.avatar_url) {
      const definitions = appendSvgElement(poster, "defs", {});
      const clip = appendSvgElement(definitions, "clipPath", { id: "sia-avatar-clip" });
      appendSvgElement(clip, "circle", { cx: "540", cy: String(avatarY), r: "68" });
    }
    appendSvgElement(poster, "image", { x: "472", y: String(avatarY - 68), width: "136", height: "136", href: avatarDataUrl, preserveAspectRatio: profile.avatar_url ? "xMidYMid slice" : "xMidYMid meet", ...(profile.avatar_url ? { "clip-path": "url(#sia-avatar-clip)" } : {}) });
  }
  const nameY = (avatarDataUrl ? 1190 : 1095) - lift;
  const name = appendSvgElement(poster, "text", { x: "540", y: String(nameY), fill: theme.ink, "font-family": "Georgia, serif", "font-size": "78", "font-weight": "600", "text-anchor": "middle" });
  name.textContent = profile.display_name;
  if (openTo) {
    const openToLine = appendSvgElement(poster, "text", { x: "540", y: String(nameY + 62), fill: theme.accent, "font-family": "Arial, sans-serif", "font-size": "34", "font-weight": "600", "text-anchor": "middle" });
    openToLine.textContent = openTo;
  }
  const invitation = appendSvgElement(poster, "text", { x: "540", y: avatarDataUrl ? "1262" : "1172", fill: theme.ink, "font-family": "Arial, sans-serif", "font-size": "38", "font-weight": "600", "text-anchor": "middle" });
  invitation.textContent = `Scan to meet ${profile.display_name}`;
  // The printed card is the case where a failed scan has no recourse at all.
  const address = appendSvgElement(poster, "text", { x: "540", y: avatarDataUrl ? "1318" : "1265", fill: theme.ink, "font-family": "Arial, sans-serif", "font-size": "30", "text-anchor": "middle", opacity: ".62" });
  address.textContent = readablePosterUrl(url);
  return poster;
}
