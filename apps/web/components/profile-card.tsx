import { Heart, MessageCircleMore, Sparkles, UserRound } from "lucide-react";
import { publicContactItems, type Profile, type ProfileInput } from "@sia/validation";
import { absoluteUrl } from "@/lib/site";
import { getProfileCharacterOption } from "./profile-characters";
import { getProfileTheme } from "./profile-themes";
import { ProfileContactPanel } from "./profile-contact-panel";
import { ProfileStatusPanel } from "./profile-status-panel";

type DisplayProfile = Profile | ProfileInput;

export function ProfileAvatar({ profile, photoUrl }: { profile: DisplayProfile; photoUrl?: string | null }) {
  const character = getProfileCharacterOption(profile.profile_character);
  return (
    <div className={`profile-avatar ${photoUrl ? "profile-photo-avatar" : character.imageSrc ? "profile-character-avatar" : ""}`} aria-hidden="true">
      <span>{photoUrl
        ? <img src={photoUrl} alt="" width="72" height="72" draggable={false} />
        : character.imageSrc
        ? <img src={character.imageSrc} alt="" width="72" height="72" draggable={false} />
        : profile.display_name.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

export function ProfileCard({ profile, compact = false, owner = false, photoPreviewUrl, headingLevel = 1 }: { profile: DisplayProfile; compact?: boolean; owner?: boolean; photoPreviewUrl?: string | null; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const theme = getProfileTheme(profile.profile_theme);
  const photoUrl = photoPreviewUrl === undefined && "avatar_url" in profile ? profile.avatar_url : photoPreviewUrl;
  const status = "status" in profile ? profile.status : null;
  // A public profile arrives already filtered by the API. Filtering again here means the
  // owner's own view and the live preview show exactly what a scanner would see, and no
  // caller can accidentally render a hidden detail.
  const contactItems = publicContactItems(profile.contact_items ?? []);
  return (
    <article className={`profile-card profile-theme-${theme} ${compact ? "profile-card-compact" : ""}`}>
      <div className="profile-identity">
        <ProfileAvatar profile={profile} photoUrl={photoUrl} />
        <div>
          <Heading>{profile.display_name}</Heading>
          {profile.role && <p className="profile-role">{profile.role}</p>}
          <span className="profile-handle">@{profile.username}</span>
        </div>
      </div>
      {/* The intro belongs to the person, so it reads straight after their name rather than
          between two tag lists where it looked like a stray line. A short "About" label keeps a
          one-line bio from reading as a stray fragment. */}
      {profile.bio && (
        <section className="profile-section profile-about" aria-label="About">
          <div className="section-eyebrow"><UserRound size={17} /><h2>About</h2></div>
          <p className="profile-bio">{profile.bio}</p>
        </section>
      )}
      {status ? (
        <ProfileStatusPanel status={status} />
      ) : (
        profile.current_context && (
          <section className="context-panel" aria-labelledby="current-heading">
            <span className="context-icon"><Sparkles size={18} /></span>
            <div><p id="current-heading">Right now</p><strong>{profile.current_context}</strong></div>
          </section>
        )
      )}
      {profile.open_to.length > 0 && (
        <section className="profile-section open-section" aria-labelledby="open-heading">
          <div className="section-eyebrow"><MessageCircleMore size={17} /><h2 id="open-heading">Open to</h2></div>
          <div className="tag-list">{profile.open_to.map((item) => <span className="open-tag" key={item}>{item}</span>)}</div>
        </section>
      )}
      {profile.interests.length > 0 && <p className="conversation-prompt"><MessageCircleMore size={17} aria-hidden="true" /><span><strong>Ask me about</strong> {profile.interests.slice(0, 2).join(" or ")}</span></p>}
      {profile.interests.length > 0 && (
        <section className="profile-section" aria-labelledby="interests-heading">
          <div className="section-eyebrow"><Heart size={17} /><h2 id="interests-heading">I’m into</h2></div>
          <div className="tag-list">{profile.interests.map((item) => <span className="interest-tag" key={item}>{item}</span>)}</div>
        </section>
      )}
      <ProfileContactPanel
        profile={{ display_name: profile.display_name, username: profile.username, role: profile.role, bio: profile.bio }}
        items={contactItems}
        profileUrl={absoluteUrl(`/u/${profile.username}`)}
        readOnly={compact || owner}
      />
    </article>
  );
}
