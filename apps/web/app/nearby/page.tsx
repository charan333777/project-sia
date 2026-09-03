import type { Metadata } from "next";
import { NearbyExperience } from "@/components/nearby-experience";

export const metadata: Metadata = {
  title: "Nearby",
  description: "Use Sia Nearby to find people who are open to meeting without sharing exact location pins.",
  robots: { index: false, follow: false, nocache: true },
};

export default function NearbyPage() {
  return <NearbyExperience />;
}
