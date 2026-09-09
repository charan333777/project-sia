import { ZodError } from "zod";
import { ApiRequestError } from "./api";

/**
 * What to do about a hand-off that failed. The draft is replayed on every visit to
 * `/login` while it exists, so knowing which failures can never succeed on a retry is
 * the only thing that keeps someone out of a permanent loop.
 */
export type HandoffOutcome = "retry" | "reauth" | "terminal";

/**
 * Classified by status rather than by an allowlist of codes, so an error added to the
 * API later cannot land in the wrong bucket by omission. A 4xx says the request itself
 * is wrong and replaying identical input will fail identically; 408, 429 and 5xx say the
 * request was fine and the moment was not.
 */
export function classifyHandoffError(caught: unknown): HandoffOutcome {
  if (caught instanceof ApiRequestError) {
    if (caught.status === 401) return "reauth";
    if (caught.status === 408 || caught.status === 429) return "retry";
    return caught.status >= 400 && caught.status < 500 ? "terminal" : "retry";
  }
  // A stored draft that no longer satisfies the schema cannot be fixed by sending it again.
  if (caught instanceof ZodError) return "terminal";
  return "retry";
}

/**
 * `friendlyAuthError` exists to keep Supabase's library shapes off a screen people meet
 * before they trust the product. It must not be used for a hand-off failure: an
 * `ApiRequestError` already carries Sia's own sentence, and running it through an auth
 * matcher replaces "That username is already in use." with a generic shrug.
 */
export function handoffErrorMessage(caught: unknown): string {
  if (caught instanceof ApiRequestError) return caught.message;
  if (caught instanceof ZodError) return "The details we saved are no longer valid.";
  const text = caught instanceof Error ? caught.message.toLowerCase() : "";
  if (text.includes("failed to fetch") || text.includes("networkerror")) {
    return "We couldn’t reach Sia. Check your connection and try again.";
  }
  return "That didn’t work. Try again in a moment.";
}
