"use client";

import { ArrowLeft, Check, Download, Expand, LockKeyhole, Share2 } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { LoadingState } from "@/components/loading-state";
import { QrViewer } from "@/components/qr-viewer";
import { useOwnedProfile } from "@/hooks/use-owned-profile";

export default function QrPage() {
  const { profile, loading, error } = useOwnedProfile();
  const [status, setStatus] = useState("");
  if (loading) return <LoadingState label="Preparing your QR…" />;
  if (error || !profile) return <div className="empty-state"><div><h1>We hit a snag.</h1><p>{error}</p></div></div>;
  if (!profile.is_public) return <main className="empty-state"><div><span className="empty-symbol"><LockKeyhole /></span><h1>Your Sia is private.</h1><p>Make it public before sharing.</p><ButtonLink href="/profile/edit">Choose visibility</ButtonLink></div></main>;
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/$/, "");
  const url = `${origin}/u/${profile.username}`;
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.display_name} on Sia`, url });
        return;
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
  };
  const fullscreen = async () => {
    const card = document.getElementById("sia-qr-card");
    if (!card?.requestFullscreen) {
      setStatus("Full screen unavailable");
      return;
    }
    try {
      await card.requestFullscreen();
    } catch {
      setStatus("Full screen unavailable");
    }
  };
  const download = () => {
    const svg = document.getElementById("sia-qr-code");
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${profile.username}-sia-qr.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    setStatus("Saved");
  };
  return (
    <main className="qr-shell">
      <QrViewer profile={profile} url={url} />
      <div className="qr-toolbox" aria-label="QR actions"><Button variant="secondary" onClick={() => void fullscreen()}><Expand size={17} /> Full screen</Button><Button variant="secondary" onClick={() => void share()}><Share2 size={17} /> Share</Button><Button variant="secondary" onClick={download}><Download size={17} /> Save</Button></div>
      <p className="copy-status" role="status">{status ? <><Check size={14} /> {status}</> : ""}</p>
      <div className="qr-actions"><ButtonLink href="/profile" variant="quiet"><ArrowLeft size={17} /> Profile</ButtonLink></div>
    </main>
  );
}
