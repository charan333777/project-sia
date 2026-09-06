"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { profileDeletionGraceDays, type Profile } from "@sia/validation";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "./button";

/**
 * Deleting is destructive and outward-facing, so it asks for the username to be typed
 * rather than relying on a single button press. The copy states plainly what happens and
 * what does not — in particular that the username never comes back, because printed cards
 * outlive accounts and a reissued name would point strangers at somebody else.
 */
export function DeleteAccount({ profile, token, onDeleted }: { profile: Profile; token: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const matches = confirmation.trim().toLowerCase() === profile.username.toLowerCase();

  const remove = async () => {
    if (!matches || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteProfile(token);
      onDeleted();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "We couldn’t delete your Sia. Try again.");
      setDeleting(false);
    }
  };

  return (
    <section className="danger-zone" aria-labelledby="delete-heading">
      <div className="danger-heading">
        <span className="danger-icon" aria-hidden="true"><AlertTriangle size={18} /></span>
        <div>
          <strong id="delete-heading">Delete your Sia</strong>
          <small>Your profile, photo, contact details and QR code.</small>
        </div>
      </div>

      {!open ? (
        <Button type="button" variant="secondary" className="danger-button" onClick={() => setOpen(true)}>
          <Trash2 size={16} /> Delete my Sia
        </Button>
      ) : (
        <div className="danger-confirm">
          <ul className="danger-facts">
            <li>Your profile stops working straight away — your link and QR code will no longer open.</li>
            <li>You have <strong>{profileDeletionGraceDays} days</strong> to change your mind. Log back in to restore it.</li>
            <li>After that everything is erased permanently, including your photo.</li>
            <li><strong>@{profile.username} can never be used again</strong>, so cards you have already handed out never lead to someone else.</li>
          </ul>

          <label className="danger-label" htmlFor="delete-confirm">
            Type <strong>{profile.username}</strong> to confirm
          </label>
          <input
            id="delete-confirm"
            className="danger-input"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={profile.username}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="danger-actions">
            <Button type="button" variant="quiet" onClick={() => { setOpen(false); setConfirmation(""); setError(""); }}>
              Keep my Sia
            </Button>
            <Button type="button" className="danger-button" disabled={!matches} loading={deleting} onClick={() => void remove()}>
              <Trash2 size={16} /> Delete permanently
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
