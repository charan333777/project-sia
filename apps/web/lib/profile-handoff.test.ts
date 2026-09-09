import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiRequestError } from "./api";
import { classifyHandoffError, handoffErrorMessage } from "./profile-handoff";

const apiError = (status: number, code: string, message: string) => new ApiRequestError(code, message, status);
const zodError = () => {
  const parsed = z.object({ username: z.string() }).safeParse({});
  if (parsed.success) throw new Error("fixture should not parse");
  return parsed.error;
};

describe("classifyHandoffError", () => {
  it("sends an expired token back through authentication", () => {
    expect(classifyHandoffError(apiError(401, "UNAUTHORIZED", "Please log in to continue."))).toBe("reauth");
  });

  it("gives up on a request that can never succeed as sent", () => {
    expect(classifyHandoffError(apiError(409, "USERNAME_TAKEN", "That username is already in use."))).toBe("terminal");
    expect(classifyHandoffError(apiError(400, "INVALID_PROFILE_PHOTO", "Choose a JPEG."))).toBe("terminal");
  });

  it("keeps the draft when the moment was wrong rather than the request", () => {
    expect(classifyHandoffError(apiError(429, "RATE_LIMITED", "Slow down."))).toBe("retry");
    expect(classifyHandoffError(apiError(408, "TIMEOUT", "Timed out."))).toBe("retry");
    expect(classifyHandoffError(apiError(500, "INTERNAL", "Boom."))).toBe("retry");
    expect(classifyHandoffError(apiError(503, "UNAVAILABLE", "Down for now."))).toBe("retry");
    expect(classifyHandoffError(new TypeError("Failed to fetch"))).toBe("retry");
  });

  it("gives up on a stored draft the schema no longer accepts", () => {
    expect(classifyHandoffError(zodError())).toBe("terminal");
  });
});

describe("handoffErrorMessage", () => {
  it("shows Sia's own sentence instead of a generic one", () => {
    expect(handoffErrorMessage(apiError(409, "USERNAME_TAKEN", "That username is already in use."))).toBe(
      "That username is already in use.",
    );
    expect(handoffErrorMessage(apiError(401, "UNAUTHORIZED", "Please log in to continue."))).toBe(
      "Please log in to continue.",
    );
  });

  it("does not put a Zod blob on the screen", () => {
    const message = handoffErrorMessage(zodError());
    expect(message).toBe("The details we saved are no longer valid.");
    expect(message).not.toContain("invalid_type");
  });

  it("names a connection problem as one", () => {
    expect(handoffErrorMessage(new TypeError("Failed to fetch"))).toContain("connection");
  });

  it("falls back only for something carrying no message at all", () => {
    expect(handoffErrorMessage({})).toBe("That didn’t work. Try again in a moment.");
  });
});
