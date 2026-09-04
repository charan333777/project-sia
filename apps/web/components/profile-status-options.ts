import { CircleDashed, EyeOff, Radio, Target, type LucideIcon } from "lucide-react";
import {
  profileStatusDurationMinutes,
  type ProfileStatusDuration,
  type ProfileStatusState,
} from "@sia/validation";

export type ProfileStatusOption = {
  id: ProfileStatusState;
  label: string;
  /** What a stranger reading the profile should take from it. */
  hint: string;
  icon: LucideIcon;
};

export const profileStatusOptions: ProfileStatusOption[] = [
  { id: "open", label: "Open", hint: "Come say hello", icon: Radio },
  { id: "around", label: "Around", hint: "Message first", icon: CircleDashed },
  { id: "focused", label: "Focused", hint: "Don’t interrupt", icon: Target },
  { id: "off", label: "Off", hint: "Nothing shows", icon: EyeOff },
];

export function getProfileStatusOption(value: ProfileStatusState): ProfileStatusOption {
  return profileStatusOptions.find((option) => option.id === value) ?? profileStatusOptions[3]!;
}

export const profileStatusDurationOptions: Array<{ id: ProfileStatusDuration; label: string }> = [
  { id: "30m", label: "30m" },
  { id: "1h", label: "1h" },
  { id: "3h", label: "3h" },
  { id: "8h", label: "8h" },
];

/** Fraction of the chosen duration still to run, clamped to 0–1 for the ring. */
export function statusRemainingFraction(
  duration: ProfileStatusDuration,
  expiresAt: string,
  now: number = Date.now(),
) {
  const totalMs = profileStatusDurationMinutes[duration] * 60_000;
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  return Math.min(1, remainingMs / totalMs);
}

/** "40 min left", "2 h left" — short enough to sit beside the ring. */
export function formatStatusRemaining(expiresAt: string, now: number = Date.now()) {
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "ending";
  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes < 60) return `${minutes} min left`;
  return `${Math.round(minutes / 60)} h left`;
}
