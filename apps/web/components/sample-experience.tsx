"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ProfileCard } from "./profile-card";
import { ButtonLink } from "./button";
import { sampleProfile } from "@/lib/sample-profile";
import { ProfileThemePicker } from "./profile-theme-picker";
import { ProfileCharacterPicker } from "./profile-character-picker";
import { ProfileContactPanel } from "./profile-contact-panel";
import { absoluteUrl } from "@/lib/site";

const moments = [
  { label: "Meetup", context: "At a design meetup in London", open: ["Creative ideas", "Coffee", "A quick chat"] },
  { label: "Campus", context: "On campus, taking a study break", open: ["Making friends", "Learning", "Coffee"] },
  { label: "Café", context: "Working from a café this afternoon", open: ["Sharing ideas", "Collaborating"] },
];

export function SampleExperience() {
  const [profile, setProfile] = useState(sampleProfile);
  const [moment, setMoment] = useState("Meetup");
  return <main className="page-shell demo-shell">
    <div className="page-intro"><span className="eyebrow">Try a sample Sia</span><h1>A scan starts here.</h1><p>This is a fictional profile. Try a moment or character and see what someone would discover.</p></div>
    <div className="demo-layout">
      <section className="demo-controls" aria-label="Try the profile">
        <h2>Where are you meeting?</h2>
        <div className="suggestion-list">{moments.map((item) => <button key={item.label} type="button" className={`chip ${moment === item.label ? "chip-selected" : ""}`} aria-pressed={moment === item.label} onClick={() => { setMoment(item.label); setProfile((p) => ({ ...p, current_context: item.context, open_to: item.open })); }}>{item.label}</button>)}</div>
        <details className="wizard-optional"><summary>Give it some personality <span>Optional</span></summary>
        <ProfileCharacterPicker value={profile.profile_character} onChange={(profile_character) => setProfile((p) => ({ ...p, profile_character }))} />
        <ProfileThemePicker value={profile.profile_theme} onChange={(profile_theme) => setProfile((p) => ({ ...p, profile_theme }))} />
        </details>
        <p>A useful opening: “What are you building?” You already have a starting point.</p>
        <ButtonLink href="/create">Make my own <ArrowRight size={16} /></ButtonLink>
      </section>
      <section aria-label="Fictional scanner experience">
        <ProfileCard profile={profile} compact headingLevel={2} />
        <ProfileContactPanel profile={{ ...profile, display_name: "Maya — Sia example" }} items={[]} profileUrl={absoluteUrl("/demo")} />
        <p className="demo-note">The sample contact saves this demo link. A real Sia saves that person’s profile link.</p>
      </section>
    </div>
  </main>;
}
