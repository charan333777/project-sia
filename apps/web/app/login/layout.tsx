import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in or sign up",
  description: "Log in to Sia or create your account.",
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
