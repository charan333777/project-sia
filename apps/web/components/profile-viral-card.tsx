"use client";

import { ArrowLeft, ArrowRight, QrCode, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { ButtonLink } from "./button";

/**
 * The invitation under a public card. When the owner is looking at their own card through
 * "Preview", asking them to create one makes no sense — they get a way back instead.
 * Read after hydration so the page itself stays static.
 *
 * A signed-in scanner already has a Sia, so the useful next step is to show theirs back.
 * Everyone else has just met Sia through somebody's code, often without knowing what it
 * is, so the invitation says what they would be making before asking them to make it.
 */
export function ProfileViralCard() {
  const { session, loading } = useAuth();
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).has("preview"));
  }, []);

  if (preview) {
    return (
      <section className="viral-card">
        <span><Sparkles size={17} /> This is how others see you</span>
        <ButtonLink href="/profile" variant="quiet"><ArrowLeft size={17} /> Your Sia</ButtonLink>
      </section>
    );
  }
  if (!loading && session) {
    return (
      <section className="viral-card">
        <span><QrCode size={17} /> Your turn — show them yours</span>
        <ButtonLink href="/profile/qr" variant="quiet">My QR <ArrowRight size={17} /></ButtonLink>
      </section>
    );
  }
  return (
    <section className="viral-card viral-invite" aria-labelledby="viral-invite-heading">
      <span className="viral-invite-icon" aria-hidden="true"><QrCode size={22} /></span>
      <div className="viral-invite-copy">
        <span className="eyebrow">Made with Sia</span>
        <h2 id="viral-invite-heading">Make hello easier</h2>
        <p>A profile and QR code that shows who you are and what you’re open to. Yours in 2 minutes — free, nothing to install.</p>
      </div>
      <ButtonLink href="/create">Create mine <ArrowRight size={17} /></ButtonLink>
    </section>
  );
}
