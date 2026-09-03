import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

const title = "Create a Free Digital Profile & QR Code";
const description =
  "Create your free Sia digital profile, choose what to share and get a personal QR code for easier introductions and networking.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/create" },
  openGraph: {
    title: `${title} | Sia`,
    description,
    url: "/create",
    siteName: siteConfig.name,
    locale: "en_GB",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Create your Sia digital profile" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | Sia`,
    description,
    images: ["/opengraph-image"],
  },
};

export default function CreateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
