import { z } from "zod";

export const nearbyDurationSchema = z.enum(["15m", "60m", "until_leave"]);
export const nearbyIntentSchema = z.enum(["hello", "interested", "coffee", "chat", "network", "collaborate"]);
export const nearbySignalActionSchema = z.enum(["accept", "decline"]);
export const nearbyMeetActionSchema = z.enum(["accept", "decline", "cancel"]);
export const nearbyPlaceKindSchema = z.enum(["main_entrance", "reception", "coffee_counter", "outside", "custom"]);
export const nearbyMeetStatusCodeSchema = z.enum(["coming", "here", "five_minutes", "outside", "inside", "cant_make_it"]);
export const nearbyReportReasonSchema = z.enum(["unsafe", "harassment", "spam", "fake_profile", "other"]);

export const nearbyPresenceInputSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy_m: z.number().finite().min(0).max(5000),
  duration: nearbyDurationSchema,
}).strict();

export const nearbySignalInputSchema = z.object({
  target_profile_id: z.string().uuid(),
  intent: nearbyIntentSchema,
}).strict();

export const nearbySignalActionInputSchema = z.object({ action: nearbySignalActionSchema }).strict();

export const nearbyMeetPlanInputSchema = z.object({
  starts_at: z.string().datetime({ offset: true }),
  place_kind: nearbyPlaceKindSchema,
  place_label: z.string().trim().min(2).max(60),
}).strict();

export const nearbyMeetActionInputSchema = z.object({ action: nearbyMeetActionSchema }).strict();

export const nearbyMeetStatusInputSchema = z.object({ code: nearbyMeetStatusCodeSchema }).strict();

export const nearbyReportInputSchema = z.object({
  target_profile_id: z.string().uuid(),
  reason: nearbyReportReasonSchema,
  details: z.string().trim().max(300).default(""),
}).strict();

export const nearbyIdParamsSchema = z.object({ id: z.string().uuid() });
export const nearbyProfileParamsSchema = z.object({ profileId: z.string().uuid() });

export type NearbyDuration = z.infer<typeof nearbyDurationSchema>;
export type NearbyIntent = z.infer<typeof nearbyIntentSchema>;
export type NearbyPresenceInput = z.infer<typeof nearbyPresenceInputSchema>;
export type NearbySignalInput = z.infer<typeof nearbySignalInputSchema>;
export type NearbySignalAction = z.infer<typeof nearbySignalActionSchema>;
export type NearbyMeetPlanInput = z.infer<typeof nearbyMeetPlanInputSchema>;
export type NearbyMeetAction = z.infer<typeof nearbyMeetActionSchema>;
export type NearbyMeetStatusCode = z.infer<typeof nearbyMeetStatusCodeSchema>;
export type NearbyReportInput = z.infer<typeof nearbyReportInputSchema>;
export type NearbyPlaceKind = z.infer<typeof nearbyPlaceKindSchema>;

export type NearbyDistanceBand = "under_50" | "50_100" | "100_200";
export type NearbyTone = "peach" | "blue" | "sage" | "violet";

export type NearbyProfileSummary = {
  profile_id: string;
  display_name: string;
  role: string;
  current_context: string;
  interests: string[];
  open_to: string[];
  tone: NearbyTone;
};

export type NearbyPerson = NearbyProfileSummary & {
  distance_band: NearbyDistanceBand;
  distance_label: string;
  bearing_sector: number;
  match_count: number;
};

export type NearbySignal = {
  id: string;
  direction: "incoming" | "outgoing";
  intent: NearbyIntent;
  person: NearbyProfileSummary;
  expires_at: string;
};

export type NearbyMeetStatus = {
  id: string;
  sender_profile_id: string;
  code: NearbyMeetStatusCode;
  created_at: string;
};

export type NearbyMeetPlan = {
  id: string;
  proposer_profile_id: string;
  starts_at: string;
  place_kind: NearbyPlaceKind;
  place_label: string;
  status: "proposed" | "accepted";
  expires_at: string;
  statuses: NearbyMeetStatus[];
};

export type NearbyConnection = {
  id: string;
  person: NearbyProfileSummary;
  expires_at: string;
  meet_plan: NearbyMeetPlan | null;
};

export type NearbySnapshot = {
  presence: {
    active: boolean;
    duration: NearbyDuration | null;
    visible_until: string | null;
  };
  people: NearbyPerson[];
  signals: NearbySignal[];
  connections: NearbyConnection[];
};
