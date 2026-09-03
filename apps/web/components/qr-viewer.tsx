"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Profile } from "@sia/validation";
import { Logo } from "./logo";
import { getProfileCharacterOption } from "./profile-characters";
import { getProfileTheme } from "./profile-themes";

export function QrViewer({ profile, url }: { profile: Profile; url: string }) {
  const theme = getProfileTheme(profile.profile_theme);
  const character = getProfileCharacterOption(profile.profile_character);
  const avatarSrc = profile.avatar_url ?? character.imageSrc;
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
      <p>Scan to meet {profile.display_name}</p>
    </div>
  );
}
