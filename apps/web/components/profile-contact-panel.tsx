"use client";

import { ArrowUpRight, Check, ChevronRight, Copy, ContactRound, Globe2, Mail, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ContactItem, Profile } from "@sia/validation";
import { buildVCard, vCardFileName } from "@/lib/vcard";

const itemIcons = { link: Globe2, email: Mail, phone: Phone } as const;

/** The host is the honest thing to show: it is what the person is actually being sent to. */
function linkText(item: ContactItem) {
  if (item.type !== "link") return item.value;
  try {
    const url = new URL(item.value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  } catch {
    return item.value;
  }
}

function itemHref(item: ContactItem) {
  if (item.type === "email") return `mailto:${item.value}`;
  if (item.type === "phone") return `tel:${item.value.replace(/[^\d+]/g, "")}`;
  return item.value;
}

function defaultLabel(item: ContactItem) {
  if (item.label) return item.label;
  return item.type === "email" ? "Email" : item.type === "phone" ? "Phone" : "Link";
}

export function ProfileContactPanel({
  profile,
  items,
  profileUrl,
  readOnly = false,
}: {
  profile: Pick<Profile, "display_name" | "username" | "role" | "bio">;
  items: readonly ContactItem[];
  profileUrl: string;
  /**
   * Show what a scanner would see, without offering the actions — used by the builder
   * preview and by the owner's own profile, where saving yourself to your own contacts
   * and being told the card stays current are both nonsense.
   */
  readOnly?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const saveButton = useRef<HTMLButtonElement>(null);
  const [saveAhead, setSaveAhead] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // On a phone the card is taller than the screen, so Save contact starts out of reach.
  // The floating copy shows only while the real button is still further down the page;
  // once it has been reached — or scrolled past — the page's own button is the one to use.
  useEffect(() => {
    const target = saveButton.current;
    if (readOnly || !target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setSaveAhead(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [readOnly, items.length]);

  if (items.length === 0) return null;

  const copy = async (item: ContactItem, key: string) => {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopied(key);
    } catch {
      setSaveError("Couldn’t copy — try selecting the text instead.");
    }
  };

  const saveContact = () => {
    try {
      const card = buildVCard(profile, items, profileUrl);
      const blob = new Blob([card], { type: "text/vcard;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = vCardFileName(profile.username);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setSaveError("");
    } catch {
      setSaveError("Couldn’t build the contact card.");
    }
  };

  return (
    <section className="profile-section contact-section" aria-labelledby="contact-heading">
      <div className="section-eyebrow"><ContactRound size={17} /><h2 id="contact-heading">Reach me</h2></div>
      <ul className="contact-list">
        {items.map((item, index) => {
          const key = `${item.type}-${index}`;
          const Icon = itemIcons[item.type];
          return (
            <li className="contact-row" key={key}>
              <a
                className="contact-link"
                href={itemHref(item)}
                {...(item.type === "link" ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
              >
                <span className="contact-icon" aria-hidden="true"><Icon size={16} /></span>
                <span className="contact-copy">
                  <small>{defaultLabel(item)}</small>
                  <strong>{linkText(item)}</strong>
                </span>
                <span className="contact-go" aria-hidden="true">
                  {item.type === "link" ? <ArrowUpRight size={15} /> : <ChevronRight size={15} />}
                </span>
              </a>
              {!readOnly && (
                <button
                  type="button"
                  className="contact-copy-button"
                  onClick={() => void copy(item, key)}
                  aria-label={`Copy ${defaultLabel(item)}`}
                >
                  {copied === key ? <Check size={15} /> : <Copy size={15} />}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!readOnly && (
        <>
          <button ref={saveButton} type="button" className="button button-secondary contact-save" onClick={saveContact}>
            <ContactRound size={16} /> Save contact
          </button>
          <p className="contact-note">
            Saved contacts include {profile.display_name}’s Sia link, so you can always come back for
            the current details.
          </p>
          <p className="contact-status" role="status">{saveError || (copied ? "Copied" : "")}</p>
          {/* A visual shortcut to the button above, so assistive technology meets one Save, not two. */}
          <div className={`contact-save-bar${saveAhead ? " contact-save-bar-visible" : ""}`} aria-hidden="true">
            <button type="button" className="button button-primary" tabIndex={-1} onClick={saveContact}>
              <ContactRound size={17} /> Save contact
            </button>
          </div>
        </>
      )}
    </section>
  );
}
