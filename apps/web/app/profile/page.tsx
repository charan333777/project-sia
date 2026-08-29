"use client";

import { Check, Copy, Pencil, QrCode } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { LoadingState } from "@/components/loading-state";
import { ProfileCard } from "@/components/profile-card";
import { useOwnedProfile } from "@/hooks/use-owned-profile";

function ProfileContent() {
  const { profile, loading, error } = useOwnedProfile();
  const params = useSearchParams();
  const [copied, setCopied] = useState(false);
  if (loading) return <LoadingState />;
  if (error || !profile) return <div className="empty-state"><div><h1>We hit a snag.</h1><p>{error || "Your profile couldn’t be loaded."}</p></div></div>;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  const publicUrl = `${siteUrl}/u/${profile.username}`;
  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <main className="page-shell">
      <div className="owner-shell">
        {params.get("created") === "1" && (
          <section className="ready-banner" aria-live="polite"><span className="ready-banner-icon"><Check size={20} /></span><div><h2>Your Sia is ready.</h2><p>Share it whenever you’re ready for a new conversation.</p></div></section>
        )}
        <div className="owner-heading"><div><h1>My profile</h1><p>This is what people see when they scan your Sia.</p></div><ButtonLink href={`/u/${profile.username}`} variant="secondary">View public profile</ButtonLink></div>
        <ProfileCard profile={profile} />
        <div className="owner-actions">
          <ButtonLink href="/profile/edit" variant="secondary"><Pencil size={17} /> Edit profile</ButtonLink>
          <ButtonLink href="/profile/qr"><QrCode size={18} /> Show my QR</ButtonLink>
          <Button variant="secondary" onClick={copy}><Copy size={17} /> Copy profile link</Button>
        </div>
        <p className="copy-status" role="status">{copied ? "Profile link copied." : ""}</p>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={<LoadingState />}><ProfileContent /></Suspense>;
}
