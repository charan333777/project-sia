const fallbackSiteUrl = "http://localhost:3000";

export const siteConfig = {
  name: "Sia",
  title: "Personal Profiles, Nearby Connections & QR Codes | Sia",
  // The same pitch Sia is introduced with at meetups, so a link shared into a group chat
  // repeats what people have already heard.
  description:
    "Sia makes the first conversation more meaningful. A personal profile and QR code that shows who you are and what you’re open to right now — no app needed.",
  shortDescription: "A personal profile for easier real-life introductions.",
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl),
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
