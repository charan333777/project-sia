"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Globe2,
  LockKeyhole,
  MessageCircleMore,
  Palette,
  PawPrint,
  Sparkles,
  Type as TypeIcon,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { profileInputSchema, type Profile, type ProfileInput } from "@sia/validation";
import { Button } from "./button";
import { TextAreaField, TextField } from "./field";
import { ProfileCard } from "./profile-card";
import { ProfileCharacterPicker } from "./profile-character-picker";
import { getProfileCharacter, getProfileCharacterOption } from "./profile-characters";
import { ProfilePhotoPicker } from "./profile-photo-picker";
import { ProfileThemePicker } from "./profile-theme-picker";
import { getProfileTheme, profileThemeOptions } from "./profile-themes";
import { TagPicker } from "./tag-picker";

export const emptyProfile: ProfileInput = {
  username: "",
  display_name: "",
  role: "",
  bio: "",
  current_context: "",
  interests: [],
  open_to: [],
  is_public: false,
  profile_theme: "calm",
  profile_character: "plain",
};

const interestSuggestions = ["AI", "Startups", "DevOps", "Photography", "Music", "Football", "Travel", "Design"];
const openToSuggestions = ["A quick chat", "Networking", "Making friends", "Learning", "Sharing ideas", "Coffee", "Collaborating"];

const steps = [
  { label: "You", icon: UserRound },
  { label: "Now", icon: Sparkles },
  { label: "Connect", icon: MessageCircleMore },
  { label: "Style", icon: PawPrint },
  { label: "Visibility", icon: Globe2 },
];

type AvatarMode = "photo" | "character" | "initial";
export type ProfilePhotoChange = { action: "keep" } | { action: "upload"; photo: Blob } | { action: "remove" };

function profilePhotoUrl(profile: ProfileInput | Profile) {
  return "avatar_url" in profile ? profile.avatar_url : null;
}

function profileHasPhoto(profile: ProfileInput | Profile) {
  return "avatar_path" in profile && Boolean(profile.avatar_path);
}

function initialAvatarMode(profile: ProfileInput | Profile): AvatarMode {
  if (profileHasPhoto(profile)) return "photo";
  return getProfileCharacter(profile.profile_character) === "plain" ? "initial" : "character";
}

function useAvatarEditor(initialValue: ProfileInput | Profile) {
  const originalPhotoUrl = profilePhotoUrl(initialValue);
  const originallyHadPhoto = profileHasPhoto(initialValue);
  const [avatarMode, setAvatarMode] = useState<AvatarMode>(() => initialAvatarMode(initialValue));
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const localPhotoUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (localPhotoUrlRef.current) URL.revokeObjectURL(localPhotoUrlRef.current);
  }, []);

  const choosePhoto = (nextPhoto: Blob) => {
    if (localPhotoUrlRef.current) URL.revokeObjectURL(localPhotoUrlRef.current);
    const nextUrl = URL.createObjectURL(nextPhoto);
    localPhotoUrlRef.current = nextUrl;
    setLocalPhotoUrl(nextUrl);
    setPhoto(nextPhoto);
    setAvatarMode("photo");
  };

  const clearLocalPhoto = () => {
    if (localPhotoUrlRef.current) URL.revokeObjectURL(localPhotoUrlRef.current);
    localPhotoUrlRef.current = null;
    setLocalPhotoUrl(null);
    setPhoto(null);
  };

  const removePhoto = () => {
    clearLocalPhoto();
    setAvatarMode("initial");
  };

  const previewUrl = avatarMode === "photo" ? localPhotoUrl ?? originalPhotoUrl : null;
  const change: ProfilePhotoChange = avatarMode === "photo" && photo
    ? { action: "upload", photo }
    : originallyHadPhoto && avatarMode !== "photo"
      ? { action: "remove" }
      : { action: "keep" };

  return { avatarMode, setAvatarMode, choosePhoto, removePhoto, previewUrl, change };
}

function validationErrors(value: ProfileInput) {
  const result = profileInputSchema.safeParse(value);
  if (result.success) return { data: result.data, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field && !errors[String(field)]) errors[String(field)] = issue.message;
  }
  return { data: null, errors };
}

type FormFieldsProps = {
  value: ProfileInput;
  errors: Record<string, string>;
  set: <K extends keyof ProfileInput>(key: K, next: ProfileInput[K]) => void;
};

function BasicsFields({ value, errors, set }: FormFieldsProps) {
  return (
    <>
      <TextField
        id="display-name"
        label="Your name"
        hint={`${value.display_name.length}/60`}
        autoComplete="name"
        maxLength={60}
        placeholder="Maya"
        value={value.display_name}
        error={errors.display_name}
        onChange={(event) => set("display_name", event.target.value)}
      />
      <div className="field">
        <div className="field-label-row"><label htmlFor="username">Username</label><span>3–30</span></div>
        <div className="username-input-wrap">
          <span className="username-prefix">@</span>
          <input
            id="username"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={30}
            placeholder="maya"
            value={value.username}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "username-error" : undefined}
            onChange={(event) => set("username", event.target.value.toLowerCase().replace(/\s/g, ""))}
          />
        </div>
        {errors.username && <p className="field-error" id="username-error">{errors.username}</p>}
      </div>
      <TextField
        id="role"
        label="What you do"
        hint="Optional"
        maxLength={80}
        placeholder="Product designer"
        value={value.role}
        error={errors.role}
        onChange={(event) => set("role", event.target.value)}
      />
      <details className="optional-details">
        <summary><span>Short intro</span><span>Optional</span><ChevronDown size={17} /></summary>
        <TextAreaField
          id="bio"
          label="About you"
          hint={`${value.bio.length}/300`}
          maxLength={300}
          placeholder="A few words about you…"
          value={value.bio}
          error={errors.bio}
          onChange={(event) => set("bio", event.target.value)}
        />
      </details>
    </>
  );
}

function VisibilityChoice({ value, set, onChoose, chosen = true }: Pick<FormFieldsProps, "value" | "set"> & { onChoose?: () => void; chosen?: boolean }) {
  const choose = (isPublic: boolean) => {
    set("is_public", isPublic);
    onChoose?.();
  };
  return (
    <div className="visibility-grid" role="radiogroup" aria-label="Profile visibility">
      <button type="button" className={`visibility-card ${chosen && value.is_public ? "visibility-card-selected" : ""}`} role="radio" aria-checked={chosen && value.is_public} onClick={() => choose(true)}>
        <span className="visibility-icon"><Globe2 /></span>
        <span><strong>Public</strong><small>Anyone with your link</small></span>
        {chosen && value.is_public && <Check size={19} className="visibility-check" />}
      </button>
      <button type="button" className={`visibility-card ${chosen && !value.is_public ? "visibility-card-selected" : ""}`} role="radio" aria-checked={chosen && !value.is_public} onClick={() => choose(false)}>
        <span className="visibility-icon"><LockKeyhole /></span>
        <span><strong>Private</strong><small>Only you</small></span>
        {chosen && !value.is_public && <Check size={19} className="visibility-check" />}
      </button>
    </div>
  );
}

function StyleFields({
  value,
  set,
  avatarMode,
  photoPreviewUrl,
  photoError,
  onAvatarModeChange,
  onPhotoSelected,
  onPhotoRemove,
}: Pick<FormFieldsProps, "value" | "set"> & {
  avatarMode: AvatarMode;
  photoPreviewUrl: string | null;
  photoError?: string;
  onAvatarModeChange: (mode: AvatarMode) => void;
  onPhotoSelected: (photo: Blob) => void;
  onPhotoRemove: () => void;
}) {
  const character = getProfileCharacterOption(value.profile_character === "plain" ? "elephant" : value.profile_character);
  const chooseMode = (mode: AvatarMode) => {
    if (mode === "initial") set("profile_character", "plain");
    if (mode === "character" && value.profile_character === "plain") set("profile_character", "elephant");
    onAvatarModeChange(mode);
  };
  return (
    <div className="profile-style-fields">
      <section className="profile-style-section" aria-labelledby="appearance-style-heading">
        <div className="profile-style-heading"><strong id="appearance-style-heading">How would you like to appear?</strong><small>Choose what people notice first.</small></div>
        <div className="avatar-mode-grid" role="radiogroup" aria-label="Profile appearance">
          <button type="button" role="radio" aria-checked={avatarMode === "photo"} className={`avatar-mode-option ${avatarMode === "photo" ? "avatar-mode-option-selected" : ""}`} onClick={() => chooseMode("photo")}>
            <span className={`avatar-mode-visual ${photoPreviewUrl ? "avatar-mode-photo" : ""}`}>{photoPreviewUrl ? <img src={photoPreviewUrl} alt="" /> : <Camera size={25} />}</span>
            <strong>My photo</strong><small>Personal</small>
            {avatarMode === "photo" && <Check size={14} aria-hidden="true" />}
          </button>
          <button type="button" role="radio" aria-checked={avatarMode === "character"} className={`avatar-mode-option ${avatarMode === "character" ? "avatar-mode-option-selected" : ""}`} onClick={() => chooseMode("character")}>
            <span className="avatar-mode-visual avatar-mode-character"><img src={character.imageSrc ?? "/mascots/elephant.png"} alt="" /></span>
            <strong>Sia character</strong><small>Expressive</small>
            {avatarMode === "character" && <Check size={14} aria-hidden="true" />}
          </button>
          <button type="button" role="radio" aria-checked={avatarMode === "initial"} className={`avatar-mode-option ${avatarMode === "initial" ? "avatar-mode-option-selected" : ""}`} onClick={() => chooseMode("initial")}>
            <span className="avatar-mode-visual avatar-mode-initial">{value.display_name.slice(0, 1).toUpperCase() || <TypeIcon size={25} />}</span>
            <strong>Initial only</strong><small>Simple</small>
            {avatarMode === "initial" && <Check size={14} aria-hidden="true" />}
          </button>
        </div>
        {avatarMode === "photo" && <><ProfilePhotoPicker previewUrl={photoPreviewUrl} onPhotoSelected={onPhotoSelected} onRemove={onPhotoRemove} />{photoError && <p className="field-error photo-mode-error" role="alert">{photoError}</p>}</>}
        {avatarMode === "character" && <div className="avatar-character-choices"><p>Choose your Sia character.</p><ProfileCharacterPicker includePlain={false} value={getProfileCharacter(value.profile_character)} onChange={(characterId) => set("profile_character", characterId)} /></div>}
        {avatarMode === "initial" && <p className="avatar-initial-note">We’ll use the first letter of your name. You can add a photo anytime.</p>}
      </section>
      <section className="profile-style-section" aria-labelledby="colour-style-heading">
        <div className="profile-style-heading"><strong id="colour-style-heading">Choose your colour mood</strong><small>Mix any mood with any character.</small></div>
        <ProfileThemePicker value={getProfileTheme(value.profile_theme)} onChange={(theme) => set("profile_theme", theme)} />
      </section>
    </div>
  );
}

export function ProfileForm({
  initialValue = emptyProfile,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
}: {
  initialValue?: ProfileInput | Profile;
  submitLabel: string;
  submitting?: boolean;
  serverError?: string;
  onSubmit: (profile: ProfileInput, photoChange: ProfilePhotoChange) => void | Promise<void>;
}) {
  const [value, setValue] = useState<ProfileInput>(initialValue);
  const [step, setStep] = useState(0);
  const [visibilityChosen, setVisibilityChosen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const wizardHeadingRef = useRef<HTMLDivElement>(null);
  const avatar = useAvatarEditor(initialValue);
  const set = <K extends keyof ProfileInput>(key: K, next: ProfileInput[K]) => setValue((current) => ({ ...current, [key]: next }));
  const currentStep = steps[step] ?? steps[0]!;
  const CurrentIcon = currentStep.icon;
  const preview = {
    ...value,
    display_name: value.display_name || "Your name",
    username: value.username || "yourname",
    role: value.role || "What you do",
  };

  useEffect(() => {
    if (step === 0) return;
    wizardHeadingRef.current?.focus({ preventScroll: true });
    wizardHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const next = () => {
    if (step === 0) {
      const result = validationErrors(value);
      if (result.errors.display_name || result.errors.username || result.errors.role || result.errors.bio) {
        setErrors(result.errors);
        return;
      }
    }
    if (step === 3 && avatar.avatarMode === "photo" && !avatar.previewUrl) {
      setErrors({ photo: "Take or choose a photo, or select another option." });
      return;
    }
    setErrors({});
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step < steps.length - 1) { next(); return; }
    if (!visibilityChosen) {
      setErrors({ visibility: "Choose who can see your Sia." });
      return;
    }
    const result = validationErrors(value);
    if (!result.data) { setErrors(result.errors); return; }
    setErrors({});
    void onSubmit(result.data, avatar.change);
  };

  return (
    <div className="profile-builder">
      <form className="form-card wizard-card" onSubmit={submit} noValidate>
        <nav className="wizard-progress" aria-label="Profile creation progress">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return <span className={index === step ? "wizard-dot wizard-dot-active" : index < step ? "wizard-dot wizard-dot-done" : "wizard-dot"} key={item.label}><Icon size={15} /><small>{item.label}</small></span>;
          })}
        </nav>

        <div className="wizard-heading" ref={wizardHeadingRef} tabIndex={-1}><span className="wizard-heading-icon"><CurrentIcon /></span><div><span>{step + 1} / {steps.length}</span><h2>{currentStep.label}</h2></div></div>

        <div className="wizard-body">
          {step === 0 && <BasicsFields value={value} errors={errors} set={set} />}
          {step === 1 && (
            <TextField
              id="current-context"
              label="What’s happening?"
              hint={`${value.current_context.length}/160`}
              maxLength={160}
              placeholder="At a design meetup in London"
              value={value.current_context}
              error={errors.current_context}
              onChange={(event) => set("current_context", event.target.value)}
            />
          )}
          {step === 2 && (
            <div className="connect-fields">
              <TagPicker label="I’m into" helper="Pick a few." suggestions={interestSuggestions} value={value.interests} onChange={(nextValue) => set("interests", nextValue)} />
              <TagPicker label="Open to" helper="What feels welcome?" suggestions={openToSuggestions} value={value.open_to} onChange={(nextValue) => set("open_to", nextValue)} />
            </div>
          )}
          {step === 3 && <StyleFields value={value} set={set} avatarMode={avatar.avatarMode} photoPreviewUrl={avatar.previewUrl} photoError={errors.photo} onAvatarModeChange={(mode) => { avatar.setAvatarMode(mode); setErrors({}); }} onPhotoSelected={(photo) => { avatar.choosePhoto(photo); setErrors({}); }} onPhotoRemove={() => { avatar.removePhoto(); set("profile_character", "plain"); setErrors({}); }} />}
          {step === 4 && (
            <>
              <p className="visibility-lede">Who can open your profile?</p>
              <VisibilityChoice value={value} set={set} chosen={visibilityChosen} onChoose={() => { setVisibilityChosen(true); setErrors({}); }} />
              {errors.visibility && <p className="field-error visibility-error" role="alert">{errors.visibility}</p>}
            </>
          )}
        </div>

        {serverError && <p className="form-error" role="alert">{serverError}</p>}
        <div className="wizard-actions">
          {step > 0 ? <Button type="button" variant="quiet" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Back</Button> : <span />}
          <Button type="submit" loading={submitting}>{step === steps.length - 1 ? submitLabel : <>Next <ArrowRight size={17} /></>}</Button>
        </div>
        <p className="form-privacy"><LockKeyhole size={12} /> You control who can see it.</p>
      </form>

      <aside className="builder-preview" aria-label="Live profile preview">
        <span className="builder-preview-label">Live preview</span>
        <ProfileCard profile={preview} photoPreviewUrl={avatar.previewUrl} compact />
      </aside>
    </div>
  );
}

export function EditProfileForm({
  initialValue,
  submitting,
  serverError,
  onSubmit,
}: {
  initialValue: Profile;
  submitting?: boolean;
  serverError?: string;
  onSubmit: (profile: ProfileInput, photoChange: ProfilePhotoChange) => void | Promise<void>;
}) {
  const [value, setValue] = useState<ProfileInput>(initialValue);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const avatar = useAvatarEditor(initialValue);
  const set = <K extends keyof ProfileInput>(key: K, next: ProfileInput[K]) => setValue((current) => ({ ...current, [key]: next }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (avatar.avatarMode === "photo" && !avatar.previewUrl) {
      setErrors({ photo: "Take or choose a photo, or select another option." });
      return;
    }
    const result = validationErrors(value);
    if (!result.data) { setErrors(result.errors); return; }
    setErrors({});
    void onSubmit(result.data, avatar.change);
  };

  return (
    <form className="form-card edit-form" onSubmit={submit} noValidate>
      <section className="edit-now">
        <span className="edit-section-icon"><Sparkles /></span>
        <div className="edit-section-copy"><span>Right now</span><h2>What’s happening?</h2></div>
        <TextField id="current-context" label="Current moment" hint={`${value.current_context.length}/160`} maxLength={160} placeholder="At a meetup in London" value={value.current_context} error={errors.current_context} onChange={(event) => set("current_context", event.target.value)} />
      </section>

      <details className="edit-details">
        <summary><span><UserRound size={18} /> About me</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body"><BasicsFields value={value} errors={errors} set={set} /></div>
      </details>
      <details className="edit-details">
        <summary><span><MessageCircleMore size={18} /> Connect</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body connect-fields"><TagPicker label="I’m into" helper="Pick a few." suggestions={interestSuggestions} value={value.interests} onChange={(nextValue) => set("interests", nextValue)} /><TagPicker label="Open to" helper="What feels welcome?" suggestions={openToSuggestions} value={value.open_to} onChange={(nextValue) => set("open_to", nextValue)} /></div>
      </details>
      <details className="edit-details">
        <summary><span><Palette size={18} /> Style</span><span className="visibility-summary">{avatar.avatarMode === "photo" ? "My photo" : avatar.avatarMode === "initial" ? "Initial" : getProfileCharacterOption(value.profile_character).label} · {profileThemeOptions.find((theme) => theme.id === getProfileTheme(value.profile_theme))?.label}</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body"><StyleFields value={value} set={set} avatarMode={avatar.avatarMode} photoPreviewUrl={avatar.previewUrl} photoError={errors.photo} onAvatarModeChange={(mode) => { avatar.setAvatarMode(mode); setErrors({}); }} onPhotoSelected={(photo) => { avatar.choosePhoto(photo); setErrors({}); }} onPhotoRemove={() => { avatar.removePhoto(); set("profile_character", "plain"); setErrors({}); }} /></div>
      </details>
      <details className="edit-details">
        <summary><span><Globe2 size={18} /> Visibility</span><span className="visibility-summary">{value.is_public ? "Public" : "Private"}</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body"><VisibilityChoice value={value} set={set} /></div>
      </details>

      {serverError && <p className="form-error" role="alert">{serverError}</p>}
      <div className="edit-save"><Button type="submit" loading={submitting}><Check size={18} /> Save</Button></div>
    </form>
  );
}
