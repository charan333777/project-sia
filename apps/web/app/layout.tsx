import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: { default: "Sia — Make the first hello easier", template: "%s · Sia" },
  description: "A lightweight profile that helps people around you know who you are, what you’re doing, and what you’re open to.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Sia — Make the first hello easier",
    description: "Real people, shared interests, better first conversations.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
