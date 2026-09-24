"use client";

import { Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Profile } from "@sia/validation";
import { Logo } from "./logo";
import { getProfileCharacterOption } from "./profile-characters";
import { getProfileStatusOption } from "./profile-status-options";
import { getProfileTheme } from "./profile-themes";

/** What a person would type if the scan fails: no scheme, no trailing slash. */
function readableUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * The line that makes someone want to scan: a live status first, else the "right now"
 * line. Both already expire or change on their own, so the screen never shows a stale one.
 */
function nowLine(profile: Profile) {
  if (profile.status) {
    const option = getProfileStatusOption(profile.status.state);
    return { tone: profile.status.state, Icon: option.icon, text: `${option.label} · ${profile.status.detail || option.hint}` };
  }
  if (profile.current_context) return { tone: "context", Icon: Sparkles, text: profile.current_context };
  return null;
}

export function QrViewer({ profile, url }: { profile: Profile; url: string }) {
  const theme = getProfileTheme(profile.profile_theme);
  const character = getProfileCharacterOption(profile.profile_character);
  const avatarSrc = profile.avatar_url ?? character.imageSrc;
  const now = nowLine(profile);
  return (
    <div className={`qr-card qr-theme-${theme} ${profile.avatar_url ? "qr-character-photo" : `qr-character-${character.id}`}`} id="sia-qr-card">
      <i className="qr-personality-shape qr-personality-shape-one" aria-hidden="true" />
      <i className="qr-personality-shape qr-personality-shape-two" aria-hidden="true" />
      <Logo />
      <div className="qr-character-code-stage">
        {!profile.avatar_url && character.id !== "plain" && <>
          <i className="qr-character-decoration qr-character-decoration-left" aria-hidden="true" />
          <i className="qr-character-decoration qr-character-decoration-right" aria-hidden="true" />
        </>}
        <div className="qr-code-wrap">
          <QRCodeSVG id="sia-qr-code" value={url} size={284} level="M" marginSize={4} bgColor="#FFFFFF" fgColor="#191919" title={`QR code for ${profile.display_name}'s Sia profile`} />
        </div>
      </div>
      {avatarSrc && <div className={`qr-character-medallion ${profile.avatar_url ? "qr-photo-medallion" : ""}`} aria-label={profile.avatar_url ? `${profile.display_name}'s photo` : `${character.label} personality`}><img src={avatarSrc} alt="" width="96" height="96" draggable={false} /></div>}
      <h1>{profile.display_name}</h1>
      {now && <div className={`qr-now qr-now-${now.tone}`}><now.Icon size={15} aria-hidden="true" /><span>{now.text}</span></div>}
      <p>Scan to meet {profile.display_name}</p>
      {/* A card is held up in bad light to old cameras. Without a typable address a failed
          scan is a dead end, so the URL is part of the card, not a detail beside it. */}
      <span>{readableUrl(url)}</span>
    </div>
  );
}
