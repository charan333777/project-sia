import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/app-icon";

// Without this, "Add to Home Screen" on an iPhone uses a screenshot of the page as the icon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={180} />, size);
}
