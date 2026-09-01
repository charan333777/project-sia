"use client";

import { Check } from "lucide-react";
import type { ProfileTheme } from "@sia/validation";
import { profileThemeOptions } from "./profile-themes";

export function ProfileThemePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ProfileTheme;
  onChange: (theme: ProfileTheme) => void;
  disabled?: boolean;
}) {
  return (
    <div className="profile-theme-picker" role="radiogroup" aria-label="Personality theme">
      {profileThemeOptions.map((theme) => {
        const selected = value === theme.id;
        return (
          <button
            type="button"
            className={`profile-theme-option profile-theme-option-${theme.id} ${selected ? "profile-theme-option-selected" : ""}`}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            key={theme.id}
            onClick={() => onChange(theme.id)}
          >
            <span className="profile-theme-swatch" aria-hidden="true"><i /><i /></span>
            <span>{theme.label}</span>
            {selected && <Check size={14} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
