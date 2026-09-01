import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/button";

export default function NotFound() {
  return <main className="empty-state"><div><span className="empty-symbol"><SearchX /></span><h1>This Sia isn’t here.</h1><p>It may be private or have a new link.</p><ButtonLink href="/">Go home</ButtonLink></div></main>;
}
