import { z } from "zod";

export const profileThemes = ["calm", "warm", "bold", "play"] as const;
export type ProfileTheme = (typeof profileThemes)[number];

export const profileCharacters = ["plain", "puppy", "elephant", "panda", "play"] as const;
export type ProfileCharacter = (typeof profileCharacters)[number];

export const profileStatusStates = ["open", "around", "focused", "off"] as const;
export type ProfileStatusState = (typeof profileStatusStates)[number];

/** Every state except `off` is a live status that must carry a duration. */
export const activeProfileStatusStates = ["open", "around", "focused"] as const;
export type ActiveProfileStatusState = (typeof activeProfileStatusStates)[number];

export const profileStatusDurations = ["30m", "1h", "3h", "8h"] as const;
export type ProfileStatusDuration = (typeof profileStatusDurations)[number];

/**
 * Durations are fixed spans rather than wall-clock targets ("today", "this evening")
 * so that expiry never depends on a timezone the server does not know.
 */
export const profileStatusDurationMinutes: Record<ProfileStatusDuration, number> = {
  "30m": 30,
  "1h": 60,
  "3h": 180,
  "8h": 480,
};

export function profileStatusExpiry(duration: ProfileStatusDuration, from: Date = new Date()) {
  return new Date(from.getTime() + profileStatusDurationMinutes[duration] * 60_000);
}


export const reservedUsernames = new Set([
  "api",
  "create",
  "help",
  "login",
  "logout",
  "profile",
  "settings",
  "sia",
  "support",
  "u",
  "www",
]);

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(3, "Username must be at least 3 characters.")
      .max(30, "Username must be 30 characters or fewer.")
      .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, "Use letters, numbers, underscores or hyphens.")
      .refine((value) => !reservedUsernames.has(value), "That username is reserved."),
  );

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .default("");

const tagsSchema = (label: string) =>
  z
    .array(z.string().trim().min(1).max(40, `${label} must be 40 characters or fewer.`))
    .max(10, `Choose up to 10 ${label.toLowerCase()}.`)
    .transform((values) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))));

export const profileInputSchema = z.object({
  username: usernameSchema,
  display_name: z.string().trim().min(1, "Tell us what people should call you.").max(60),
  role: optionalText(80, "What you do"),
  bio: optionalText(300, "Bio"),
  current_context: optionalText(160, "Current context"),
  interests: tagsSchema("Interests").default([]),
  open_to: tagsSchema("Open-to values").default([]),
  is_public: z.boolean().default(false),
  profile_theme: z.enum(profileThemes).default("calm"),
  profile_character: z.enum(profileCharacters).default("plain"),
});

export const profileUpdateSchema = profileInputSchema.partial();

export const publicUsernameParamsSchema = z.object({ username: usernameSchema });

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;


/**
 * Status is written only through its own endpoint. It is deliberately absent from
 * `profileInputSchema` so a profile update can never assert its own expiry — the
 * server derives `status_expires_at` from the chosen duration.
 */
export const profileStatusInputSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("off"),
  }),
  z.object({
    state: z.enum(activeProfileStatusStates),
    duration: z.enum(profileStatusDurations),
    detail: optionalText(160, "Status detail").optional(),
  }),
]);

export type ProfileStatusInput = z.infer<typeof profileStatusInputSchema>;

/** A status that is currently live. `null` means nothing is showing. */
export type ProfileStatus = {
  state: ActiveProfileStatusState;
  duration: ProfileStatusDuration;
  expires_at: string;
  detail: string;
};

export type StoredProfile = ProfileInput & {
  id: string;
  user_id: string;
  avatar_path: string | null;
  status_state: ProfileStatusState;
  status_duration: ProfileStatusDuration | null;
  status_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = StoredProfile & {
  avatar_url: string | null;
  /** Resolved against the clock: `null` once the stored status has expired. */
  status: ProfileStatus | null;
};

/**
 * Resolves a stored profile's status against the clock. Both the API and the web app
 * go through this, so an expired row can never be rendered as live.
 */
export function resolveProfileStatus(
  profile: Pick<StoredProfile, "status_state" | "status_duration" | "status_expires_at" | "current_context">,
  now: Date = new Date(),
): ProfileStatus | null {
  const { status_state, status_duration, status_expires_at } = profile;
  if (status_state === "off" || !status_duration || !status_expires_at) return null;
  const expiresAt = new Date(status_expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) return null;
  return {
    state: status_state,
    duration: status_duration,
    expires_at: expiresAt.toISOString(),
    detail: profile.current_context,
  };
}
