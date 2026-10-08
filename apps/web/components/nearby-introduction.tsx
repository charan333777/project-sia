"use client";

import { useState } from "react";
import { Hand, ShieldCheck, EyeOff, Coffee, Check } from "lucide-react";
import { ButtonLink } from "./button";
import { getProfileCharacterOption } from "./profile-characters";

const people = [
  { name: "Maya", character: "maker", role: "Product designer", interest: "Design", distance: "Under 50 m" },
  { name: "Leo", character: "explorer", role: "Student", interest: "Travel", distance: "50–100 m" },
  { name: "Noor", character: "dreamer", role: "Developer", interest: "Startups", distance: "100–200 m" },
];

export function NearbyIntroduction() {
  const [selected, setSelected] = useState(0);
  const [intent, setIntent] = useState("");
  const person = people[selected]!;
  return <main className="page-shell nearby-intro">
    <div className="page-intro"><span className="eyebrow">Nearby · interactive example</span><h1>Meet at your own pace.</h1><p>Choose to be visible, send a small Wave, and connect when you both say yes.</p></div>
    <p className="demo-note"><EyeOff size={16} /> These people are fictional. This example uses no location and sends no Waves.</p>
    <div className="nearby-intro-layout">
      <section className="nearby-demo-people" aria-label="Fictional people nearby">{people.map((p, i) => <button type="button" key={p.name} aria-pressed={i === selected} className={i === selected ? "demo-person demo-person-selected" : "demo-person"} onClick={() => { setSelected(i); setIntent(""); }}><img src={getProfileCharacterOption(p.character).imageSrc!} width="64" height="64" alt="" /><span><strong>{p.name}</strong><small>{p.role}</small><small>{p.distance} · {p.interest}</small></span></button>)}</section>
      <section className="nearby-demo-wave" aria-label="Try a preset Wave">
        <h2>Say hello to {person.name}</h2><p>You share a little intention. They choose whether to connect.</p>
        <div className="suggestion-list">{["Hello", "Coffee", "Share ideas"].map((label) => <button key={label} type="button" className={`chip ${intent === label ? "chip-selected" : ""}`} aria-pressed={intent === label} onClick={() => setIntent(label)}>{label === "Coffee" ? <Coffee size={16} /> : <Hand size={16} />} {label}</button>)}</div>
        <p role="status" className="demo-wave-result">{intent ? <><Check size={16} /> Example: a “{intent}” Wave is ready. After mutual acceptance you can suggest a public place and time.</> : "Try an intention above. There is no open-ended chat."}</p>
        <p><ShieldCheck size={16} /> Real Nearby shares approximate distance and direction. You choose when to appear, and it expires.</p>
      </section>
    </div>
    <div className="nearby-intro-actions"><ButtonLink href="/create">Create my Sia</ButtonLink><ButtonLink href="/login?next=%2Fnearby" variant="secondary">Log in to Nearby</ButtonLink><ButtonLink href="/demo" variant="quiet">Try the QR experience</ButtonLink></div>
  </main>;
}
