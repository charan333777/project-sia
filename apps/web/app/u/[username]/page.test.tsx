import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiRequestError } from "@/lib/api";
import { sampleProfile } from "@/lib/sample-profile";
import type { Profile } from "@sia/validation";
import { generateMetadata } from "./page";

afterEach(() => vi.restoreAllMocks());
describe("public profile indexing", () => {
  it.each([false, true])("honours listing opt-in (%s) for normal and Google crawlers", async (listed) => {
    vi.spyOn(api, "getPublicProfile").mockResolvedValue({ ...sampleProfile, list_in_search: listed } as Profile);
    const metadata = await generateMetadata({ params: Promise.resolve({ username: "maya-example" }) });
    expect(metadata.robots).toMatchObject({ index: listed, follow: true, googleBot: { index: listed } });
    expect(metadata.alternates?.canonical).toBe("/u/maya-example");
  });
  it("does not index an inaccessible profile or expose its details", async () => {
    vi.spyOn(api, "getPublicProfile").mockRejectedValue(new ApiRequestError("PROFILE_NOT_FOUND", "Not found", 404));
    const metadata = await generateMetadata({ params: Promise.resolve({ username: "hidden" }) });
    expect(metadata).toEqual({ title: "Profile", robots: { index: false, follow: false } });
  });
});
