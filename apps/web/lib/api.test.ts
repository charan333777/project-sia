import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.js";

/**
 * Guards a bug that reached production: every request declared
 * `Content-Type: application/json`, including the ones with no body. Fastify rejects a
 * request that announces a JSON body and sends none, so photo removal, status clearing,
 * hiding from Nearby and blocking all returned 500 from the browser.
 */
describe("api request headers", () => {
  let calls: { url: string; init: RequestInit }[];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal("fetch", (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200, headers: { "content-type": "application/json" } }));
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const headerOf = (index: number) => {
    const headers = calls[index]!.init.headers as Record<string, string>;
    return Object.keys(headers).find((key) => key.toLowerCase() === "content-type");
  };

  it("omits the content type when there is no body", async () => {
    await api.removeProfilePhoto("token");
    expect(calls[0]!.init.body).toBeUndefined();
    expect(headerOf(0)).toBeUndefined();
  });

  it("omits it for bodyless POSTs that carry their argument in the path", async () => {
    await api.recordProfileView("charan");
    expect(headerOf(0)).toBeUndefined();

    await api.blockNearbyProfile("profile-1", "token");
    expect(headerOf(1)).toBeUndefined();

    await api.restoreProfile("token");
    expect(headerOf(2)).toBeUndefined();
  });

  it("still declares it when a JSON body is sent", async () => {
    await api.updateProfile({ bio: "Hello" }, "token");
    expect(calls[0]!.init.body).toBeTypeOf("string");
    expect(headerOf(0)).toBeDefined();
  });

  it("sends the token as a bearer credential", async () => {
    await api.getMyProfile("token-123");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-123");
  });
});
