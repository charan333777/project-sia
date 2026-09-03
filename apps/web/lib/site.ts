const fallbackSiteUrl = "http://localhost:3000";

export const siteConfig = {
  name: "Sia",
  title: "Digital Profile & QR Code for Real-Life Connections | Sia",
  description:
    "Create a personal digital profile and QR code that makes meeting, networking and starting real-life conversations easier.",
  shortDescription: "A personal digital profile for easier real-life introductions.",
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl),
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
