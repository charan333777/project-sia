import type { ProfileTheme } from "@sia/validation";

export const profileThemeOptions: Array<{
  id: ProfileTheme;
  label: string;
  accent: string;
  soft: string;
  surface: string;
  ink: string;
}> = [
  { id: "calm", label: "Calm", accent: "#617fc0", soft: "#e8edf8", surface: "#fffdfc", ink: "#191919" },
  { id: "warm", label: "Warm", accent: "#b96342", soft: "#f5dfd3", surface: "#fffaf6", ink: "#2b211d" },
  { id: "bold", label: "Bold", accent: "#22262f", soft: "#ece47b", surface: "#fffdf0", ink: "#191919" },
  { id: "play", label: "Play", accent: "#7959c7", soft: "#eadfff", surface: "#fff9ff", ink: "#241c36" },
];

export function getProfileTheme(value: unknown): ProfileTheme {
  return profileThemeOptions.some((theme) => theme.id === value) ? value as ProfileTheme : "calm";
}
