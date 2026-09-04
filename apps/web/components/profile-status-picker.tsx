"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import type { Profile, ProfileStatusDuration, ProfileStatusState } from "@sia/validation";
import { api, ApiRequestError } from "../lib/api";
import {
  profileStatusDurationOptions,
  profileStatusOptions,
} from "./profile-status-options";

/**
 * Owner control for the profile status. Picking a state is one tap; the duration is a
 * second. The expiry itself is decided by the API, never sent from here.
 */
export function ProfileStatusPicker({
  profile,
  token,
  onChange,
}: {
  profile: Profile;
  token: string;
  onChange: (profile: Profile) => void;
}) {
  const [duration, setDuration] = useState<ProfileStatusDuration>(profile.status_duration ?? "1h");
  const [detail, setDetail] = useState(profile.status ? profile.status.detail : profile.current_context);
  const [pending, setPending] = useState<ProfileStatusState | null>(null);
  const [error, setError] = useState("");

  const activeState = profile.status?.state ?? "off";

  async function apply(state: ProfileStatusState, nextDuration: ProfileStatusDuration) {
    setPending(state);
    setError("");
    try {
      const updated =
        state === "off"
          ? await api.setProfileStatus({ state: "off" }, token)
          : await api.setProfileStatus({ state, duration: nextDuration, detail }, token);
      onChange(updated);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "We couldn’t update your status. Try again in a moment.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="status-picker" aria-labelledby="status-picker-heading">
      <h2 id="status-picker-heading">Your status</h2>
      <p className="status-picker-note">Clears itself when the time is up, so your profile can’t go stale.</p>

      <div className="status-choices" role="radiogroup" aria-label="Status">
        {profileStatusOptions.map((option) => {
          const Icon = option.icon;
          const selected = activeState === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending !== null}
              className={`status-choice status-choice-${option.id} ${selected ? "status-choice-selected" : ""}`}
              onClick={() => apply(option.id, duration)}
            >
              <span className="status-choice-icon"><Icon size={20} /></span>
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </button>
          );
        })}
      </div>

      <div className="status-duration">
        <span className="status-duration-label"><Clock size={16} /> For how long</span>
        <div className="status-duration-choices" role="radiogroup" aria-label="Status duration">
          {profileStatusDurationOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={duration === option.id}
              disabled={pending !== null}
              className={`chip ${duration === option.id ? "chip-selected" : ""}`}
              onClick={() => {
                setDuration(option.id);
                if (activeState !== "off") void apply(activeState, option.id);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="status-detail" htmlFor="status-detail">
        <span>Add a detail <small>Optional</small></span>
        <input
          id="status-detail"
          type="text"
          maxLength={160}
          value={detail}
          placeholder="At the design meetup, back table"
          onChange={(event) => setDetail(event.target.value)}
          onBlur={() => {
            if (activeState !== "off" && detail !== (profile.status?.detail ?? "")) {
              void apply(activeState, duration);
            }
          }}
        />
      </label>

      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
