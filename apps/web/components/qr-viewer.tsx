"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Profile } from "@sia/validation";
import { Logo } from "./logo";

export function QrViewer({ profile, url }: { profile: Profile; url: string }) {
  return (
    <div className="qr-card">
      <Logo />
      <div className="qr-code-wrap">
        <QRCodeSVG value={url} size={240} level="M" marginSize={2} bgColor="#FFFDFC" fgColor="#191919" title={`QR code for ${profile.display_name}'s Sia profile`} />
      </div>
      <h1>{profile.display_name}</h1>
      <p>Scan to see my Sia</p>
      <span>{url.replace(/^https?:\/\//, "")}</span>
    </div>
  );
}
