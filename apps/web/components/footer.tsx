import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <Logo compact />
      <p>Make the first hello a little easier.</p>
      <span>© {new Date().getFullYear()} Sia</span>
    </footer>
  );
}
