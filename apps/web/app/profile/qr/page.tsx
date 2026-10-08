"use client";

import { ArrowLeft, Check, Download, Expand, LockKeyhole, Palette, Share2 } from "lucide-react";
import type { ProfileCharacter, ProfileTheme } from "@sia/validation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { HomeScreenTip } from "@/components/home-screen-tip";
import { EventReadyPanel } from "@/components/event-ready-panel";
import { LoadingState } from "@/components/loading-state";
import { ProfileCharacterPicker } from "@/components/profile-character-picker";
import { getProfileCharacter, getProfileCharacterOption } from "@/components/profile-characters";
import { ProfileThemePicker } from "@/components/profile-theme-picker";
import { getProfileTheme } from "@/components/profile-themes";
import { QrViewer } from "@/components/qr-viewer";
import { useOwnedProfile } from "@/hooks/use-owned-profile";
import { api } from "@/lib/api";
import { buildQrPoster } from "@/lib/qr-poster";

async function imageAssetToDataUrl(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Mascot image could not be loaded");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function QrPage() {
  const { profile, setProfile, loading, error, session } = useOwnedProfile();
  const [status, setStatus] = useState("");
  const [savingStyle, setSavingStyle] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [customising, setCustomising] = useState(false);
  const personalityPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (customising) personalityPanel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [customising]);
  if (loading) return <LoadingState label="Preparing your QR…" />;
  if (error || !profile) return <div className="empty-state"><div><h1>We hit a snag.</h1><p>{error}</p></div></div>;
  const makePublic = async () => {
    if (!session || publishing) return;
    setPublishing(true);
    setStatus("");
    try {
      const updated = await api.updateProfile({ is_public: true }, session.access_token);
      setProfile(updated);
    } catch {
      setStatus("Couldn’t make it scannable — try again.");
      setPublishing(false);
    }
  };
  if (!profile.is_public) return (
    <main className="empty-state">
      <div>
        <span className="empty-symbol"><LockKeyhole /></span>
        <h1>Your Sia is private.</h1>
        <p>Turn it on so anyone can open it from your QR. You stay in control and can switch it back any time.</p>
        <div className="empty-state-actions">
          <Button onClick={() => void makePublic()} loading={publishing}>Make my QR scannable</Button>
          <ButtonLink href="/profile/edit" variant="quiet">More visibility options</ButtonLink>
        </div>
        <p className="copy-status" role="status">{status ? <><Check size={14} /> {status}</> : ""}</p>
      </div>
    </main>
  );
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
  const download = async () => {
    const svg = document.getElementById("sia-qr-code") as SVGSVGElement | null;
    if (!svg) return;
    try {
      setStatus("Preparing card…");
      const avatarPath = profile.avatar_url ?? getProfileCharacterOption(profile.profile_character).imageSrc;
      const avatarDataUrl = avatarPath ? await imageAssetToDataUrl(avatarPath) : null;
      const poster = buildQrPoster(profile, svg, avatarDataUrl, url);
      const source = new XMLSerializer().serializeToString(poster);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${profile.username}-sia-card.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setStatus("Card saved");
    } catch {
      setStatus("Couldn’t save card");
    }
  };
  const chooseTheme = async (nextTheme: ProfileTheme) => {
    if (!session || savingStyle || nextTheme === getProfileTheme(profile.profile_theme)) return;
    const previous = profile;
    setProfile({ ...profile, profile_theme: nextTheme });
    setSavingStyle(true);
    setStatus("");
    try {
      const updated = await api.updateProfile({ profile_theme: nextTheme }, session.access_token);
      setProfile(updated);
      setStatus("Style saved");
    } catch {
      setProfile(previous);
      setStatus("Couldn’t save style");
    } finally {
      setSavingStyle(false);
    }
  };
  const chooseCharacter = async (nextCharacter: ProfileCharacter) => {
    if (!session || savingStyle || (!profile.avatar_path && nextCharacter === getProfileCharacter(profile.profile_character))) return;
    const previous = profile;
    let photoRemoved = false;
    setSavingStyle(true);
    setStatus("");
    try {
      if (profile.avatar_path) {
        const withoutPhoto = await api.removeProfilePhoto(session.access_token);
        photoRemoved = true;
        setProfile(withoutPhoto);
      }
      const updated = await api.updateProfile({ profile_character: nextCharacter }, session.access_token);
      setProfile(updated);
      setStatus("Character saved");
    } catch {
      setProfile(photoRemoved ? { ...previous, avatar_path: null, avatar_url: null } : previous);
      setStatus("Couldn’t save character");
    } finally {
      setSavingStyle(false);
    }
  };
  return (
    <main className={`qr-shell qr-shell-theme-${getProfileTheme(profile.profile_theme)}`}>
      {session && <EventReadyPanel profile={profile} token={session.access_token} onChange={setProfile} />}
      <QrViewer profile={profile} url={url} />
      <div className="qr-toolbox" aria-label="QR actions"><Button variant="secondary" onClick={() => void fullscreen()}><Expand size={17} /> Full screen</Button><Button variant="secondary" onClick={() => void share()}><Share2 size={17} /> Share</Button><Button variant="secondary" onClick={() => void download()}><Download size={17} /> Save</Button><Button variant="secondary" className={customising ? "qr-toolbox-open" : ""} aria-expanded={customising} aria-controls="qr-personality" onClick={() => setCustomising((open) => !open)}><Palette size={17} /> Style</Button></div>
      {customising && (
        <section className="qr-personality-panel" id="qr-personality" ref={personalityPanel} aria-labelledby="qr-personality-heading">
          <div className="qr-personality-heading"><span><Palette size={19} /></span><div><strong id="qr-personality-heading">Make it yours</strong><small>QR + profile</small></div></div>
          <div className="qr-personality-control"><strong>Character</strong><small>{profile.avatar_url ? "Choosing one replaces your photo." : "Show your personality."}</small></div>
          <ProfileCharacterPicker value={getProfileCharacter(profile.profile_character)} onChange={(character) => void chooseCharacter(character)} disabled={savingStyle} />
          <div className="qr-personality-control"><strong>Colour mood</strong><small>Make the character feel like you.</small></div>
          <ProfileThemePicker value={getProfileTheme(profile.profile_theme)} onChange={(theme) => void chooseTheme(theme)} disabled={savingStyle} />
        </section>
      )}
      <HomeScreenTip />
      <p className="copy-status" role="status">{status ? <><Check size={14} /> {status}</> : ""}</p>
      <div className="qr-actions"><ButtonLink href="/profile" variant="quiet"><ArrowLeft size={17} /> Profile</ButtonLink></div>
    </main>
  );
}
