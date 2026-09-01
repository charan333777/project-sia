import { z } from "zod";

export const profileThemes = ["calm", "warm", "bold", "play"] as const;
export type ProfileTheme = (typeof profileThemes)[number];

export const profileCharacters = ["plain", "puppy", "elephant", "panda", "play"] as const;
export type ProfileCharacter = (typeof profileCharacters)[number];

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

export type Profile = ProfileInput & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};
