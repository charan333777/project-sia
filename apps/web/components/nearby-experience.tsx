"use client";

import {
  Check,
  Clock3,
  EyeOff,
  Hand,
  Heart,
  LocateFixed,
  Map,
  MessageCircleMore,
  Radar,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

type NearbyPerson = {
  id: string;
  name: string;
  initial: string;
  role: string;
  context: string;
  distance: string;
  openTo: string[];
  interests: string[];
  x: number;
  y: number;
  mapX: number;
  mapY: number;
  tone: string;
};

const people: NearbyPerson[] = [
  {
    id: "maya",
    name: "Maya",
    initial: "M",
    role: "Product designer",
    context: "Sketching ideas over coffee",
    distance: "~60 m",
    openTo: ["Coffee", "Creative ideas"],
    interests: ["Design", "Startups"],
    x: 28,
    y: 29,
    mapX: 25,
    mapY: 31,
    tone: "peach",
  },
  {
    id: "leo",
    name: "Leo",
    initial: "L",
    role: "Indie maker",
    context: "Taking a break between meetings",
    distance: "~110 m",
    openTo: ["A quick chat"],
    interests: ["AI", "Music"],
    x: 73,
    y: 35,
    mapX: 73,
    mapY: 28,
    tone: "blue",
  },
  {
    id: "nia",
    name: "Nia",
    initial: "N",
    role: "Photographer",
    context: "Finding a new corner of the city",
    distance: "~170 m",
    openTo: ["Photo walks", "Local tips"],
    interests: ["Travel", "Art"],
    x: 67,
    y: 75,
    mapX: 63,
    mapY: 76,
    tone: "sage",
  },
];

const durations = ["15 min", "1 hour", "Until I leave"];

type PositionStyle = CSSProperties & {
  "--person-x": string;
  "--person-y": string;
};

function PersonMarker({ person, mapView, onSelect }: { person: NearbyPerson; mapView?: boolean; onSelect: () => void }) {
  const x = mapView ? person.mapX : person.x;
  const y = mapView ? person.mapY : person.y;
  const style: PositionStyle = { "--person-x": `${x}%`, "--person-y": `${y}%` };

  return (
    <button
      className={`nearby-person nearby-person-${person.tone} ${mapView ? "nearby-map-person" : ""}`}
      style={style}
      aria-label={`${person.name}, ${person.distance}`}
      onClick={onSelect}
    >
      <span className="nearby-person-avatar">{person.initial}<i aria-hidden="true" /></span>
      <span className="nearby-person-label"><strong>{person.name}</strong><small>{person.distance}</small></span>
    </button>
  );
}

export function NearbyExperience() {
  const [view, setView] = useState<"circle" | "map">("circle");
  const [visible, setVisible] = useState(false);
  const [duration, setDuration] = useState("1 hour");
  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const [waved, setWaved] = useState<string[]>([]);

  const wave = (id: string) => {
    setWaved((current) => current.includes(id) ? current : [...current, id]);
  };

  return (
    <main className="nearby-shell">
      <div className="nearby-heading">
        <div>
          <span className="prototype-pill"><Sparkles size={13} /> Visual preview</span>
          <h1>Nearby</h1>
          <p>See who’s open to hello.</p>
        </div>
        <div className="nearby-presence" aria-label="3 demo people nearby">
          <div className="nearby-avatar-stack" aria-hidden="true">
            {people.map((person) => <span className={`nearby-stack-${person.tone}`} key={person.id}>{person.initial}</span>)}
          </div>
          <div><strong>3 here now</strong><span>2 match your interests</span></div>
        </div>
      </div>

      <section className="nearby-visibility" aria-label="Nearby visibility preview">
        <span className={`visibility-state-icon ${visible ? "visibility-state-on" : ""}`}>
          {visible ? <LocateFixed size={21} /> : <EyeOff size={21} />}
        </span>
        <div className="nearby-visibility-copy">
          <strong>{visible ? "Visible nearby" : "You’re hidden"}</strong>
          <span>{visible ? (duration === "Until I leave" ? "Until you leave" : `For ${duration}`) : "Nothing is shared"}</span>
        </div>
        <button
          className={`sia-switch ${visible ? "sia-switch-on" : ""}`}
          role="switch"
          aria-checked={visible}
          aria-label="Visible nearby"
          onClick={() => setVisible((current) => !current)}
        >
          <span />
        </button>
        {visible && (
          <div className="nearby-timer" aria-label="Visibility duration">
            <Clock3 size={16} aria-hidden="true" />
            {durations.map((option) => (
              <button
                key={option}
                className={duration === option ? "nearby-timer-active" : ""}
                aria-pressed={duration === option}
                onClick={() => setDuration(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="nearby-card">
        <div className="nearby-card-top">
          <div className="nearby-view-toggle" aria-label="Nearby view">
            <button className={view === "circle" ? "nearby-view-active" : ""} aria-pressed={view === "circle"} onClick={() => setView("circle")}>
              <Radar size={18} /> <span>Circle</span>
            </button>
            <button className={view === "map" ? "nearby-view-active" : ""} aria-pressed={view === "map"} onClick={() => setView("map")}>
              <Map size={18} /> <span>Map</span>
            </button>
          </div>
          <span className="nearby-demo-note"><span aria-hidden="true" /> Demo people</span>
        </div>

        {view === "circle" ? (
          <div className="nearby-stage nearby-circle-stage" aria-label="Circle preview showing three people nearby">
            <div className="nearby-ring nearby-ring-outer"><span>200 m</span></div>
            <div className="nearby-ring nearby-ring-middle"><span>100 m</span></div>
            <div className="nearby-ring nearby-ring-inner" />
            <div className="nearby-you"><span><LocateFixed size={20} /></span><strong>You</strong></div>
            {people.map((person) => <PersonMarker person={person} key={person.id} onSelect={() => setSelected(person)} />)}
          </div>
        ) : (
          <div className="nearby-stage nearby-map-stage" aria-label="Stylised map preview showing approximate nearby positions">
            <svg className="nearby-map-lines" viewBox="0 0 800 520" preserveAspectRatio="none" aria-hidden="true">
              <path className="map-road map-road-wide" d="M-40 390 C170 300 225 380 410 255 S675 175 850 55" />
              <path className="map-road" d="M115 -30 C170 110 130 230 225 550" />
              <path className="map-road" d="M610 -30 C565 130 680 325 520 560" />
              <path className="map-road map-road-small" d="M-30 105 C190 160 310 80 520 120 S720 250 850 220" />
              <path className="map-river" d="M350 -30 C320 100 430 170 395 290 S285 430 330 560" />
            </svg>
            <span className="map-green map-green-one" aria-hidden="true" />
            <span className="map-green map-green-two" aria-hidden="true" />
            <span className="map-label map-label-one">Market St</span>
            <span className="map-label map-label-two">Willow Park</span>
            <div className="nearby-map-radius" aria-hidden="true" />
            <div className="nearby-you nearby-map-you"><span><LocateFixed size={20} /></span><strong>You</strong></div>
            {people.map((person) => <PersonMarker person={person} mapView key={person.id} onSelect={() => setSelected(person)} />)}
          </div>
        )}

        <div className="nearby-privacy-line"><ShieldCheck size={16} /><span>Approximate by design</span><span aria-hidden="true">·</span><span>200 m</span></div>
      </section>

      <section className="nearby-principles" aria-label="Nearby privacy principles">
        <article><span><EyeOff size={20} /></span><strong>Hidden first</strong><small>You choose when.</small></article>
        <article><span><ShieldCheck size={20} /></span><strong>No exact pins</strong><small>Only distance bands.</small></article>
        <article><span><UsersRound size={20} /></span><strong>Mutual hello</strong><small>Wave before chat.</small></article>
      </section>

      <p className="nearby-preview-footnote">Preview only · No location is collected</p>

      <Modal title={selected ? `${selected.name}’s nearby profile` : "Nearby profile"} open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="nearby-profile-preview">
            <div className="nearby-profile-top">
              <span className={`nearby-profile-avatar nearby-stack-${selected.tone}`}>{selected.initial}<i aria-hidden="true" /></span>
              <div><span>{selected.distance}</span><h2>{selected.name}</h2><p>{selected.role}</p></div>
            </div>
            <div className="nearby-profile-now"><Sparkles size={17} /><div><span>Right now</span><strong>{selected.context}</strong></div></div>
            <div className="nearby-profile-section"><span><MessageCircleMore size={16} /> Open to</span><div>{selected.openTo.map((item) => <small key={item}>{item}</small>)}</div></div>
            <div className="nearby-profile-section"><span><Heart size={16} /> Into</span><div>{selected.interests.map((item) => <small key={item}>{item}</small>)}</div></div>
            <Button className={waved.includes(selected.id) ? "wave-button-done" : ""} onClick={() => wave(selected.id)}>
              {waved.includes(selected.id) ? <><Check size={18} /> Waved</> : <><Hand size={18} /> Wave</>}
            </Button>
            <p className="nearby-wave-note">A hello—not a message.</p>
          </div>
        )}
      </Modal>
    </main>
  );
}
