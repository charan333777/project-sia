"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * The home page's sample code. It opens the wizard, so someone reading on a laptop can
 * point their phone at it and carry on there — the phone is where a Sia gets shown.
 * Same rules as a real Sia code: dark on white, with its own quiet zone.
 */
export function HeroQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={92} level="M" marginSize={2} bgColor="#FFFFFF" fgColor="#191919" aria-hidden="true" />;
}
