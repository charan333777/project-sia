"use client";

import type { Profile } from "@sia/validation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api, ApiRequestError } from "@/lib/api";

export function useOwnedProfile({ allowSignedOut = false }: { allowSignedOut?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // A signed-in person with no profile still wanted the tool they tapped, so creation keeps
  // where they were headed and why. /profile uses its own welcome, so it needs no return path.
  const createPath = () => {
    const from = pathname === "/nearby" ? "nearby" : pathname.startsWith("/profile/qr") ? "qr" : "profile";
    const query = new URLSearchParams({ from });
    if (from !== "profile") query.set("next", pathname);
    return `/create?${query.toString()}`;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      if (allowSignedOut) { setLoading(false); setProfile(null); return; }
      // Come back here afterwards — someone who tapped Nearby wants Nearby, not their profile.
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    let active = true;
    void api.getMyProfile(session.access_token)
      .then((data) => active && setProfile(data))
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiRequestError && caught.code === "PROFILE_NOT_FOUND") {
          // A profile awaiting purge also reads as missing. Sending someone to /create
          // would dead-end on PROFILE_EXISTS, so offer recovery instead.
          void api.getPendingDeletion(session.access_token)
            .then((pending) => active && router.replace(pending ? "/profile/deleted" : createPath()))
            .catch(() => active && router.replace(createPath()));
          return;
        }
        setError(caught instanceof Error ? caught.message : "We couldn’t load your profile.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authLoading, pathname, router, session, allowSignedOut]);

  return { profile, setProfile, loading: authLoading || loading, error, session };
}
