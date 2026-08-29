import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/button";

export default function NotFound() {
  return <main className="empty-state"><div><span className="empty-symbol"><SearchX /></span><h1>This Sia isn’t here.</h1><p>The profile may have moved, changed username, or isn’t public right now.</p><ButtonLink href="/">Go to Sia</ButtonLink></div></main>;
}
