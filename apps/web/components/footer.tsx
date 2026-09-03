import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <Logo compact />
      <p>Real people. Easier hellos.</p>
      <nav aria-label="Footer navigation">
        <Link href="/">Home</Link>
        <Link href="/create">Create a profile</Link>
        <Link href="/nearby">Nearby</Link>
      </nav>
      <span>© {new Date().getFullYear()} Sia</span>
    </footer>
  );
}
