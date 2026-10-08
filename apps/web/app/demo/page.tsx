import type { Metadata } from "next";
import { SampleExperience } from "@/components/sample-experience";

export const metadata: Metadata = {
  title: "Try a sample Sia", description: "Try a fictional Sia profile before making your own.",
  robots: { index: false, follow: true },
};
export default function DemoPage() { return <SampleExperience />; }
