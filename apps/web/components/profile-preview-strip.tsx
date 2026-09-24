"use client";

import { Maximize2, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import type { ProfileInput } from "@sia/validation";
import { ProfileAvatar, ProfileCard } from "./profile-card";
import { getProfileTheme } from "./profile-themes";

/**
 * The phone-sized stand-in for the live preview: short enough to sit above a wizard step
 * without pushing it off screen, and a tap away from the full card.
 */
export function ProfilePreviewStrip({ profile, photoPreviewUrl }: { profile: ProfileInput; photoPreviewUrl: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // The full card only mounts while the sheet is open, so its heading ids never sit in the
  // page twice alongside the desktop preview.
  const [open, setOpen] = useState(false);
  const theme = getProfileTheme(profile.profile_theme);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        className={`preview-strip profile-theme-${theme}`}
        aria-haspopup="dialog"
        onClick={() => { setOpen(true); dialog.current?.showModal(); }}
      >
        <ProfileAvatar profile={profile} photoUrl={photoPreviewUrl} />
        <span className="preview-strip-copy">
          <span className="preview-strip-label">Live preview</span>
          <strong>{profile.display_name}</strong>
          <small>{profile.role} · @{profile.username}</small>
          {profile.current_context && <small className="preview-strip-now"><Sparkles size={12} aria-hidden="true" /> {profile.current_context}</small>}
        </span>
        <span className="preview-strip-expand" aria-hidden="true"><Maximize2 size={16} /></span>
        <span className="visually-hidden">Open the full preview</span>
      </button>
      <dialog
        ref={dialog}
        className="preview-sheet"
        aria-label="Live profile preview"
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === event.currentTarget && close()}
      >
        <div className="preview-sheet-body">
          <div className="preview-sheet-top">
            <span className="builder-preview-label">Live preview</span>
            <button type="button" className="modal-close" aria-label="Close preview" onClick={close}><X /></button>
          </div>
          {open && <ProfileCard profile={profile} photoPreviewUrl={photoPreviewUrl} compact />}
        </div>
      </dialog>
    </>
  );
}
