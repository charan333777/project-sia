/**
 * Shapes typed text into something `usernameSchema` can accept: lowercase, and only the
 * characters it allows. Leading or trailing `_`/`-` are left for the schema to flag, so a
 * half-typed `maya-` is not rewritten under someone's cursor.
 */
export function cleanUsernameInput(raw: string) {
  return raw.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
}

/** A first suggestion taken from the display name, e.g. "Zoë Park" → "zoepark". */
export function usernameFromName(name: string) {
  return cleanUsernameInput(name).replace(/^[_-]+|[_-]+$/g, "");
}
