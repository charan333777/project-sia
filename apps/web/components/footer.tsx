import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <Logo compact />
      <p>Real people. Easier hellos.</p>
      <span>© {new Date().getFullYear()} Sia</span>
    </footer>
  );
}
