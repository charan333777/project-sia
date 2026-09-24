"use client";

import { Radio, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Profile } from "@sia/validation";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "./button";

const snoozeKey = "sia:status-nudge-snoozed-until";
const snoozeMs = 12 * 60 * 60_000;

function isSnoozed() {
  try {
    return Number(window.localStorage.getItem(snoozeKey) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function snoozeForNow() {
  try {
    window.localStorage.setItem(snoozeKey, String(Date.now() + snoozeMs));
  } catch {
    // Private browsing: it comes back on the next visit, which is harmless.
  }
}

/**
 * A status is what makes a Sia feel current, but it starts switched off and the picker sits
 * below the card. While nothing is showing on a public Sia, this offers the common case —
 * Open for three hours — as one tap near the top. "Not now" quiets it on this device for
 * twelve hours; the full picker further down is unchanged.
 */
export function ProfileStatusNudge({
  profile,
  token,
  onChange,
}: {
  profile: Profile;
  token: string;
  onChange: (profile: Profile) => void;
}) {
  // Assume snoozed until storage has been read, so a snoozed nudge never flashes in.
  const [snoozed, setSnoozed] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSnoozed(isSnoozed());
  }, []);

  if (profile.status || !profile.is_public || snoozed) return null;

  const openNow = async () => {
    setPending(true);
    setError("");
    try {
      // The status detail is the "right now" line, so sending it back keeps it as it is.
      onChange(await api.setProfileStatus({ state: "open", duration: "3h", detail: profile.current_context }, token));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "We couldn’t set your status. Try again in a moment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="status-nudge" aria-labelledby="status-nudge-heading">
      <span className="status-nudge-icon" aria-hidden="true"><Radio size={19} /></span>
      <div className="status-nudge-copy">
        <strong id="status-nudge-heading">Heading out?</strong>
        <p>Show you’re open to a hello. It switches itself off after 3 hours.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
      <Button className="status-nudge-action" loading={pending} onClick={() => void openNow()}>Open for 3h</Button>
      <button
        type="button"
        className="status-nudge-close"
        aria-label="Not now"
        onClick={() => {
          snoozeForNow();
          setSnoozed(true);
        }}
      >
        <X size={16} />
      </button>
    </section>
  );
}
