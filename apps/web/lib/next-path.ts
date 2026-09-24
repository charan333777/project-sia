/** Where `/login` sends someone once they are signed in, kept across the Google round trip. */
export const LOGIN_NEXT_KEY = "sia-login-next";

/**
 * Accepts only a same-site path. `next` arrives in a query string anyone can craft, so an
 * absolute URL, a protocol-relative `//host` or a backslash trick must not become a redirect
 * off the site.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/login/")) return null;
  return raw;
}
