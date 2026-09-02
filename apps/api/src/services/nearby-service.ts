import {
  nearbyMeetPlanInputSchema,
  nearbyPresenceInputSchema,
  nearbyReportInputSchema,
  nearbySignalInputSchema,
  type NearbyConnection,
  type NearbyDistanceBand,
  type NearbyDuration,
  type NearbyMeetAction,
  type NearbyMeetPlanInput,
  type NearbyMeetStatusCode,
  type NearbyProfileSummary,
  type NearbyReportInput,
  type NearbySignalAction,
  type NearbySnapshot,
  type NearbyTone,
} from "@sia/validation";
import { AppError } from "../errors.js";
import type { NearbyProfileRecord, NearbyRepository } from "../repositories/nearby-repository.js";

const presetPlaces = {
  main_entrance: "Main entrance",
  reception: "Reception",
  coffee_counter: "Coffee counter",
  outside: "Outside",
} as const;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function presenceExpiry(duration: NearbyDuration, now = new Date()) {
  return addMinutes(now, duration === "15m" ? 15 : duration === "60m" ? 60 : 2);
}

function toneFor(profileId: string): NearbyTone {
  const tones: NearbyTone[] = ["peach", "blue", "sage", "violet"];
  let hash = 0;
  for (const character of profileId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return tones[Math.abs(hash) % tones.length]!;
}

function profileSummary(profile: NearbyProfileRecord): NearbyProfileSummary {
  return {
    profile_id: profile.profileId,
    display_name: profile.displayName,
    role: profile.role,
    current_context: profile.currentContext,
    interests: profile.interests,
    open_to: profile.openTo,
    tone: toneFor(profile.profileId),
  };
}

function distanceBand(distanceM: number): { band: NearbyDistanceBand; label: string } {
  if (distanceM < 50) return { band: "under_50", label: "Under 50 m" };
  if (distanceM < 100) return { band: "50_100", label: "50–100 m" };
  return { band: "100_200", label: "100–200 m" };
}

function notAvailable(message: string) {
  return new AppError(404, "NEARBY_NOT_AVAILABLE", message);
}

export class NearbyService {
  constructor(private readonly nearby: NearbyRepository) {}

  async updatePresence(userId: string, rawInput: unknown): Promise<NearbySnapshot> {
    const input = nearbyPresenceInputSchema.parse(rawInput);
    await this.nearby.upsertPresence(
      userId,
      input.latitude,
      input.longitude,
      input.accuracy_m,
      input.duration,
      presenceExpiry(input.duration),
    );
    return this.snapshot(userId);
  }

  async hide(userId: string): Promise<NearbySnapshot> {
    await this.nearby.removePresence(userId);
    return this.snapshot(userId);
  }

  async snapshot(userId: string): Promise<NearbySnapshot> {
    await this.nearby.pruneExpired();
    const [presence, candidates, signals, connections] = await Promise.all([
      this.nearby.getPresence(userId),
      this.nearby.findNearby(userId),
      this.nearby.listSignals(userId),
      this.nearby.listConnections(userId),
    ]);

    return {
      presence: presence ? { active: true, duration: presence.duration, visible_until: presence.visibleUntil.toISOString() } : { active: false, duration: null, visible_until: null },
      people: candidates.map((candidate) => {
        const distance = distanceBand(candidate.distanceM);
        return {
          ...profileSummary(candidate),
          distance_band: distance.band,
          distance_label: distance.label,
          bearing_sector: Math.round((((candidate.bearingDegrees % 360) + 360) % 360) / 45) % 8,
          match_count: candidate.matchCount,
        };
      }),
      signals: signals.map((signal) => ({
        id: signal.id,
        direction: signal.direction,
        intent: signal.intent,
        person: profileSummary(signal.person),
        expires_at: signal.expiresAt.toISOString(),
      })),
      connections: connections.map((connection): NearbyConnection => ({
        id: connection.id,
        person: profileSummary(connection.person),
        expires_at: connection.expiresAt.toISOString(),
        meet_plan: connection.meetPlan ? {
          id: connection.meetPlan.id,
          proposer_profile_id: connection.meetPlan.proposerProfileId,
          starts_at: connection.meetPlan.startsAt.toISOString(),
          place_kind: connection.meetPlan.placeKind,
          place_label: connection.meetPlan.placeLabel,
          status: connection.meetPlan.status,
          expires_at: connection.meetPlan.expiresAt.toISOString(),
          statuses: connection.meetPlan.statuses.map((status) => ({
            id: status.id,
            sender_profile_id: status.senderProfileId,
            code: status.code,
            created_at: status.createdAt.toISOString(),
          })),
        } : null,
      })),
    };
  }

  async sendSignal(userId: string, rawInput: unknown) {
    const input = nearbySignalInputSchema.parse(rawInput);
    if (!await this.nearby.createSignal(userId, input.target_profile_id, input.intent)) {
      throw notAvailable("That person is no longer available nearby.");
    }
    return this.snapshot(userId);
  }

  async respondToSignal(userId: string, signalId: string, action: NearbySignalAction) {
    if (!await this.nearby.respondToSignal(userId, signalId, action)) {
      throw notAvailable("That Wave has expired or is no longer available.");
    }
    return this.snapshot(userId);
  }

  async proposeMeeting(userId: string, connectionId: string, rawInput: unknown) {
    const parsed = nearbyMeetPlanInputSchema.parse(rawInput);
    const now = new Date();
    const startsAt = new Date(parsed.starts_at);
    if (startsAt.getTime() < now.getTime() - 30_000 || startsAt.getTime() > addMinutes(now, 120).getTime()) {
      throw new AppError(400, "MEETING_TIME_INVALID", "Choose a meeting time within the next two hours.");
    }
    const input: NearbyMeetPlanInput = {
      ...parsed,
      place_label: parsed.place_kind === "custom" ? parsed.place_label : presetPlaces[parsed.place_kind],
    };
    const expiresAt = new Date(Math.min(addMinutes(startsAt, 45).getTime(), addMinutes(now, 120).getTime()));
    if (!await this.nearby.createMeetPlan(userId, connectionId, input, expiresAt)) {
      throw notAvailable("That nearby connection has expired.");
    }
    return this.snapshot(userId);
  }

  async respondToMeeting(userId: string, meetPlanId: string, action: NearbyMeetAction) {
    if (!await this.nearby.respondToMeetPlan(userId, meetPlanId, action)) {
      throw notAvailable("That meeting proposal has expired or cannot be changed.");
    }
    return this.snapshot(userId);
  }

  async addMeetingStatus(userId: string, meetPlanId: string, code: NearbyMeetStatusCode) {
    if (!await this.nearby.addMeetStatus(userId, meetPlanId, code)) {
      throw notAvailable("Accept the meeting before sending a quick update.");
    }
    return this.snapshot(userId);
  }

  async block(userId: string, profileId: string) {
    if (!await this.nearby.blockProfile(userId, profileId)) throw notAvailable("That profile is no longer available.");
    return this.snapshot(userId);
  }

  async report(userId: string, rawInput: unknown) {
    const input = nearbyReportInputSchema.parse(rawInput) as NearbyReportInput;
    if (!await this.nearby.reportProfile(userId, input)) throw notAvailable("That profile is no longer available.");
    return { reported: true };
  }
}
