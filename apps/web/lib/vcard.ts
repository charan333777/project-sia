import type { ContactItem, Profile } from "@sia/validation";

/** vCard reserves these characters, so a name or label containing one must escape it. */
function escapeValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 6350 folds lines longer than 75 octets onto continuation lines that begin with a
 * single space. Most parsers tolerate long lines, but Contacts on iOS is stricter than
 * most, and a long bio is easy to hit.
 */
function foldLine(line: string) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let index = 75; index < line.length; index += 74) parts.push(` ${line.slice(index, index + 74)}`);
  return parts.join("\r\n");
}

function contactLine(item: ContactItem) {
  const label = item.label ? escapeValue(item.label) : "";
  if (item.type === "phone") return `TEL;TYPE=CELL:${escapeValue(item.value)}`;
  if (item.type === "email") return `EMAIL;TYPE=INTERNET:${escapeValue(item.value)}`;
  // A labelled URL keeps "Portfolio" attached to the link inside the contacts app.
  return label ? `URL;TYPE=${label}:${escapeValue(item.value)}` : `URL:${escapeValue(item.value)}`;
}

/**
 * Builds a vCard from a profile and its Sia URL.
 *
 * `items` is whatever the caller was given — on a public profile the API has already
 * removed everything the owner chose to hide, so a saved contact can never carry a
 * detail the page itself does not show.
 */
export function buildVCard(
  profile: Pick<Profile, "display_name" | "role" | "bio">,
  items: readonly ContactItem[],
  profileUrl: string,
) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:;${escapeValue(profile.display_name)};;;`,
    `FN:${escapeValue(profile.display_name)}`,
    ...(profile.role ? [`TITLE:${escapeValue(profile.role)}`] : []),
    ...items.map(contactLine),
    `URL:${escapeValue(profileUrl)}`,
    ...(profile.bio ? [`NOTE:${escapeValue(profile.bio)}`] : []),
    "END:VCARD",
  ];
  return lines.map(foldLine).join("\r\n");
}

export function vCardFileName(username: string) {
  return `${username}-sia.vcf`;
}
