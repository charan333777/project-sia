"use client";

import type { Profile } from "@sia/validation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api, ApiRequestError } from "@/lib/api";

export function useOwnedProfile() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/login");
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
            .then((pending) => active && router.replace(pending ? "/profile/deleted" : "/create"))
            .catch(() => active && router.replace("/create"));
          return;
        }
        setError(caught instanceof Error ? caught.message : "We couldn’t load your profile.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authLoading, router, session]);

  return { profile, setProfile, loading: authLoading || loading, error, session };
}
