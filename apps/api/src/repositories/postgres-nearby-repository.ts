import postgres, { type Sql } from "postgres";
import type {
  NearbyDuration,
  NearbyIntent,
  NearbyMeetPlanInput,
  NearbyMeetStatusCode,
  NearbyReportInput,
} from "@sia/validation";
import type {
  NearbyCandidateRecord,
  NearbyConnectionRecord,
  NearbyMeetStatusRecord,
  NearbyPresenceRecord,
  NearbyProfileRecord,
  NearbyRepository,
  NearbySignalRecord,
} from "./nearby-repository.js";

type ProfileColumns = {
  user_id: string;
  profile_id: string;
  display_name: string;
  role: string;
  current_context: string;
  interests: string[];
  open_to: string[];
};

function profileFrom(row: ProfileColumns): NearbyProfileRecord {
  return {
    userId: row.user_id,
    profileId: row.profile_id,
    displayName: row.display_name,
    role: row.role,
    currentContext: row.current_context,
    interests: row.interests,
    openTo: row.open_to,
  };
}

export class PostgresNearbyRepository implements NearbyRepository {
  constructor(private readonly sql: Sql) {}

  static connect(databaseUrl: string) {
    return new PostgresNearbyRepository(postgres(databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10 }));
  }

  async pruneExpired() {
    await this.sql.begin(async (transaction) => {
      await transaction`DELETE FROM public.nearby_presence WHERE visible_until <= now()`;
      await transaction`DELETE FROM public.nearby_signals WHERE expires_at <= now()`;
      await transaction`DELETE FROM public.nearby_meet_plans WHERE expires_at <= now()`;
      await transaction`DELETE FROM public.nearby_connections WHERE expires_at <= now()`;
    });
  }

  async getPresence(userId: string): Promise<NearbyPresenceRecord | null> {
    const [row] = await this.sql<{ duration: NearbyDuration; visible_until: Date }[]>`
      SELECT duration, visible_until
      FROM public.nearby_presence
      WHERE user_id = ${userId} AND visible_until > now()
      LIMIT 1
    `;
    return row ? { duration: row.duration, visibleUntil: row.visible_until } : null;
  }

  async upsertPresence(userId: string, latitude: number, longitude: number, accuracyM: number, duration: NearbyDuration, visibleUntil: Date) {
    const [row] = await this.sql<{ duration: NearbyDuration; visible_until: Date }[]>`
      INSERT INTO public.nearby_presence (user_id, location, accuracy_m, duration, visible_until, last_seen_at)
      VALUES (
        ${userId},
        extensions.st_point(${longitude}, ${latitude})::extensions.geography,
        ${accuracyM}, ${duration}, ${visibleUntil}, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        location = EXCLUDED.location,
        accuracy_m = EXCLUDED.accuracy_m,
        duration = EXCLUDED.duration,
        visible_until = CASE
          WHEN public.nearby_presence.duration <> EXCLUDED.duration OR public.nearby_presence.visible_until <= now()
            THEN EXCLUDED.visible_until
          WHEN EXCLUDED.duration = 'until_leave' THEN EXCLUDED.visible_until
          ELSE public.nearby_presence.visible_until
        END,
        last_seen_at = now()
      RETURNING duration, visible_until
    `;
    if (!row) throw new Error("Nearby presence upsert returned no row");
    return { duration: row.duration, visibleUntil: row.visible_until };
  }

  async removePresence(userId: string) {
    await this.sql`DELETE FROM public.nearby_presence WHERE user_id = ${userId}`;
  }

  async findNearby(userId: string): Promise<NearbyCandidateRecord[]> {
    const rows = await this.sql<(ProfileColumns & { distance_m: number; bearing_degrees: number; match_count: number })[]>`
      SELECT
        p.user_id,
        p.id AS profile_id,
        p.display_name,
        p.role,
        p.current_context,
        p.interests,
        p.open_to,
        extensions.st_distance(me.location, other.location)::double precision AS distance_m,
        degrees(extensions.st_azimuth(me.location::extensions.geometry, other.location::extensions.geometry))::double precision AS bearing_degrees,
        (
          SELECT count(*)::integer
          FROM unnest(p.interests) AS candidate_interest
          WHERE candidate_interest = ANY(mine.interests)
        ) AS match_count
      FROM public.nearby_presence me
      JOIN public.profiles mine ON mine.user_id = me.user_id
      JOIN public.nearby_presence other ON other.user_id <> me.user_id
      JOIN public.profiles p ON p.user_id = other.user_id
      WHERE me.user_id = ${userId}
        AND me.visible_until > now()
        AND other.visible_until > now()
        AND extensions.st_dwithin(me.location, other.location, 200)
        AND NOT EXISTS (
          SELECT 1 FROM public.nearby_blocks b
          WHERE (b.blocker_user_id = me.user_id AND b.blocked_user_id = other.user_id)
             OR (b.blocker_user_id = other.user_id AND b.blocked_user_id = me.user_id)
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.nearby_connections c
          WHERE c.status = 'active' AND c.expires_at > now()
            AND ((c.user_a_id = me.user_id AND c.user_b_id = other.user_id)
              OR (c.user_a_id = other.user_id AND c.user_b_id = me.user_id))
        )
      ORDER BY distance_m ASC
      LIMIT 50
    `;
    return rows.map((row) => ({
      ...profileFrom(row),
      distanceM: Number(row.distance_m),
      bearingDegrees: Number(row.bearing_degrees),
      matchCount: Number(row.match_count),
    }));
  }

  async createSignal(userId: string, targetProfileId: string, intent: NearbyIntent): Promise<boolean> {
    const [row] = await this.sql<{ id: string }[]>`
      INSERT INTO public.nearby_signals (sender_user_id, recipient_user_id, intent, expires_at)
      SELECT
        me.user_id,
        target.user_id,
        ${intent},
        LEAST(now() + interval '15 minutes', me.visible_until, target_presence.visible_until)
      FROM public.nearby_presence me
      JOIN public.profiles target ON target.id = ${targetProfileId}
      JOIN public.nearby_presence target_presence ON target_presence.user_id = target.user_id
      WHERE me.user_id = ${userId}
        AND me.visible_until > now()
        AND target_presence.visible_until > now()
        AND target.user_id <> me.user_id
        AND extensions.st_dwithin(me.location, target_presence.location, 200)
        AND NOT EXISTS (
          SELECT 1 FROM public.nearby_blocks b
          WHERE (b.blocker_user_id = me.user_id AND b.blocked_user_id = target.user_id)
             OR (b.blocker_user_id = target.user_id AND b.blocked_user_id = me.user_id)
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.nearby_connections c
          WHERE c.status = 'active' AND c.expires_at > now()
            AND ((c.user_a_id = me.user_id AND c.user_b_id = target.user_id)
              OR (c.user_a_id = target.user_id AND c.user_b_id = me.user_id))
        )
      ON CONFLICT (sender_user_id, recipient_user_id) WHERE status = 'pending'
      DO UPDATE SET intent = EXCLUDED.intent, created_at = now(), expires_at = EXCLUDED.expires_at
      RETURNING id
    `;
    return Boolean(row);
  }

  async listSignals(userId: string): Promise<NearbySignalRecord[]> {
    const rows = await this.sql<(ProfileColumns & { id: string; direction: "incoming" | "outgoing"; intent: NearbyIntent; expires_at: Date })[]>`
      SELECT
        s.id,
        CASE WHEN s.sender_user_id = ${userId} THEN 'outgoing' ELSE 'incoming' END AS direction,
        s.intent,
        s.expires_at,
        p.user_id,
        p.id AS profile_id,
        p.display_name,
        p.role,
        p.current_context,
        p.interests,
        p.open_to
      FROM public.nearby_signals s
      JOIN public.profiles p ON p.user_id = CASE WHEN s.sender_user_id = ${userId} THEN s.recipient_user_id ELSE s.sender_user_id END
      WHERE (s.sender_user_id = ${userId} OR s.recipient_user_id = ${userId})
        AND s.status = 'pending'
        AND s.expires_at > now()
      ORDER BY s.created_at DESC
    `;
    return rows.map((row) => ({ id: row.id, direction: row.direction, intent: row.intent, expiresAt: row.expires_at, person: profileFrom(row) }));
  }

  async respondToSignal(userId: string, signalId: string, action: "accept" | "decline"): Promise<boolean> {
    return this.sql.begin(async (transaction) => {
      const [signal] = await transaction<{ sender_user_id: string; recipient_user_id: string }[]>`
        SELECT sender_user_id, recipient_user_id
        FROM public.nearby_signals
        WHERE id = ${signalId} AND recipient_user_id = ${userId} AND status = 'pending' AND expires_at > now()
        FOR UPDATE
      `;
      if (!signal) return false;
      if (action === "decline") {
        await transaction`UPDATE public.nearby_signals SET status = 'declined' WHERE id = ${signalId}`;
        return true;
      }
      await transaction`UPDATE public.nearby_signals SET status = 'accepted' WHERE id = ${signalId}`;
      await transaction`
        UPDATE public.nearby_signals
        SET status = 'accepted'
        WHERE sender_user_id = ${signal.recipient_user_id}
          AND recipient_user_id = ${signal.sender_user_id}
          AND status = 'pending'
      `;
      await transaction`
        INSERT INTO public.nearby_connections (user_a_id, user_b_id, status, created_at, expires_at)
        VALUES (LEAST(${signal.sender_user_id}::uuid, ${signal.recipient_user_id}::uuid), GREATEST(${signal.sender_user_id}::uuid, ${signal.recipient_user_id}::uuid), 'active', now(), now() + interval '2 hours')
        ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET status = 'active', created_at = now(), expires_at = EXCLUDED.expires_at
      `;
      return true;
    });
  }

  async listConnections(userId: string): Promise<NearbyConnectionRecord[]> {
    const rows = await this.sql<(ProfileColumns & {
      connection_id: string;
      connection_expires_at: Date;
      meet_plan_id: string | null;
      proposer_profile_id: string | null;
      starts_at: Date | null;
      place_kind: "main_entrance" | "reception" | "coffee_counter" | "outside" | "custom" | null;
      place_label: string | null;
      meet_status: "proposed" | "accepted" | null;
      meet_expires_at: Date | null;
    })[]>`
      SELECT
        c.id AS connection_id,
        c.expires_at AS connection_expires_at,
        p.user_id,
        p.id AS profile_id,
        p.display_name,
        p.role,
        p.current_context,
        p.interests,
        p.open_to,
        mp.id AS meet_plan_id,
        proposer.id AS proposer_profile_id,
        mp.starts_at,
        mp.place_kind,
        mp.place_label,
        mp.status AS meet_status,
        mp.expires_at AS meet_expires_at
      FROM public.nearby_connections c
      JOIN public.profiles p ON p.user_id = CASE WHEN c.user_a_id = ${userId} THEN c.user_b_id ELSE c.user_a_id END
      LEFT JOIN LATERAL (
        SELECT * FROM public.nearby_meet_plans candidate
        WHERE candidate.connection_id = c.id
          AND candidate.status IN ('proposed', 'accepted')
          AND candidate.expires_at > now()
        ORDER BY candidate.created_at DESC
        LIMIT 1
      ) mp ON true
      LEFT JOIN public.profiles proposer ON proposer.user_id = mp.proposer_user_id
      WHERE (c.user_a_id = ${userId} OR c.user_b_id = ${userId})
        AND c.status = 'active'
        AND c.expires_at > now()
        AND NOT EXISTS (
          SELECT 1 FROM public.nearby_blocks b
          WHERE (b.blocker_user_id = ${userId} AND b.blocked_user_id = p.user_id)
             OR (b.blocker_user_id = p.user_id AND b.blocked_user_id = ${userId})
        )
      ORDER BY c.created_at DESC
    `;

    const planIds = rows.flatMap((row) => row.meet_plan_id ? [row.meet_plan_id] : []);
    const statusRows = planIds.length === 0 ? [] : await this.sql<{ id: string; meet_plan_id: string; sender_profile_id: string; code: NearbyMeetStatusCode; created_at: Date }[]>`
      SELECT ms.id, ms.meet_plan_id, sender.id AS sender_profile_id, ms.code, ms.created_at
      FROM public.nearby_meet_statuses ms
      JOIN public.profiles sender ON sender.user_id = ms.sender_user_id
      WHERE ms.meet_plan_id = ANY(${this.sql.array(planIds)}::uuid[])
      ORDER BY ms.created_at DESC
    `;
    const statuses = new Map<string, NearbyMeetStatusRecord[]>();
    for (const row of statusRows) {
      const current = statuses.get(row.meet_plan_id) ?? [];
      current.push({ id: row.id, senderProfileId: row.sender_profile_id, code: row.code, createdAt: row.created_at });
      statuses.set(row.meet_plan_id, current);
    }

    return rows.map((row) => ({
      id: row.connection_id,
      expiresAt: row.connection_expires_at,
      person: profileFrom(row),
      meetPlan: row.meet_plan_id && row.proposer_profile_id && row.starts_at && row.place_kind && row.place_label && row.meet_status && row.meet_expires_at ? {
        id: row.meet_plan_id,
        proposerProfileId: row.proposer_profile_id,
        startsAt: row.starts_at,
        placeKind: row.place_kind,
        placeLabel: row.place_label,
        status: row.meet_status,
        expiresAt: row.meet_expires_at,
        statuses: statuses.get(row.meet_plan_id) ?? [],
      } : null,
    }));
  }

  async createMeetPlan(userId: string, connectionId: string, input: NearbyMeetPlanInput, expiresAt: Date): Promise<boolean> {
    return this.sql.begin(async (transaction) => {
      const [connection] = await transaction<{ expires_at: Date }[]>`
        SELECT expires_at FROM public.nearby_connections
        WHERE id = ${connectionId} AND (user_a_id = ${userId} OR user_b_id = ${userId})
          AND status = 'active' AND expires_at > now()
        FOR UPDATE
      `;
      if (!connection) return false;
      await transaction`
        UPDATE public.nearby_meet_plans SET status = 'cancelled', updated_at = now()
        WHERE connection_id = ${connectionId} AND status IN ('proposed', 'accepted')
      `;
      await transaction`
        INSERT INTO public.nearby_meet_plans (
          connection_id, proposer_user_id, starts_at, place_kind, place_label, expires_at
        ) VALUES (
          ${connectionId}, ${userId}, ${input.starts_at}, ${input.place_kind}, ${input.place_label}, LEAST(${expiresAt}, ${connection.expires_at})
        )
      `;
      return true;
    });
  }

  async respondToMeetPlan(userId: string, meetPlanId: string, action: "accept" | "decline" | "cancel"): Promise<boolean> {
    const result = await this.sql`
      UPDATE public.nearby_meet_plans mp SET
        status = ${action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled"},
        updated_at = now()
      FROM public.nearby_connections c
      WHERE mp.id = ${meetPlanId}
        AND c.id = mp.connection_id
        AND (c.user_a_id = ${userId} OR c.user_b_id = ${userId})
        AND mp.status IN ('proposed', 'accepted')
        AND mp.expires_at > now()
        AND (${action} = 'cancel' OR (mp.proposer_user_id <> ${userId} AND mp.status = 'proposed'))
      RETURNING mp.id
    `;
    return result.length > 0;
  }

  async addMeetStatus(userId: string, meetPlanId: string, code: NearbyMeetStatusCode): Promise<boolean> {
    const [row] = await this.sql<{ id: string }[]>`
      INSERT INTO public.nearby_meet_statuses (meet_plan_id, sender_user_id, code)
      SELECT mp.id, ${userId}, ${code}
      FROM public.nearby_meet_plans mp
      JOIN public.nearby_connections c ON c.id = mp.connection_id
      WHERE mp.id = ${meetPlanId}
        AND mp.status = 'accepted'
        AND mp.expires_at > now()
        AND (c.user_a_id = ${userId} OR c.user_b_id = ${userId})
      RETURNING id
    `;
    return Boolean(row);
  }

  async blockProfile(userId: string, profileId: string): Promise<boolean> {
    return this.sql.begin(async (transaction) => {
      const [target] = await transaction<{ user_id: string }[]>`SELECT user_id FROM public.profiles WHERE id = ${profileId} AND user_id <> ${userId}`;
      if (!target) return false;
      await transaction`
        INSERT INTO public.nearby_blocks (blocker_user_id, blocked_user_id)
        VALUES (${userId}, ${target.user_id})
        ON CONFLICT DO NOTHING
      `;
      await transaction`
        UPDATE public.nearby_signals SET status = 'cancelled'
        WHERE status = 'pending' AND ((sender_user_id = ${userId} AND recipient_user_id = ${target.user_id}) OR (sender_user_id = ${target.user_id} AND recipient_user_id = ${userId}))
      `;
      await transaction`
        UPDATE public.nearby_connections SET status = 'closed'
        WHERE status = 'active' AND ((user_a_id = ${userId} AND user_b_id = ${target.user_id}) OR (user_a_id = ${target.user_id} AND user_b_id = ${userId}))
      `;
      return true;
    });
  }

  async reportProfile(userId: string, input: NearbyReportInput): Promise<boolean> {
    const [row] = await this.sql<{ id: string }[]>`
      INSERT INTO public.nearby_reports (reporter_user_id, reported_user_id, reason, details)
      SELECT ${userId}, user_id, ${input.reason}, ${input.details}
      FROM public.profiles
      WHERE id = ${input.target_profile_id} AND user_id <> ${userId}
      RETURNING id
    `;
    return Boolean(row);
  }
}
