"use client";

import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProfileViewSummary } from "@sia/validation";
import { api } from "@/lib/api";

/**
 * How often the card was opened. A count and nothing else — we do not know who, where or
 * on what, by design. Renders nothing until there is something to say, so a new profile
 * is not greeted by a zero.
 */
export function ProfileViews({ token }: { token: string }) {
  const [summary, setSummary] = useState<ProfileViewSummary | null>(null);

  useEffect(() => {
    let active = true;
    void api.getProfileViews(token)
      .then((data) => active && setSummary(data))
      .catch(() => undefined);
    return () => { active = false; };
  }, [token]);

  if (!summary || summary.total === 0) return null;

  return (
    <section className="views-panel" aria-labelledby="views-heading">
      <span className="views-icon" aria-hidden="true"><Eye size={17} /></span>
      <div>
        <p id="views-heading">Opened</p>
        <strong>
          {summary.last_7_days > 0
            ? `${summary.last_7_days} ${summary.last_7_days === 1 ? "time" : "times"} this week`
            : `${summary.total} ${summary.total === 1 ? "time" : "times"} in total`}
        </strong>
        {summary.last_7_days > 0 && <small>{summary.total} in total</small>}
      </div>
    </section>
  );
}
