import type {
  NearbyDuration,
  NearbyIntent,
  NearbyMeetPlanInput,
  NearbyMeetStatusCode,
  NearbyPlaceKind,
  NearbyReportInput,
} from "@sia/validation";

export type NearbyProfileRecord = {
  userId: string;
  profileId: string;
  displayName: string;
  role: string;
  currentContext: string;
  interests: string[];
  openTo: string[];
};

export type NearbyPresenceRecord = {
  duration: NearbyDuration;
  visibleUntil: Date;
};

export type NearbyCandidateRecord = NearbyProfileRecord & {
  distanceM: number;
  bearingDegrees: number;
  matchCount: number;
};

export type NearbySignalRecord = {
  id: string;
  direction: "incoming" | "outgoing";
  intent: NearbyIntent;
  expiresAt: Date;
  person: NearbyProfileRecord;
};

export type NearbyMeetStatusRecord = {
  id: string;
  senderProfileId: string;
  code: NearbyMeetStatusCode;
  createdAt: Date;
};

export type NearbyMeetPlanRecord = {
  id: string;
  proposerProfileId: string;
  startsAt: Date;
  placeKind: NearbyPlaceKind;
  placeLabel: string;
  status: "proposed" | "accepted";
  expiresAt: Date;
  statuses: NearbyMeetStatusRecord[];
};

export type NearbyConnectionRecord = {
  id: string;
  expiresAt: Date;
  person: NearbyProfileRecord;
  meetPlan: NearbyMeetPlanRecord | null;
};

export interface NearbyRepository {
  pruneExpired(): Promise<void>;
  getPresence(userId: string): Promise<NearbyPresenceRecord | null>;
  upsertPresence(userId: string, latitude: number, longitude: number, accuracyM: number, duration: NearbyDuration, visibleUntil: Date): Promise<NearbyPresenceRecord>;
  removePresence(userId: string): Promise<void>;
  findNearby(userId: string): Promise<NearbyCandidateRecord[]>;
  createSignal(userId: string, targetProfileId: string, intent: NearbyIntent): Promise<boolean>;
  listSignals(userId: string): Promise<NearbySignalRecord[]>;
  respondToSignal(userId: string, signalId: string, action: "accept" | "decline"): Promise<boolean>;
  listConnections(userId: string): Promise<NearbyConnectionRecord[]>;
  createMeetPlan(userId: string, connectionId: string, input: NearbyMeetPlanInput, expiresAt: Date): Promise<boolean>;
  respondToMeetPlan(userId: string, meetPlanId: string, action: "accept" | "decline" | "cancel"): Promise<boolean>;
  addMeetStatus(userId: string, meetPlanId: string, code: NearbyMeetStatusCode): Promise<boolean>;
  blockProfile(userId: string, profileId: string): Promise<boolean>;
  reportProfile(userId: string, input: NearbyReportInput): Promise<boolean>;
}
