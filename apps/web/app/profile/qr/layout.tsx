import type { Metadata } from "next";

// The parent layout already keeps every /profile page out of search results.
export const metadata: Metadata = {
  title: "Your QR code",
  description: "Show or save your personal Sia QR code.",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
