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

export const contactItemTypes = ["link", "email", "phone"] as const;
export type ContactItemType = (typeof contactItemTypes)[number];

/** A scannable card, not a link tree. */
export const maxContactItems = 8;

const contactLinkProtocols = new Set(["http:", "https:"]);

/**
 * Accepts what people actually type ("siaqr.com", "www.example.com/me") and returns a
 * canonical absolute URL, or `null` when the value cannot be a safe public link.
 *
 * `javascript:` and `data:` are rejected by the protocol allowlist rather than by a
 * pattern, so no encoding trick gets past it. Embedded credentials are stripped because
 * `https://linkedin.com@evil.example` reads as a trusted host to a person scanning a code.
 */
export function normalizeContactUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (!contactLinkProtocols.has(url.protocol)) return null;
  // A public link needs a real registrable host, which also rules out `http://localhost`.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
  url.username = "";
  url.password = "";
  return url.toString();
}

/** Keeps the shape a person typed, once it is plausibly dialable. */
export function normalizeContactPhone(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!/^\+?[0-9(][0-9 ()./-]{4,30}$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  // E.164 allows at most 15 digits; anything shorter than 5 is not a number.
  if (digits.length < 5 || digits.length > 15) return null;
  return trimmed;
}

const contactLabelSchema = z.string().trim().max(40, "Label must be 40 characters or fewer.").default("");

const contactValueSchema = (
  max: number,
  label: string,
  normalize: (value: string) => string | null,
  message: string,
) =>
  z
    .string()
    .trim()
    .min(1, `${label} cannot be empty.`)
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((value, ctx) => {
      const normalized = normalize(value);
      if (normalized === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
      return normalized;
    });

/**
 * One contact detail. `is_public` defaults to false so that adding a phone number can
 * never publish it as a side effect — showing it is always a second, deliberate act.
 */
export const contactItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    label: contactLabelSchema,
    value: contactValueSchema(300, "Link", normalizeContactUrl, "Enter a web address, like https://example.com."),
    is_public: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("email"),
    label: contactLabelSchema,
    value: z
      .string()
      .trim()
      .min(1, "Email cannot be empty.")
      .max(254, "Email must be 254 characters or fewer.")
      .email("Enter a valid email address."),
    is_public: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("phone"),
    label: contactLabelSchema,
    value: contactValueSchema(32, "Phone number", normalizeContactPhone, "Enter a valid phone number."),
    is_public: z.boolean().default(false),
  }),
]);

export type ContactItem = z.infer<typeof contactItemSchema>;

const contactItemsSchema = z
  .array(contactItemSchema)
  .max(maxContactItems, `Add up to ${maxContactItems} contact details.`)
  .default([]);

/**
 * The single rule for what a scanner may see. The API applies this before a public
 * profile leaves the server — a hidden detail is absent from the response, not merely
 * unrendered, so it never reaches the page source, the OG image or the vCard.
 */
export function publicContactItems(items: readonly ContactItem[]): ContactItem[] {
  return items.filter((item) => item.is_public);
}

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
  contact_items: contactItemsSchema,
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
