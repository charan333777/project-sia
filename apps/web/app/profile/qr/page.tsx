"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { LoadingState } from "@/components/loading-state";
import { QrViewer } from "@/components/qr-viewer";
import { useOwnedProfile } from "@/hooks/use-owned-profile";

export default function QrPage() {
  const { profile, loading, error } = useOwnedProfile();
  if (loading) return <LoadingState label="Preparing your QR…" />;
  if (error || !profile) return <div className="empty-state"><div><h1>We hit a snag.</h1><p>{error}</p></div></div>;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  const url = `${origin}/u/${profile.username}`;
  return (
    <main className="qr-shell">
      <QrViewer profile={profile} url={url} />
      <div className="qr-actions"><ButtonLink href="/profile" variant="secondary"><ArrowLeft size={17} /> Back to profile</ButtonLink><ButtonLink href={`/u/${profile.username}`} variant="quiet">Open public profile <ExternalLink size={16} /></ButtonLink></div>
    </main>
  );
}
