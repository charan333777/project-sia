import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sia — Make hello easier",
    short_name: "Sia",
    description: "Meet people more naturally with Sia. Connect nearby, introduce yourself your way and make conversations easier.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#617fc0",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
