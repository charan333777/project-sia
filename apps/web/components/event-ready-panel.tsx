"use client";

import { useEffect, useState } from "react";
import { profileEventPresetSchema, type Profile, type ProfileEventPreset } from "@sia/validation";
import { api } from "@/lib/api";
import { Button } from "./button";

const defaults: ProfileEventPreset[] = [
  { label: "Meetup", current_context: "At a meetup, open to a conversation", open_to: ["A quick chat", "Sharing ideas"] },
  { label: "Café", current_context: "Working from a café", open_to: ["Coffee", "Sharing ideas"] },
  { label: "Campus", current_context: "On campus, taking a break", open_to: ["Making friends", "Learning"] },
];

export function EventReadyPanel({ profile, token, onChange }: { profile: Profile; token: string; onChange: (profile: Profile) => void }) {
  const key = `sia-event-presets:${profile.user_id}`;
  const [saved, setSaved] = useState<ProfileEventPreset[]>([]);
  const [selected, setSelected] = useState<ProfileEventPreset>(defaults[0]!);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setSaved([]);
    setSelected(defaults[0]!);
    setMessage("");
    setLabel("");
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(raw)) setSaved(raw.slice(0, 5).flatMap((item) => {
        const parsed = profileEventPresetSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }));
    } catch { /* Browser storage is optional. */ }
  }, [key]);
  const apply = async () => {
    setBusy(true); setMessage("");
    try {
      const withTags = await api.updateProfile({ open_to: selected.open_to }, token);
      onChange(withTags);
      const updated = await api.setProfileStatus({ state: "open", duration: "3h", detail: selected.current_context }, token);
      onChange(updated);
      setMessage(profile.is_public ? "You’re open for 3 hours. Nearby visibility is unchanged." : "Ready for 3 hours. Your Sia is still private.");
    } catch { setMessage("We couldn’t finish updating your moment. Check your status and try again."); }
    finally { setBusy(false); }
  };
  const save = () => {
    const parsed = profileEventPresetSchema.safeParse({ label, current_context: profile.current_context, open_to: profile.open_to });
    if (!parsed.success) { setMessage("Give this preset a name, up to 40 characters."); return; }
    const next = [...saved.filter((p) => p.label !== parsed.data.label), parsed.data].slice(-5);
    try { localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setLabel(""); setMessage("Preset saved on this device."); }
    catch { setMessage("This browser can’t save presets. The built-in choices still work."); }
  };
  const forget = () => {
    try { localStorage.removeItem(key); setSaved([]); setSelected(defaults[0]!); setMessage("Saved presets removed from this device."); }
    catch { setMessage("This browser couldn’t remove saved presets."); }
  };
  return <details className="event-ready">
    <summary>Heading out? Set your moment <span>Optional</span></summary>
    <div className="event-ready-body">
      <p>Choose a moment, then show what feels welcome for 3 hours. This does not turn on Nearby or share your location.</p>
      <div className="suggestion-list">{[...defaults, ...saved].map((preset, i) => <button type="button" key={`${i}-${preset.label}`} className={`chip ${selected === preset ? "chip-selected" : ""}`} aria-pressed={selected === preset} onClick={() => setSelected(preset)}>{preset.label}</button>)}</div>
      <p><strong>{selected.current_context || "Open to a conversation"}</strong><br />{selected.open_to.join(" · ")}</p>
      <Button disabled={busy} loading={busy} onClick={() => void apply()}>Open for 3h</Button>
      <div className="event-preset-save"><label htmlFor="event-preset-name">Save your current details as a preset</label><input id="event-preset-name" value={label} maxLength={40} placeholder="My Thursday meetup" onChange={(e) => setLabel(e.target.value)} /><Button variant="secondary" onClick={save}>Save on this device</Button></div>
      {saved.length > 0 && <button type="button" className="wizard-discard" onClick={forget}>Remove saved presets</button>}
      <p role="status">{message}</p>
    </div>
  </details>;
}
