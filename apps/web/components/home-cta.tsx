"use client";

import { ArrowRight } from "lucide-react";
import { useAuth } from "./auth-provider";
import { ButtonLink } from "./button";

/**
 * The home page's main call to action. The server renders "Create mine" for everyone, so
 * crawlers and first-time visitors see the same page; once a signed-in session is known it
 * points at /profile. The label stays the neutral "My Sia" because this component only knows
 * there is a session, not whether a profile exists — /profile sends a profile-less account on
 * to creation, so the copy must not promise a Sia that may still need making.
 */
export function HomeCta({ variant = "primary", iconSize = 18 }: { variant?: "primary" | "quiet"; iconSize?: number }) {
  const { session, loading } = useAuth();
  const signedIn = !loading && Boolean(session);
  return (
    <ButtonLink href={signedIn ? "/profile" : "/create"} variant={variant}>
      {signedIn ? "My Sia" : "Create mine"} <ArrowRight size={iconSize} />
    </ButtonLink>
  );
}
