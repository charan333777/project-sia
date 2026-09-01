"use client";

import { ChevronDown, LogIn, LogOut, MapPin, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { ButtonLink } from "./button";
import { Logo } from "./logo";

export function Header() {
  const { session, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className="header-nav" aria-label="Primary navigation">
          <Link className="nav-link nav-link-icon nearby-nav-link" href="/nearby"><MapPin size={17} /><span>Nearby</span></Link>
          {!loading && session ? (
            <>
              <Link className="nav-link nav-link-icon" href="/profile"><UserRound size={17} /><span>Profile</span></Link>
              <div className="account-menu" ref={menuRef}>
                <button
                  className="account-trigger"
                  aria-label="Account menu"
                  aria-expanded={open}
                  aria-haspopup="menu"
                  onClick={() => setOpen((value) => !value)}
                >
                  <span className="avatar"><UserRound size={17} /></span>
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
                {open && (
                  <div className="dropdown" role="menu">
                    <span className="dropdown-email">{session.user.email}</span>
                    <button role="menuitem" onClick={() => void signOut()}>
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link className="nav-link nav-link-icon" href="/login"><LogIn size={17} /><span>Log in</span></Link>
              <ButtonLink href="/create" className="header-cta"><Plus size={18} /><span>Create</span></ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
