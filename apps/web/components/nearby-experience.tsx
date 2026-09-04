"use client";

import {
  AlertCircle,
  Ban,
  CalendarClock,
  Check,
  Clock3,
  EyeOff,
  Hand,
  Heart,
  List,
  LocateFixed,
  MapPin,
  MessageCircleMore,
  Radar,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type {
  NearbyConnection,
  NearbyDuration,
  NearbyIntent,
  NearbyMeetStatusCode,
  NearbyPerson,
  NearbyPlaceKind,
  NearbyReportInput,
  NearbySnapshot,
} from "@sia/validation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOwnedProfile } from "@/hooks/use-owned-profile";
import { api } from "@/lib/api";
import { Button } from "./button";
import { Modal } from "./modal";

/** Snapshot poll cadence: responsive while something is happening, quiet when the radar is empty. */
const NEARBY_POLL_ACTIVE_MS = 8_000;
const NEARBY_POLL_IDLE_MS = 30_000;

const emptySnapshot: NearbySnapshot = {
  presence: { active: false, duration: null, visible_until: null },
  people: [],
  signals: [],
  connections: [],
};

const durationOptions: { value: NearbyDuration; label: string }[] = [
  { value: "15m", label: "15 min" },
  { value: "60m", label: "1 hour" },
  { value: "until_leave", label: "Until I leave" },
];

const intentOptions: { value: NearbyIntent; label: string; icon: string }[] = [
  { value: "hello", label: "Hello", icon: "👋" },
  { value: "interested", label: "Interested", icon: "✨" },
  { value: "coffee", label: "Coffee", icon: "☕" },
  { value: "chat", label: "Chat", icon: "💬" },
  { value: "network", label: "Network", icon: "🤝" },
  { value: "collaborate", label: "Collaborate", icon: "💡" },
];

const placeOptions: { value: Exclude<NearbyPlaceKind, "custom">; label: string }[] = [
  { value: "main_entrance", label: "Main entrance" },
  { value: "reception", label: "Reception" },
  { value: "coffee_counter", label: "Coffee counter" },
  { value: "outside", label: "Outside" },
];

const statusOptions: { value: NearbyMeetStatusCode; label: string }[] = [
  { value: "coming", label: "Coming" },
  { value: "here", label: "Here" },
  { value: "five_minutes", label: "5 mins" },
  { value: "outside", label: "Outside" },
  { value: "inside", label: "Inside" },
  { value: "cant_make_it", label: "Can’t make it" },
];

const reportReasons: { value: NearbyReportInput["reason"]; label: string }[] = [
  { value: "unsafe", label: "Unsafe behaviour" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "fake_profile", label: "Fake profile" },
  { value: "other", label: "Other" },
];

const intentLabel = (intent: NearbyIntent) => intentOptions.find((option) => option.value === intent)?.label ?? intent;
const statusLabel = (code: NearbyMeetStatusCode) => statusOptions.find((option) => option.value === code)?.label ?? code;

function localDateTime(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function futureMinutes(minutes: number) {
  return localDateTime(new Date(Date.now() + minutes * 60_000));
}

function formatMeetingTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

type PositionStyle = CSSProperties & { "--person-x": string; "--person-y": string };

function markerPosition(person: NearbyPerson): PositionStyle {
  const radius = person.distance_band === "under_50" ? 15 : person.distance_band === "50_100" ? 28 : 41;
  const degrees = person.bearing_sector * 45;
  const radians = degrees * Math.PI / 180;
  return {
    "--person-x": `${50 + Math.sin(radians) * radius}%`,
    "--person-y": `${50 - Math.cos(radians) * radius}%`,
  };
}

function PersonMarker({ person, onSelect }: { person: NearbyPerson; onSelect: () => void }) {
  return (
    <button className={`nearby-person nearby-person-${person.tone}`} style={markerPosition(person)} aria-label={`${person.display_name}, ${person.distance_label}`} onClick={onSelect}>
      <span className="nearby-person-avatar">{person.display_name.slice(0, 1).toUpperCase()}<i aria-hidden="true" /></span>
      <span className="nearby-person-label"><strong>{person.display_name}</strong><small>{person.distance_label}</small></span>
    </button>
  );
}

export function NearbyExperience() {
  const { profile, loading, error: profileError, session } = useOwnedProfile();
  const [snapshot, setSnapshot] = useState<NearbySnapshot>(emptySnapshot);
  const [view, setView] = useState<"radar" | "list">("radar");
  const [duration, setDuration] = useState<NearbyDuration>("60m");
  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [meetTime, setMeetTime] = useState(futureMinutes(10));
  const [placeKind, setPlaceKind] = useState<NearbyPlaceKind>("coffee_counter");
  const [placeLabel, setPlaceLabel] = useState("Coffee counter");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<NearbyReportInput["reason"]>("unsafe");

  const watchId = useRef<number | null>(null);
  const heartbeatId = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPosition = useRef<GeolocationPosition | null>(null);
  const lastSentAt = useRef(0);
  const durationRef = useRef<NearbyDuration>("60m");
  const visibleUntilRef = useRef<string | null>(null);

  const applySnapshot = useCallback((next: NearbySnapshot) => {
    setSnapshot(next);
    visibleUntilRef.current = next.presence.visible_until;
    if (next.presence.duration) {
      durationRef.current = next.presence.duration;
      setDuration(next.presence.duration);
    }
  }, []);

  const clearTracking = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    if (heartbeatId.current) clearInterval(heartbeatId.current);
    watchId.current = null;
    heartbeatId.current = null;
    lastPosition.current = null;
    lastSentAt.current = 0;
  }, []);

  const publishPosition = useCallback(async (position: GeolocationPosition, nextDuration: NearbyDuration) => {
    if (!session) return;
    const next = await api.updateNearbyPresence({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_m: position.coords.accuracy,
      duration: nextDuration,
    }, session.access_token);
    lastSentAt.current = Date.now();
    applySnapshot(next);
  }, [applySnapshot, session]);

  const startSharing = useCallback((nextDuration: NearbyDuration) => {
    if (!session || watchId.current !== null) return;
    setError("");
    setNotice("");
    if (!window.isSecureContext || !navigator.geolocation) {
      setError("Nearby needs location access in a secure browser window.");
      return;
    }
    durationRef.current = nextDuration;
    setBusy(true);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPosition.current = position;
        if (Date.now() - lastSentAt.current < 30_000) return;
        void publishPosition(position, durationRef.current)
          .then(() => setNotice("You’re visible nearby. Only an approximate position is shown."))
          .catch((caught) => setError(caught instanceof Error ? caught.message : "We couldn’t update your location."))
          .finally(() => setBusy(false));
      },
      (caught) => {
        clearTracking();
        setBusy(false);
        setError(caught.code === 1 ? "Location permission is off. Allow it in your browser to use Nearby." : "We couldn’t find your location. Try again in a moment.");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 },
    );
    heartbeatId.current = setInterval(() => {
      const visibleUntil = visibleUntilRef.current ? new Date(visibleUntilRef.current).getTime() : 0;
      if (durationRef.current !== "until_leave" && visibleUntil > 0 && Date.now() >= visibleUntil) {
        clearTracking();
        setSnapshot((current) => ({ ...current, presence: { active: false, duration: null, visible_until: null }, people: [] }));
        return;
      }
      if (lastPosition.current) void publishPosition(lastPosition.current, durationRef.current).catch(() => undefined);
    }, 45_000);
  }, [clearTracking, publishPosition, session]);

  useEffect(() => {
    if (!session || !profile) return;
    let active = true;
    void api.getNearby(session.access_token)
      .then((next) => {
        if (!active) return;
        applySnapshot(next);
        if (next.presence.active && next.presence.duration) startSharing(next.presence.duration);
      })
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "We couldn’t load Nearby."));
    return () => { active = false; };
  }, [applySnapshot, profile, session, startSharing]);

  // Poll fast only when something is actually happening, and not at all in a hidden tab.
  // An empty radar refreshed every 8s was the single largest source of load on the API.
  const nearbyIsBusy =
    snapshot.presence.active ||
    snapshot.people.length > 0 ||
    snapshot.signals.length > 0 ||
    snapshot.connections.length > 0;

  useEffect(() => {
    if (!session || !profile) return;
    const intervalMs = nearbyIsBusy ? NEARBY_POLL_ACTIVE_MS : NEARBY_POLL_IDLE_MS;
    let poll: ReturnType<typeof setInterval> | null = null;

    const fetchSnapshot = () => {
      void api.getNearby(session.access_token).then(applySnapshot).catch(() => undefined);
    };

    const start = () => {
      if (poll !== null) return;
      poll = setInterval(fetchSnapshot, intervalMs);
    };

    const stop = () => {
      if (poll === null) return;
      clearInterval(poll);
      poll = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSnapshot();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [applySnapshot, nearbyIsBusy, profile, session]);

  useEffect(() => clearTracking, [clearTracking]);

  const runSnapshotAction = async (action: () => Promise<NearbySnapshot>, success?: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      applySnapshot(await action());
      if (success) setNotice(success);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggleVisibility = async () => {
    if (!session) return;
    if (snapshot.presence.active || watchId.current !== null) {
      clearTracking();
      await runSnapshotAction(() => api.hideNearby(session.access_token), "You’re hidden. Your location is no longer shared.");
    } else {
      startSharing(duration);
    }
  };

  const changeDuration = (nextDuration: NearbyDuration) => {
    setDuration(nextDuration);
    durationRef.current = nextDuration;
    if (lastPosition.current) void runSnapshotAction(() => api.updateNearbyPresence({
      latitude: lastPosition.current!.coords.latitude,
      longitude: lastPosition.current!.coords.longitude,
      accuracy_m: lastPosition.current!.coords.accuracy,
      duration: nextDuration,
    }, session!.access_token));
  };

  const sendWave = (intent: NearbyIntent) => {
    if (!session || !selected) return;
    const name = selected.display_name;
    void runSnapshotAction(() => api.sendNearbySignal(selected.profile_id, intent, session.access_token), `${intentLabel(intent)} sent to ${name}.`)
      .then((succeeded) => { if (succeeded) setSelected(null); });
  };

  const planMeeting = (connectionId: string) => {
    setPlanningId(connectionId);
    setMeetTime(futureMinutes(10));
    setPlaceKind("coffee_counter");
    setPlaceLabel("Coffee counter");
  };

  const submitMeeting = () => {
    if (!session || !planningId) return;
    const startsAt = new Date(meetTime);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Choose a meeting time.");
      return;
    }
    void runSnapshotAction(() => api.proposeNearbyMeet(planningId, {
      starts_at: startsAt.toISOString(),
      place_kind: placeKind,
      place_label: placeLabel,
    }, session.access_token), "Meeting suggestion sent.").then((succeeded) => { if (succeeded) setPlanningId(null); });
  };

  const sharePlan = async (connection: NearbyConnection) => {
    if (!connection.meet_plan) return;
    const text = `I’m meeting ${connection.person.display_name} at ${formatMeetingTime(connection.meet_plan.starts_at)} by ${connection.meet_plan.place_label} through Sia.`;
    try {
      if (navigator.share) await navigator.share({ title: "My Sia meet plan", text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice("Meeting plan copied. Share it with someone you trust.");
      }
    } catch {
      // The native share sheet can be dismissed without changing the meeting.
    }
  };

  const blockSelected = async () => {
    if (!session || !selected || !window.confirm(`Block ${selected.display_name}? They will disappear from Nearby.`)) return;
    const id = selected.profile_id;
    setSelected(null);
    await runSnapshotAction(() => api.blockNearbyProfile(id, session.access_token), "Profile blocked.");
  };

  const reportSelected = async () => {
    if (!session || !selected) return;
    setBusy(true);
    try {
      await api.reportNearbyProfile({ target_profile_id: selected.profile_id, reason: reportReason, details: "" }, session.access_token);
      setShowReport(false);
      setSelected(null);
      setNotice("Report received. Thank you for helping keep Nearby safe.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t send the report.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !profile || !session) {
    return <main className="nearby-shell"><div className="nearby-loading"><Radar size={24} /><span>{profileError || "Preparing Nearby…"}</span></div></main>;
  }

  const incoming = snapshot.signals.filter((signal) => signal.direction === "incoming");
  const outgoing = snapshot.signals.filter((signal) => signal.direction === "outgoing");
  const selectedOutgoing = selected ? outgoing.find((signal) => signal.person.profile_id === selected.profile_id) : undefined;

  return (
    <main className="nearby-shell">
      <div className="nearby-heading">
        <div>
          <span className="prototype-pill"><ShieldCheck size={13} /> Private nearby</span>
          <h1>Nearby</h1>
          <p>Find people who are open to meeting—without exact pins.</p>
        </div>
        <div className="nearby-presence" aria-label={`${snapshot.people.length} people nearby`}>
          <div className="nearby-avatar-stack" aria-hidden="true">
            {snapshot.people.slice(0, 3).map((person) => <span className={`nearby-stack-${person.tone}`} key={person.profile_id}>{person.display_name.slice(0, 1)}</span>)}
          </div>
          <div><strong>{snapshot.people.length} nearby</strong><span>{snapshot.people.filter((person) => person.match_count > 0).length} match your interests</span></div>
        </div>
      </div>

      {(error || notice) && <div className={`nearby-alert ${error ? "nearby-alert-error" : "nearby-alert-success"}`} role="status">{error ? <AlertCircle size={17} /> : <Check size={17} />}<span>{error || notice}</span></div>}

      <section className="nearby-visibility" aria-label="Nearby visibility">
        <span className={`visibility-state-icon ${snapshot.presence.active ? "visibility-state-on" : ""}`}>
          {snapshot.presence.active ? <LocateFixed size={21} /> : <EyeOff size={21} />}
        </span>
        <div className="nearby-visibility-copy">
          <strong>{busy && !snapshot.presence.active ? "Finding you…" : snapshot.presence.active ? "Visible nearby" : "You’re hidden"}</strong>
          <span>{snapshot.presence.active ? "People see only your distance band and general direction" : "Nothing is shared until you switch this on"}</span>
        </div>
        <button className={`sia-switch ${snapshot.presence.active ? "sia-switch-on" : ""}`} role="switch" aria-checked={snapshot.presence.active} aria-label="Visible nearby" disabled={busy} onClick={() => void toggleVisibility()}><span /></button>
        {(snapshot.presence.active || busy) && (
          <div className="nearby-timer" aria-label="Visibility duration">
            <Clock3 size={16} aria-hidden="true" />
            {durationOptions.map((option) => <button key={option.value} className={duration === option.value ? "nearby-timer-active" : ""} aria-pressed={duration === option.value} onClick={() => changeDuration(option.value)}>{option.label}</button>)}
          </div>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="nearby-incoming" aria-labelledby="nearby-waves-heading">
          <div className="nearby-section-heading"><div><span><Hand size={16} /> New Wave</span><h2 id="nearby-waves-heading">Someone wants to connect</h2></div></div>
          {incoming.map((signal) => (
            <article className="nearby-wave-card" key={signal.id}>
              <span className={`nearby-profile-avatar nearby-stack-${signal.person.tone}`}>{signal.person.display_name.slice(0, 1)}</span>
              <div><strong>{signal.person.display_name}</strong><small>{signal.person.role}</small><p>{intentLabel(signal.intent)}</p></div>
              <div className="nearby-wave-actions">
                <button disabled={busy} onClick={() => void runSnapshotAction(() => api.respondNearbySignal(signal.id, "decline", session.access_token))}>Not now</button>
                <Button disabled={busy} onClick={() => void runSnapshotAction(() => api.respondNearbySignal(signal.id, "accept", session.access_token), `You and ${signal.person.display_name} are connected.`)}><Check size={16} /> Accept</Button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="nearby-card">
        <div className="nearby-card-top">
          <div className="nearby-view-toggle" aria-label="Nearby view">
            <button className={view === "radar" ? "nearby-view-active" : ""} aria-pressed={view === "radar"} onClick={() => setView("radar")}><Radar size={18} /> <span>Radar</span></button>
            <button className={view === "list" ? "nearby-view-active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}><List size={18} /> <span>List</span></button>
          </div>
          <span className="nearby-live-note"><span aria-hidden="true" /> {snapshot.presence.active ? "Live · updates automatically" : "Hidden"}</span>
        </div>

        {view === "radar" ? (
          <div className="nearby-stage nearby-circle-stage" aria-label="Approximate radar of people within 200 metres">
            <div className="nearby-ring nearby-ring-outer"><span>200 m</span></div>
            <div className="nearby-ring nearby-ring-middle"><span>100 m</span></div>
            <div className="nearby-ring nearby-ring-inner" />
            <div className="nearby-you"><span><LocateFixed size={20} /></span><strong>You</strong></div>
            {snapshot.presence.active && snapshot.people.map((person) => <PersonMarker person={person} key={person.profile_id} onSelect={() => { setSelected(person); setShowReport(false); }} />)}
            {!snapshot.presence.active && <div className="nearby-empty"><EyeOff size={25} /><strong>You’re hidden</strong><span>Switch on Nearby to see people within 200 m.</span></div>}
            {snapshot.presence.active && snapshot.people.length === 0 && <div className="nearby-empty nearby-empty-low"><UsersRound size={25} /><strong>No one visible yet</strong><span>We’ll update this radar automatically.</span></div>}
          </div>
        ) : (
          <div className="nearby-list-view">
            {snapshot.people.map((person) => (
              <button key={person.profile_id} className="nearby-list-person" onClick={() => { setSelected(person); setShowReport(false); }}>
                <span className={`nearby-profile-avatar nearby-stack-${person.tone}`}>{person.display_name.slice(0, 1)}<i aria-hidden="true" /></span>
                <span><strong>{person.display_name}</strong><small>{person.role || "Open to meeting"}</small></span>
                <span><strong>{person.distance_label}</strong><small>{person.match_count ? `${person.match_count} shared interest${person.match_count === 1 ? "" : "s"}` : "Approximate"}</small></span>
              </button>
            ))}
            {snapshot.people.length === 0 && <div className="nearby-list-empty">{snapshot.presence.active ? "No one is visible nearby yet." : "Switch on Nearby to begin."}</div>}
          </div>
        )}

        <div className="nearby-privacy-line"><ShieldCheck size={16} /><span>Approximate by design</span><span aria-hidden="true">·</span><span>200 m</span></div>
      </section>

      {snapshot.connections.length > 0 && (
        <section className="nearby-connections" aria-labelledby="nearby-connections-heading">
          <div className="nearby-section-heading"><div><span><UsersRound size={16} /> Mutual</span><h2 id="nearby-connections-heading">Ready to meet</h2></div><small>Connections close automatically after 2 hours</small></div>
          <div className="nearby-connection-grid">
            {snapshot.connections.map((connection) => {
              const meet = connection.meet_plan;
              const proposedByMe = meet?.proposer_profile_id === profile.id;
              const lastStatus = meet?.statuses[0];
              return (
                <article className="nearby-connection-card" key={connection.id}>
                  <div className="nearby-connection-person"><span className={`nearby-profile-avatar nearby-stack-${connection.person.tone}`}>{connection.person.display_name.slice(0, 1)}</span><div><strong>{connection.person.display_name}</strong><small>{connection.person.role}</small></div><span><Check size={14} /> Connected</span></div>
                  {!meet && planningId !== connection.id && <div className="nearby-connect-next"><p>Suggest a public place and time. No open-ended chat needed.</p><Button onClick={() => planMeeting(connection.id)}><CalendarClock size={17} /> Plan a meet</Button></div>}
                  {planningId === connection.id && (
                    <div className="nearby-meet-builder">
                      <strong>When?</strong>
                      <div className="nearby-choice-row">
                        {[0, 5, 10, 15].map((minutes) => <button key={minutes} onClick={() => setMeetTime(futureMinutes(minutes === 0 ? 1 : minutes))}>{minutes === 0 ? "Now" : `${minutes} min`}</button>)}
                      </div>
                      <input aria-label="Meeting date and time" type="datetime-local" value={meetTime} min={futureMinutes(0)} max={futureMinutes(120)} onChange={(event) => setMeetTime(event.target.value)} />
                      <strong>Where?</strong>
                      <div className="nearby-choice-row nearby-place-row">
                        {placeOptions.map((place) => <button key={place.value} className={placeKind === place.value ? "nearby-choice-active" : ""} onClick={() => { setPlaceKind(place.value); setPlaceLabel(place.label); }}>{place.label}</button>)}
                        <button className={placeKind === "custom" ? "nearby-choice-active" : ""} onClick={() => { setPlaceKind("custom"); setPlaceLabel(""); }}>Other public spot</button>
                      </div>
                      {placeKind === "custom" && <input aria-label="Public meeting place" maxLength={60} placeholder="e.g. Information desk" value={placeLabel} onChange={(event) => setPlaceLabel(event.target.value)} />}
                      <div className="nearby-builder-actions"><button onClick={() => setPlanningId(null)}>Cancel</button><Button disabled={busy || placeLabel.trim().length < 2} onClick={submitMeeting}><Send size={16} /> Suggest</Button></div>
                    </div>
                  )}
                  {meet && (
                    <div className={`nearby-meet-card nearby-meet-${meet.status}`}>
                      <div className="nearby-meet-details"><span><Clock3 size={16} /> {formatMeetingTime(meet.starts_at)}</span><span><MapPin size={16} /> {meet.place_label}</span></div>
                      {meet.status === "proposed" && proposedByMe && <><p>Waiting for {connection.person.display_name} to accept.</p><button className="nearby-text-action" onClick={() => void runSnapshotAction(() => api.respondNearbyMeet(meet.id, "cancel", session.access_token))}>Cancel suggestion</button></>}
                      {meet.status === "proposed" && !proposedByMe && <div className="nearby-builder-actions"><button onClick={() => void runSnapshotAction(() => api.respondNearbyMeet(meet.id, "decline", session.access_token))}>Not now</button><Button onClick={() => void runSnapshotAction(() => api.respondNearbyMeet(meet.id, "accept", session.access_token), "Meet confirmed.")}><Check size={16} /> Accept meet</Button></div>}
                      {meet.status === "accepted" && (
                        <>
                          <div className="nearby-confirmed"><Check size={16} /><strong>Meet confirmed</strong>{lastStatus && <span>{lastStatus.sender_profile_id === profile.id ? "You" : connection.person.display_name}: {statusLabel(lastStatus.code)}</span>}</div>
                          <p className="nearby-quick-label">Quick update</p>
                          <div className="nearby-choice-row">{statusOptions.map((status) => <button key={status.value} disabled={busy} onClick={() => void runSnapshotAction(() => api.sendNearbyMeetStatus(meet.id, status.value, session.access_token))}>{status.label}</button>)}</div>
                          <div className="nearby-meet-footer"><button onClick={() => void sharePlan(connection)}><Share2 size={15} /> Share plan</button><button onClick={() => void runSnapshotAction(() => api.respondNearbyMeet(meet.id, "cancel", session.access_token))}>Cancel meet</button></div>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <p className="nearby-safety-note"><ShieldCheck size={16} /> Meet in a public place and share your plan with someone you trust.</p>
        </section>
      )}

      <section className="nearby-principles" aria-label="Nearby privacy principles">
        <article><span><EyeOff size={20} /></span><strong>Hidden first</strong><small>You choose when.</small></article>
        <article><span><ShieldCheck size={20} /></span><strong>No exact pins</strong><small>Only distance bands.</small></article>
        <article><span><UsersRound size={20} /></span><strong>Mutual hello</strong><small>Both people agree.</small></article>
      </section>

      <p className="nearby-preview-footnote">Location expires automatically · No permanent message inbox</p>

      <Modal title={selected ? `${selected.display_name}’s nearby profile` : "Nearby profile"} open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="nearby-profile-preview">
            <div className="nearby-profile-top">
              <span className={`nearby-profile-avatar nearby-stack-${selected.tone}`}>{selected.display_name.slice(0, 1)}<i aria-hidden="true" /></span>
              <div><span>{selected.distance_label}</span><h2>{selected.display_name}</h2><p>{selected.role}</p></div>
            </div>
            <div className="nearby-profile-now"><Sparkles size={17} /><div><span>Right now</span><strong>{selected.current_context || "Open to a nearby hello"}</strong></div></div>
            <div className="nearby-profile-section"><span><MessageCircleMore size={16} /> Open to</span><div>{selected.open_to.map((item) => <small key={item}>{item}</small>)}</div></div>
            <div className="nearby-profile-section"><span><Heart size={16} /> Into</span><div>{selected.interests.map((item) => <small key={item}>{item}</small>)}</div></div>
            {selectedOutgoing ? <div className="nearby-wave-sent"><Check size={18} /><div><strong>{intentLabel(selectedOutgoing.intent)} sent</strong><span>Waiting for {selected.display_name} to accept.</span></div></div> : <><p className="nearby-intent-heading"><Hand size={16} /> Start with one clear intention</p><div className="nearby-intent-grid">{intentOptions.map((intent) => <button key={intent.value} disabled={busy} onClick={() => sendWave(intent.value)}><span>{intent.icon}</span><strong>{intent.label}</strong></button>)}</div></>}
            <p className="nearby-wave-note">A Wave is not an open chat. Meeting options appear only after they accept.</p>
            <div className="nearby-safety-actions"><button onClick={() => void blockSelected()}><Ban size={14} /> Block</button><button onClick={() => setShowReport((current) => !current)}><AlertCircle size={14} /> Report</button></div>
            {showReport && <div className="nearby-report"><select aria-label="Report reason" value={reportReason} onChange={(event) => setReportReason(event.target.value as NearbyReportInput["reason"])}>{reportReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select><Button disabled={busy} onClick={() => void reportSelected()}>Send report</Button></div>}
          </div>
        )}
      </Modal>
    </main>
  );
}
