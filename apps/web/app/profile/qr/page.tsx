"use client";

import { ArrowLeft, Check, Download, Expand, LockKeyhole, Palette, Share2 } from "lucide-react";
import type { Profile, ProfileCharacter, ProfileTheme } from "@sia/validation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { LoadingState } from "@/components/loading-state";
import { ProfileCharacterPicker } from "@/components/profile-character-picker";
import { getProfileCharacter, getProfileCharacterOption } from "@/components/profile-characters";
import { ProfileThemePicker } from "@/components/profile-theme-picker";
import { getProfileTheme, profileThemeOptions } from "@/components/profile-themes";
import { QrViewer } from "@/components/qr-viewer";
import { useOwnedProfile } from "@/hooks/use-owned-profile";
import { api } from "@/lib/api";

const svgNamespace = "http://www.w3.org/2000/svg";

function appendSvgElement<K extends keyof SVGElementTagNameMap>(
  parent: SVGElement,
  tag: K,
  attributes: Record<string, string>,
) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  parent.appendChild(element);
  return element;
}

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

function addPosterCharacterFrame(poster: SVGElement, characterId: ProfileCharacter, soft: string, accent: string) {
  if (characterId === "plain") return;
  if (characterId === "panda") {
    appendSvgElement(poster, "circle", { cx: "174", cy: "275", r: "104", fill: "#272832", opacity: ".94" });
    appendSvgElement(poster, "circle", { cx: "906", cy: "275", r: "104", fill: "#272832", opacity: ".94" });
    return;
  }
  if (characterId === "play") {
    appendSvgElement(poster, "circle", { cx: "112", cy: "420", r: "34", fill: accent, opacity: ".65" });
    appendSvgElement(poster, "circle", { cx: "968", cy: "710", r: "46", fill: soft, opacity: ".92" });
    return;
  }
  const isPuppy = characterId === "puppy";
  const fill = isPuppy ? "#D9A267" : soft;
  appendSvgElement(poster, "ellipse", { cx: "135", cy: "570", rx: isPuppy ? "92" : "118", ry: isPuppy ? "205" : "222", fill, opacity: ".94", transform: `rotate(${isPuppy ? "10" : "4"} 135 570)` });
  appendSvgElement(poster, "ellipse", { cx: "945", cy: "570", rx: isPuppy ? "92" : "118", ry: isPuppy ? "205" : "222", fill, opacity: ".94", transform: `rotate(${isPuppy ? "-10" : "-4"} 945 570)` });
}

function buildQrPoster(profile: Profile, qr: SVGSVGElement, avatarDataUrl: string | null) {
  const themeId = getProfileTheme(profile.profile_theme);
  const theme = profileThemeOptions.find((option) => option.id === themeId) ?? profileThemeOptions[0]!;
  const character = getProfileCharacterOption(profile.profile_character);
  const poster = document.createElementNS(svgNamespace, "svg");
  poster.setAttribute("xmlns", svgNamespace);
  poster.setAttribute("viewBox", "0 0 1080 1350");
  poster.setAttribute("width", "1080");
  poster.setAttribute("height", "1350");

  appendSvgElement(poster, "rect", { width: "1080", height: "1350", rx: "72", fill: theme.surface });
  appendSvgElement(poster, "circle", { cx: "965", cy: "120", r: "240", fill: theme.soft, opacity: ".76" });
  appendSvgElement(poster, "circle", { cx: "85", cy: "1230", r: "210", fill: theme.soft, opacity: ".48" });
  const brand = appendSvgElement(poster, "text", { x: "540", y: "142", fill: theme.ink, "font-family": "Arial, sans-serif", "font-size": "56", "font-weight": "700", "text-anchor": "middle" });
  brand.textContent = "Sia";
  if (!profile.avatar_url) addPosterCharacterFrame(poster, character.id, theme.soft, theme.accent);
  appendSvgElement(poster, "rect", { x: "155", y: "185", width: "770", height: "770", rx: "45", fill: "#ffffff", stroke: theme.soft, "stroke-width": "5" });

  const qrClone = qr.cloneNode(true) as SVGSVGElement;
  qrClone.removeAttribute("id");
  qrClone.setAttribute("x", "180");
  qrClone.setAttribute("y", "210");
  qrClone.setAttribute("width", "720");
  qrClone.setAttribute("height", "720");
  poster.appendChild(qrClone);

  if (avatarDataUrl) {
    appendSvgElement(poster, "circle", { cx: "540", cy: "1045", r: "82", fill: "#ffffff", stroke: theme.soft, "stroke-width": "5" });
    if (profile.avatar_url) {
      const definitions = appendSvgElement(poster, "defs", {});
      const clip = appendSvgElement(definitions, "clipPath", { id: "sia-avatar-clip" });
      appendSvgElement(clip, "circle", { cx: "540", cy: "1045", r: "68" });
    }
    appendSvgElement(poster, "image", { x: "472", y: "977", width: "136", height: "136", href: avatarDataUrl, preserveAspectRatio: profile.avatar_url ? "xMidYMid slice" : "xMidYMid meet", ...(profile.avatar_url ? { "clip-path": "url(#sia-avatar-clip)" } : {}) });
  }
  const name = appendSvgElement(poster, "text", { x: "540", y: avatarDataUrl ? "1190" : "1095", fill: theme.ink, "font-family": "Georgia, serif", "font-size": "78", "font-weight": "600", "text-anchor": "middle" });
  name.textContent = profile.display_name;
  const invitation = appendSvgElement(poster, "text", { x: "540", y: avatarDataUrl ? "1262" : "1172", fill: theme.ink, "font-family": "Arial, sans-serif", "font-size": "38", "font-weight": "600", "text-anchor": "middle" });
  invitation.textContent = `Scan to meet ${profile.display_name}`;
  appendSvgElement(poster, "circle", { cx: "540", cy: avatarDataUrl ? "1318" : "1265", r: "10", fill: theme.accent });
  return poster;
}

export default function QrPage() {
  const { profile, setProfile, loading, error, session } = useOwnedProfile();
  const [status, setStatus] = useState("");
  const [savingStyle, setSavingStyle] = useState(false);
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
  const download = async () => {
    const svg = document.getElementById("sia-qr-code") as SVGSVGElement | null;
    if (!svg) return;
    try {
      setStatus("Preparing card…");
      const avatarPath = profile.avatar_url ?? getProfileCharacterOption(profile.profile_character).imageSrc;
      const avatarDataUrl = avatarPath ? await imageAssetToDataUrl(avatarPath) : null;
      const poster = buildQrPoster(profile, svg, avatarDataUrl);
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
      <QrViewer profile={profile} url={url} />
      <section className="qr-personality-panel" aria-labelledby="qr-personality-heading">
        <div className="qr-personality-heading"><span><Palette size={19} /></span><div><strong id="qr-personality-heading">Make it yours</strong><small>QR + profile</small></div></div>
        <div className="qr-personality-control"><strong>Character</strong><small>{profile.avatar_url ? "Choosing one replaces your photo." : "Show your personality."}</small></div>
        <ProfileCharacterPicker value={getProfileCharacter(profile.profile_character)} onChange={(character) => void chooseCharacter(character)} disabled={savingStyle} />
        <div className="qr-personality-control"><strong>Colour mood</strong><small>Make the character feel like you.</small></div>
        <ProfileThemePicker value={getProfileTheme(profile.profile_theme)} onChange={(theme) => void chooseTheme(theme)} disabled={savingStyle} />
      </section>
      <div className="qr-toolbox" aria-label="QR actions"><Button variant="secondary" onClick={() => void fullscreen()}><Expand size={17} /> Full screen</Button><Button variant="secondary" onClick={() => void share()}><Share2 size={17} /> Share</Button><Button variant="secondary" onClick={() => void download()}><Download size={17} /> Save</Button></div>
      <p className="copy-status" role="status">{status ? <><Check size={14} /> {status}</> : ""}</p>
      <div className="qr-actions"><ButtonLink href="/profile" variant="quiet"><ArrowLeft size={17} /> Profile</ButtonLink></div>
    </main>
  );
}
