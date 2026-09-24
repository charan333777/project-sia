import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` keeps the installed app the same app it was when it opened on the home page.
    id: "/",
    name: "Sia — Make hello easier",
    short_name: "Sia",
    description: siteConfig.description,
    // Someone opens Sia from their home screen to show their code to the person in front of
    // them, so the icon goes straight there. Signed out, the QR page sends them to log in.
    start_url: "/profile/qr",
    // Without an explicit scope it would default to /profile/, and the rest of Sia would open
    // outside the app.
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#617fc0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/app-icon/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press on the Android icon. Shortcut icons cannot be SVG.
    shortcuts: [
      { name: "Show my QR", url: "/profile/qr", icons: [{ src: "/app-icon/192.png", sizes: "192x192", type: "image/png" }] },
      { name: "My Sia", url: "/profile", icons: [{ src: "/app-icon/192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Nearby", url: "/nearby", icons: [{ src: "/app-icon/192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
