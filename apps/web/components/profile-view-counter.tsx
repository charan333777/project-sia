"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Counts one open of a public profile.
 *
 * Deliberately client-side and after hydration: crawlers and link-preview fetchers
 * (Slack, WhatsApp, search bots) request the HTML but do not run scripts, so they never
 * reach this and never inflate the number. It records nothing about the visitor — the
 * request carries no identity and the table has nowhere to put one.
 *
 * Renders nothing, and a failure is swallowed: a broken counter must not disturb the page
 * somebody is reading in front of the person who handed them the code.
 */
export function ProfileViewCounter({ username }: { username: string }) {
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void api.recordProfileView(username).catch(() => undefined);
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username]);

  return null;
}
