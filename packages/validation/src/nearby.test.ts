import { describe, expect, it } from "vitest";
import { nearbyMeetPlanInputSchema, nearbyPresenceInputSchema, nearbySignalInputSchema } from "./nearby.js";

describe("nearby validation", () => {
  it("accepts a private, time-limited presence update", () => {
    expect(nearbyPresenceInputSchema.parse({ latitude: 51.5, longitude: -0.12, accuracy_m: 18, duration: "15m" }).duration).toBe("15m");
  });

  it("rejects impossible coordinates and free-form wave messages", () => {
    expect(() => nearbyPresenceInputSchema.parse({ latitude: 151, longitude: 0, accuracy_m: 10, duration: "15m" })).toThrow();
    expect(() => nearbySignalInputSchema.parse({ target_profile_id: crypto.randomUUID(), intent: "write anything" })).toThrow();
  });

  it("keeps meeting labels short and requires a future-shaped ISO timestamp", () => {
    expect(() => nearbyMeetPlanInputSchema.parse({ starts_at: "10:30", place_kind: "outside", place_label: "Outside" })).toThrow();
    expect(() => nearbyMeetPlanInputSchema.parse({ starts_at: new Date().toISOString(), place_kind: "custom", place_label: "x".repeat(61) })).toThrow();
  });
});
