"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="empty-state"><div><span className="empty-symbol"><CircleAlert /></span><h1>Something went wrong.</h1><p>Let’s try that again.</p><Button onClick={reset}>Try again ↻</Button></div></main>;
}
