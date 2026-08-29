import { Coffee, MessageCircleMore, Sparkles } from "lucide-react";
import type { Profile, ProfileInput } from "@sia/validation";

type DisplayProfile = Profile | ProfileInput;

export function ProfileCard({ profile, compact = false }: { profile: DisplayProfile; compact?: boolean }) {
  return (
    <article className={`profile-card ${compact ? "profile-card-compact" : ""}`}>
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">{profile.display_name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h1>{profile.display_name}</h1>
          {profile.role && <p className="profile-role">{profile.role}</p>}
          <span className="profile-handle">@{profile.username}</span>
        </div>
      </div>
      {profile.current_context && (
        <section className="context-panel" aria-labelledby="current-heading">
          <span className="context-icon"><Sparkles size={18} /></span>
          <div><p id="current-heading">Right now</p><strong>{profile.current_context}</strong></div>
        </section>
      )}
      {profile.open_to.length > 0 && (
        <section className="profile-section open-section" aria-labelledby="open-heading">
          <div className="section-eyebrow"><MessageCircleMore size={17} /><h2 id="open-heading">Open to</h2></div>
          <div className="tag-list">{profile.open_to.map((item) => <span className="open-tag" key={item}>{item}</span>)}</div>
        </section>
      )}
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      {profile.interests.length > 0 && (
        <section className="profile-section" aria-labelledby="interests-heading">
          <div className="section-eyebrow"><Coffee size={17} /><h2 id="interests-heading">A few things I’m into</h2></div>
          <div className="tag-list">{profile.interests.map((item) => <span className="interest-tag" key={item}>{item}</span>)}</div>
        </section>
      )}
    </article>
  );
}
