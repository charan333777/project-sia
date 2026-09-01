import { Heart, MessageCircleMore, Sparkles } from "lucide-react";
import type { Profile, ProfileInput } from "@sia/validation";
import { getProfileCharacterOption } from "./profile-characters";
import { getProfileTheme } from "./profile-themes";

type DisplayProfile = Profile | ProfileInput;

export function ProfileCard({ profile, compact = false }: { profile: DisplayProfile; compact?: boolean }) {
  const theme = getProfileTheme(profile.profile_theme);
  const character = getProfileCharacterOption(profile.profile_character);
  return (
    <article className={`profile-card profile-theme-${theme} ${compact ? "profile-card-compact" : ""}`}>
      <div className="profile-identity">
        <div className={`profile-avatar ${character.imageSrc ? "profile-character-avatar" : ""}`} aria-hidden="true">
          <span>{character.imageSrc
            ? <img src={character.imageSrc} alt="" width="72" height="72" draggable={false} />
            : profile.display_name.slice(0, 1).toUpperCase()}</span>
        </div>
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
          <div className="section-eyebrow"><Heart size={17} /><h2 id="interests-heading">I’m into</h2></div>
          <div className="tag-list">{profile.interests.map((item) => <span className="interest-tag" key={item}>{item}</span>)}</div>
        </section>
      )}
    </article>
  );
}
