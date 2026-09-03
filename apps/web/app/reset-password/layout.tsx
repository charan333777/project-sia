import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Sia account.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ResetPasswordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
