import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="logo" href="/" aria-label="Sia home">
      <svg className="logo-mark" viewBox="0 0 34 28" role="img" aria-hidden="true">
        <path d="M14.8 5.2c-3.9-3.2-9.7-2.6-12.9 1.3-3.2 3.9-2.6 9.7 1.3 12.9 3.4 2.8 8.3 2.7 11.6-.1" />
        <path d="M19.2 22.8c3.9 3.2 9.7 2.6 12.9-1.3 3.2-3.9 2.6-9.7-1.3-12.9-3.4-2.8-8.3-2.7-11.6.1" />
        <path d="M10.8 14h12.4" />
      </svg>
      {!compact && <span>Sia</span>}
    </Link>
  );
}
