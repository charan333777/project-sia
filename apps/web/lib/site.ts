const fallbackSiteUrl = "http://localhost:3000";

export const siteConfig = {
  name: "Sia",
  title: "Personal Profiles, Nearby Connections & QR Codes | Sia",
  description:
    "Meet people more naturally with Sia. Connect nearby, introduce yourself your way and make conversations easier.",
  shortDescription: "A personal profile for easier real-life introductions.",
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl),
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
