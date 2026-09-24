import type { Metadata } from "next";

// The parent layout already keeps every /profile page out of search results.
export const metadata: Metadata = {
  title: "Edit your Sia",
  description: "Update your Sia profile.",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
