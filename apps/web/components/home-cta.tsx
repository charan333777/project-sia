"use client";

import { ArrowRight } from "lucide-react";
import { useAuth } from "./auth-provider";
import { ButtonLink } from "./button";

/**
 * The home page's main call to action. The server renders "Create mine" for everyone, so
 * crawlers and first-time visitors see the same page; once a signed-in session is known it
 * becomes a way back to the Sia they already have instead of a wizard they cannot finish.
 */
export function HomeCta({ variant = "primary", iconSize = 18 }: { variant?: "primary" | "quiet"; iconSize?: number }) {
  const { session, loading } = useAuth();
  const signedIn = !loading && Boolean(session);
  return (
    <ButtonLink href={signedIn ? "/profile" : "/create"} variant={variant}>
      {signedIn ? "Open my Sia" : "Create mine"} <ArrowRight size={iconSize} />
    </ButtonLink>
  );
}
