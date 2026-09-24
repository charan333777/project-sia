import { SearchX, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/button";

/**
 * Most people who land here just scanned a code that is private, retired or mistyped. They
 * came to meet someone, which makes this the best moment to offer them a Sia of their own.
 */
export default function NotFound() {
  return (
    <main className="empty-state">
      <div>
        <span className="empty-symbol"><SearchX /></span>
        <h1>This Sia isn’t here.</h1>
        <p>It may be private or have a new link.</p>
        <div className="empty-state-actions">
          <ButtonLink href="/create"><Sparkles size={17} /> Make your own Sia</ButtonLink>
          <ButtonLink href="/" variant="quiet">Go home</ButtonLink>
        </div>
      </div>
    </main>
  );
}
