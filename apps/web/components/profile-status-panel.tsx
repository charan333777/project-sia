"use client";

import { useEffect, useState } from "react";
import type { ProfileStatus } from "@sia/validation";
import {
  formatStatusRemaining,
  getProfileStatusOption,
  statusRemainingFraction,
} from "./profile-status-options";

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function StatusRing({ fraction }: { fraction: number }) {
  return (
    <svg className="status-ring" width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
      <circle className="status-ring-track" cx="20" cy="20" r={RING_RADIUS} fill="none" strokeWidth="5" />
      <circle
        className="status-ring-value"
        cx="20"
        cy="20"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${RING_CIRCUMFERENCE * fraction} ${RING_CIRCUMFERENCE}`}
      />
    </svg>
  );
}

/**
 * The live status on a profile card. The remaining time is resolved after mount so a
 * server-rendered page and the browser never disagree about the clock.
 */
export function ProfileStatusPanel({ status }: { status: ProfileStatus }) {
  const [now, setNow] = useState<number | null>(null);
  const option = getProfileStatusOption(status.state);
  const Icon = option.icon;

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const fraction = now === null ? 1 : statusRemainingFraction(status.duration, status.expires_at, now);

  return (
    <section className={`status-panel status-panel-${status.state}`} aria-labelledby="status-heading">
      <span className="status-icon"><Icon size={19} /></span>
      <div className="status-body">
        <p id="status-heading">{option.label}</p>
        <strong>{status.detail || option.hint}</strong>
      </div>
      {now !== null && (
        <span className="status-remaining">
          <StatusRing fraction={fraction} />
          <small>{formatStatusRemaining(status.expires_at, now)}</small>
        </span>
      )}
    </section>
  );
}
