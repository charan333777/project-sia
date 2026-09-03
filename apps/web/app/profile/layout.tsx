import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Manage your Sia profile.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
