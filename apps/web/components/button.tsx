import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
  loading?: boolean;
};

export function Button({ variant = "primary", loading, className = "", children, disabled, ...props }: ButtonProps) {
  return (
    <button className={`button button-${variant} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  className?: string;
}) {
  return (
    <Link className={`button button-${variant} ${className}`} href={href}>
      {children}
    </Link>
  );
}
