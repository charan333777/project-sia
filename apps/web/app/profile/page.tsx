"use client";

import { Check, Copy, Eye, Globe2, LockKeyhole, Pencil, QrCode, Share2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { LoadingState } from "@/components/loading-state";
import { ProfileCard } from "@/components/profile-card";
import { ProfileViews } from "@/components/profile-views";
import { ProfileStatusNudge } from "@/components/profile-status-nudge";
import { ProfileStatusPicker } from "@/components/profile-status-picker";
import { useOwnedProfile } from "@/hooks/use-owned-profile";

function ProfileContent() {
  const { profile, setProfile, loading, error, session } = useOwnedProfile();
  const params = useSearchParams();
  const [copied, setCopied] = useState(false);
  if (loading) return <LoadingState />;
  if (error || !profile) return <div className="empty-state"><div><h1>We hit a snag.</h1><p>{error || "Your profile couldn’t be loaded."}</p></div></div>;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/$/, "");
  const publicUrl = `${siteUrl}/u/${profile.username}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.display_name} on Sia`, url: publicUrl });
        return;
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
    }
    await copy();
  };
  return (
    <main className="page-shell">
      <div className="owner-shell">
        {params.get("created") === "1" && (
          <section className="ready-banner" aria-live="polite"><span className="ready-banner-icon"><Check size={20} /></span><div><h2>You’re ready.</h2><p>{profile.is_public ? "Share your Sia." : "Your Sia is private."}</p></div></section>
        )}
        {params.get("existing") === "1" && (
          <section className="ready-banner" aria-live="polite"><span className="ready-banner-icon"><Check size={20} /></span><div><h2>You already have a Sia.</h2><p>We kept this one as it was. Edit it any time.</p></div></section>
        )}
        <div className="owner-heading">
          <div><span className={`profile-status ${profile.is_public ? "profile-status-public" : "profile-status-private"}`}>{profile.is_public ? <Globe2 size={14} /> : <LockKeyhole size={14} />}{profile.is_public ? "Public" : "Private"}</span><h1>Your Sia</h1></div>
          {profile.is_public && <ButtonLink href={`/u/${profile.username}?preview=1`} variant="quiet"><Eye size={17} /> Preview</ButtonLink>}
        </div>
        {/* Showing the code to the person in front of you is the reason this page is opened, so
            it sits above the card rather than below the status picker. */}
        <div className="owner-quick-actions">
          {profile.is_public
            ? <ButtonLink href="/profile/qr" className="owner-qr-button"><QrCode size={20} /> Show my QR</ButtonLink>
            : <ButtonLink href="/profile/edit"><Globe2 size={19} /> Choose visibility</ButtonLink>}
          <div className="owner-actions">
            {profile.is_public && <Button variant="secondary" onClick={() => void share()}><Share2 size={17} /> <span>Share</span></Button>}
            {profile.is_public && <Button variant="secondary" onClick={() => void copy()}>{copied ? <Check size={17} /> : <Copy size={17} />} <span>{copied ? "Copied" : "Copy link"}</span></Button>}
            <ButtonLink href="/profile/edit" variant="secondary"><Pencil size={17} /> <span>Edit</span></ButtonLink>
          </div>
          <p className="visually-hidden" role="status">{copied ? "Link copied" : ""}</p>
        </div>
        {session && <ProfileStatusNudge profile={profile} token={session.access_token} onChange={setProfile} />}
        <ProfileCard profile={profile} owner />
        {profile.is_public && session && <ProfileViews token={session.access_token} />}
        {session && (
          <ProfileStatusPicker profile={profile} token={session.access_token} onChange={setProfile} />
        )}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={<LoadingState />}><ProfileContent /></Suspense>;
}
