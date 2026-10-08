"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import type { Profile, ProfileStatusDuration, ProfileStatusState } from "@sia/validation";
import { moveRadioSelection } from "@/lib/radio-group";
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
  const [confirmedState, setConfirmedState] = useState<ProfileStatusState | null>(null);
  const [error, setError] = useState("");
  const confirmationFrame = useRef<number | null>(null);
  const confirmationTimer = useRef<number | null>(null);

  const activeState = profile.status?.state ?? "off";

  // A status can also be set from the nudge at the top of the page; follow its duration.
  useEffect(() => {
    if (profile.status_duration) setDuration(profile.status_duration);
  }, [profile.status_duration]);

  useEffect(() => { setDetail(profile.status?.detail ?? profile.current_context); }, [profile.status?.detail, profile.current_context]);

  useEffect(() => () => {
    if (confirmationFrame.current !== null) window.cancelAnimationFrame(confirmationFrame.current);
    if (confirmationTimer.current !== null) window.clearTimeout(confirmationTimer.current);
  }, []);

  function confirm(state: ProfileStatusState) {
    if (confirmationFrame.current !== null) window.cancelAnimationFrame(confirmationFrame.current);
    if (confirmationTimer.current !== null) window.clearTimeout(confirmationTimer.current);

    // Drop the class for one frame so choosing the same state again can replay the confirmation.
    setConfirmedState(null);
    confirmationFrame.current = window.requestAnimationFrame(() => {
      setConfirmedState(state);
      confirmationTimer.current = window.setTimeout(() => setConfirmedState(null), 560);
    });
  }

  async function apply(state: ProfileStatusState, nextDuration: ProfileStatusDuration) {
    setPending(state);
    setError("");
    try {
      const updated =
        state === "off"
          ? await api.setProfileStatus({ state: "off" }, token)
          : await api.setProfileStatus({ state, duration: nextDuration, detail }, token);
      onChange(updated);
      confirm(state);
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

      <div className="status-choices" role="radiogroup" aria-label="Status" onKeyDown={moveRadioSelection}>
        {profileStatusOptions.map((option) => {
          const Icon = option.icon;
          const selected = activeState === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              disabled={pending !== null}
              className={`status-choice status-choice-${option.id} ${selected ? "status-choice-selected" : ""} ${confirmedState === option.id ? "status-choice-confirmed" : ""}`}
              onClick={() => apply(option.id, duration)}
            >
              <span className="status-choice-icon"><Icon size={20} /></span>
              <strong>{option.label}</strong>
              <small>{option.id === "off" && profile.current_context ? "Just your ‘right now’ line" : option.hint}</small>
            </button>
          );
        })}
      </div>

      <div className="status-duration">
        <span className="status-duration-label"><Clock size={16} /> For how long</span>
        <div className="status-duration-choices" role="radiogroup" aria-label="Status duration" onKeyDown={moveRadioSelection}>
          {profileStatusDurationOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={duration === option.id}
              tabIndex={duration === option.id ? 0 : -1}
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
