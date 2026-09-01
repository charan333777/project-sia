import type { Metadata } from "next";
import { NearbyExperience } from "@/components/nearby-experience";

export const metadata: Metadata = {
  title: "Nearby",
  description: "See who’s open to hello nearby.",
};

export default function NearbyPage() {
  return <NearbyExperience />;
}
