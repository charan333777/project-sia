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
  Sparkles,
  Type as TypeIcon,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { profileInputSchema, type Profile, type ProfileInput, type ProfileWizardDraft } from "@sia/validation";
import { Button } from "./button";
import { fieldStep, pruneEmptyContactItems } from "@/lib/contact-items";
import { cleanUsernameInput, usernameFromName } from "@/lib/username";
import { ContactItemsEditor } from "./contact-items-editor";
import { TextAreaField, TextField } from "./field";
import { ProfileCard } from "./profile-card";
import { ProfileCharacterPicker } from "./profile-character-picker";
import { getProfileCharacter, getProfileCharacterOption } from "./profile-characters";
import { ProfilePhotoPicker } from "./profile-photo-picker";
import { ProfilePreviewStrip } from "./profile-preview-strip";
import { ProfileThemePicker } from "./profile-theme-picker";
import { getProfileTheme, profileThemeOptions } from "./profile-themes";
import { TagPicker } from "./tag-picker";
import { usernameSchema } from "@sia/validation";
import { api } from "@/lib/api";
import { moveRadioSelection } from "@/lib/radio-group";

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
  contact_items: [],
  list_in_search: false,
};

const interestSuggestions = ["AI", "Startups", "DevOps", "Photography", "Music", "Football", "Travel", "Design"];
const openToSuggestions = ["A quick chat", "Networking", "Making friends", "Learning", "Sharing ideas", "Coffee", "Collaborating"];
const contextSuggestions = ["At a meetup", "At a conference", "New in town", "On campus", "Working from a café", "Exploring the city"];

// Optional polish stays inside the three core stages, and can also be edited later.
const steps = [
  { label: "You", title: "Who are you?", icon: UserRound },
  { label: "Your moment", title: "What feels welcome?", icon: MessageCircleMore },
  { label: "Review", title: "Ready to share?", icon: Globe2 },
];

// A failed Next/Save should land focus on the first problem rather than leaving it on the
// button, so keyboard and screen-reader users reach the error immediately. Fields without a
// single input (photo, tags, contacts) fall back to the step heading.
const fieldFocusId: Record<string, string> = {
  display_name: "display-name",
  username: "username",
  role: "role",
  current_context: "current-context",
  bio: "bio",
};

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

function useAvatarEditor(initialValue: ProfileInput | Profile, initialPhoto?: Blob) {
  const originalPhotoUrl = profilePhotoUrl(initialValue);
  const originallyHadPhoto = profileHasPhoto(initialValue);
  const [avatarMode, setAvatarMode] = useState<AvatarMode>(() => initialPhoto ? "photo" : initialAvatarMode(initialValue));
  // A photo restored from a draft starts out as if it had just been chosen, so it is uploaded
  // with the profile rather than silently dropped.
  const [photo, setPhoto] = useState<Blob | null>(initialPhoto ?? null);
  const localPhotoUrlRef = useRef<string | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(() => {
    if (!initialPhoto) return null;
    localPhotoUrlRef.current = URL.createObjectURL(initialPhoto);
    return localPhotoUrlRef.current;
  });

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

function BasicsFields({ value, errors, set, availability }: FormFieldsProps & { availability?: string }) {
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
            spellCheck={false}
            maxLength={30}
            placeholder="maya"
            value={value.username}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "username-error" : availability ? "username-availability" : undefined}
            onChange={(event) => set("username", cleanUsernameInput(event.target.value))}
          />
        </div>
        {errors.username && <p className="field-error" id="username-error">{errors.username}</p>}
        {!errors.username && availability && <p className="username-availability" id="username-availability" role="status">{availability}</p>}
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
    </>
  );
}

/**
 * "Right now" is the line that makes a Sia feel current, and a blank box is the hardest
 * thing to fill in. A tap fills it with a starting point that can still be edited; tapping
 * the chosen one again clears it.
 */
function ContextSuggestions({ value, set }: Pick<FormFieldsProps, "value" | "set">) {
  return (
    <div className="context-suggestions">
      <p id="context-suggestions-label">Need an idea?</p>
      <div className="suggestion-list" role="group" aria-labelledby="context-suggestions-label">
        {contextSuggestions.map((item) => {
          const selected = value.current_context === item;
          return (
            <button type="button" className={selected ? "chip chip-selected" : "chip"} key={item} aria-pressed={selected} onClick={() => set("current_context", selected ? "" : item)}>
              {selected && <Check size={14} />} {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IntroDetails({ value, errors, set }: FormFieldsProps) {
  return (
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
  );
}

function VisibilityChoice({ value, set, onChoose }: Pick<FormFieldsProps, "value" | "set"> & { onChoose?: () => void }) {
  const choose = (isPublic: boolean) => {
    set("is_public", isPublic);
    onChoose?.();
  };
  return (
    <div className="visibility-grid" role="radiogroup" aria-label="Profile visibility" onKeyDown={moveRadioSelection}>
      <button type="button" className={`visibility-card ${value.is_public ? "visibility-card-selected" : ""}`} role="radio" tabIndex={value.is_public ? 0 : -1} aria-checked={value.is_public} onClick={() => choose(true)}>
        <span className="visibility-icon"><Globe2 /></span>
        <span><strong>Anyone who scans</strong><small>Opens for anyone with your link or QR</small></span>
        {value.is_public && <Check size={19} className="visibility-check" />}
      </button>
      <button type="button" className={`visibility-card ${!value.is_public ? "visibility-card-selected" : ""}`} role="radio" tabIndex={!value.is_public ? 0 : -1} aria-checked={!value.is_public} onClick={() => choose(false)}>
        <span className="visibility-icon"><LockKeyhole /></span>
        <span><strong>Only me for now</strong><small>Private — your QR won’t open for anyone else</small></span>
        {!value.is_public && <Check size={19} className="visibility-check" />}
      </button>
    </div>
  );
}

/**
 * Public means "anyone with the link can open this". Listed means "put it in an index of
 * every profile on Sia" — a different decision now that a card can carry a phone number,
 * so it is asked separately and defaults to off.
 */
function SearchListingChoice({ value, set }: Pick<FormFieldsProps, "value" | "set">) {
  if (!value.is_public) return null;
  return (
    <label className="search-listing">
      <input
        type="checkbox"
        checked={value.list_in_search}
        onChange={(event) => set("list_in_search", event.target.checked)}
      />
      <span>
        <strong>Let search engines list me</strong>
        <small>Off by default. Your Sia works either way — this only decides whether it can be found by searching.</small>
      </span>
    </label>
  );
}

type AppearanceFieldsProps = Pick<FormFieldsProps, "value" | "set"> & {
  avatarMode: AvatarMode;
  photoPreviewUrl: string | null;
  photoError?: string;
  onAvatarModeChange: (mode: AvatarMode) => void;
  onPhotoSelected: (photo: Blob) => void;
  onPhotoRemove: () => void;
};

function AppearanceFields({
  value,
  set,
  avatarMode,
  photoPreviewUrl,
  photoError,
  onAvatarModeChange,
  onPhotoSelected,
  onPhotoRemove,
}: AppearanceFieldsProps) {
  const character = getProfileCharacterOption(value.profile_character === "plain" ? "elephant" : value.profile_character);
  const chooseMode = (mode: AvatarMode) => {
    if (mode === "initial") set("profile_character", "plain");
    if (mode === "character" && value.profile_character === "plain") set("profile_character", "elephant");
    onAvatarModeChange(mode);
  };
  return (
    <section className="profile-style-section" aria-labelledby="appearance-style-heading">
      <div className="profile-style-heading"><strong id="appearance-style-heading">How would you like to appear?</strong><small>Choose what people notice first.</small></div>
      <div className="avatar-mode-grid" role="radiogroup" aria-label="Profile appearance" onKeyDown={moveRadioSelection}>
        <button type="button" role="radio" tabIndex={avatarMode === "photo" ? 0 : -1} aria-checked={avatarMode === "photo"} className={`avatar-mode-option ${avatarMode === "photo" ? "avatar-mode-option-selected" : ""}`} onClick={() => chooseMode("photo")}>
          <span className={`avatar-mode-visual ${photoPreviewUrl ? "avatar-mode-photo" : ""}`}>{photoPreviewUrl ? <img src={photoPreviewUrl} alt="" /> : <Camera size={25} />}</span>
          <strong>My photo</strong><small>Personal</small>
          {avatarMode === "photo" && <Check size={14} aria-hidden="true" />}
        </button>
        <button type="button" role="radio" tabIndex={avatarMode === "character" ? 0 : -1} aria-checked={avatarMode === "character"} className={`avatar-mode-option ${avatarMode === "character" ? "avatar-mode-option-selected" : ""}`} onClick={() => chooseMode("character")}>
          <span className="avatar-mode-visual avatar-mode-character"><img src={character.imageSrc ?? "/mascots/elephant.png"} alt="" /></span>
          <strong>Sia character</strong><small>Expressive</small>
          {avatarMode === "character" && <Check size={14} aria-hidden="true" />}
        </button>
        <button type="button" role="radio" tabIndex={avatarMode === "initial" ? 0 : -1} aria-checked={avatarMode === "initial"} className={`avatar-mode-option ${avatarMode === "initial" ? "avatar-mode-option-selected" : ""}`} onClick={() => chooseMode("initial")}>
          <span className="avatar-mode-visual avatar-mode-initial">{value.display_name.slice(0, 1).toUpperCase() || <TypeIcon size={25} />}</span>
          <strong>Initial only</strong><small>Simple</small>
          {avatarMode === "initial" && <Check size={14} aria-hidden="true" />}
        </button>
      </div>
      {avatarMode === "photo" && <><ProfilePhotoPicker previewUrl={photoPreviewUrl} onPhotoSelected={onPhotoSelected} onRemove={onPhotoRemove} />{photoError && <p className="field-error photo-mode-error" role="alert">{photoError}</p>}</>}
      {avatarMode === "character" && <div className="avatar-character-choices"><p>Choose your Sia character.</p><ProfileCharacterPicker includePlain={false} value={getProfileCharacter(value.profile_character)} onChange={(characterId) => set("profile_character", characterId)} /></div>}
      {avatarMode === "initial" && <p className="avatar-initial-note">We’ll use the first letter of your name. You can add a photo anytime.</p>}
    </section>
  );
}

function ColourFields({ value, set }: Pick<FormFieldsProps, "value" | "set">) {
  return (
    <section className="profile-style-section" aria-labelledby="colour-style-heading">
      <div className="profile-style-heading"><strong id="colour-style-heading">Choose your colour mood</strong><small>Mix any mood with any character.</small></div>
      <ProfileThemePicker value={getProfileTheme(value.profile_theme)} onChange={(theme) => set("profile_theme", theme)} />
    </section>
  );
}

function StyleFields(props: AppearanceFieldsProps) {
  return (
    <div className="profile-style-fields">
      <AppearanceFields {...props} />
      <ColourFields value={props.value} set={props.set} />
    </div>
  );
}

/** Opening the wizard on a saved draft — after "Back to edit", or a save that failed after sign-up. */
export type ProfileFormResume = { photo?: Blob; draftId?: string; errors?: Record<string, string>; step?: number; avatarMode?: AvatarMode; usernameTouched?: boolean };

export function ProfileForm({
  initialValue = emptyProfile,
  resume,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
  onProgress,
  rememberProgress = false,
  onDiscard,
  checkUsername = false,
}: {
  initialValue?: ProfileInput | Profile;
  resume?: ProfileFormResume;
  submitLabel: string;
  submitting?: boolean;
  serverError?: string;
  onSubmit: (profile: ProfileInput, photoChange: ProfilePhotoChange) => void | Promise<void>;
  onProgress?: (draft: ProfileWizardDraft, photo: ProfilePhotoChange) => void;
  rememberProgress?: boolean;
  onDiscard?: () => void;
  checkUsername?: boolean;
}) {
  const [value, setValue] = useState<ProfileInput>(initialValue);
  // A resumed draft opens on the step that owns its first problem, with the answer to
  // "who can see it" already given.
  const [step, setStep] = useState(() => {
    const firstField = Object.keys(resume?.errors ?? {})[0];
    return (firstField === undefined ? undefined : fieldStep[firstField]) ?? resume?.step ?? 0;
  });
  const [availability, setAvailability] = useState("");
  useEffect(() => {
    setAvailability("");
    if (!checkUsername || !usernameSchema.safeParse(value.username).success) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setAvailability("Checking your username…");
      void api.checkUsername(value.username, controller.signal).then((result) => {
        if (!controller.signal.aborted) setAvailability(result.available ? "Available — yours when you save." : "Already in use. Try another username.");
      }).catch(() => { if (!controller.signal.aborted) setAvailability("We’ll check this when you save."); });
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [checkUsername, value.username]);
  const [errors, setErrors] = useState<Record<string, string>>(resume?.errors ?? {});
  // Until someone edits the username themselves, it follows the name they type.
  const usernameTouched = useRef(resume?.usernameTouched ?? Boolean(initialValue.username));
  const wizardHeadingRef = useRef<HTMLDivElement>(null);
  const wizardBodyRef = useRef<HTMLDivElement>(null);
  // The field to focus once errors render and any step switch has committed.
  const pendingFocus = useRef<string | null>(null);
  const avatar = useAvatarEditor(initialValue, resume?.photo);
  const historyDepth = useRef(0);
  const draftId = useRef(resume?.draftId ?? crypto.randomUUID());
  useEffect(() => {
    if (resume?.avatarMode) avatar.setAvatarMode(resume.avatarMode);
  }, []);
  useEffect(() => {
    onProgress?.({ version: 1, draft_id: draftId.current, step, avatar_mode: avatar.avatarMode, username_touched: usernameTouched.current, value }, avatar.change);
  }, [value, step, avatar.avatarMode, avatar.change.action, avatar.change.action === "upload" ? avatar.change.photo : null, onProgress]);

  const changeStep = (nextStep: number, replace = false) => {
    setStep(nextStep);
    if (!rememberProgress) return;
    const url = new URL(window.location.href);
    url.hash = `step-${nextStep + 1}`;
    if (!replace) historyDepth.current += 1;
    window.history[replace ? "replaceState" : "pushState"]({ ...window.history.state, siaCreateStep: nextStep, siaCreateDepth: historyDepth.current }, "", url);
  };
  useEffect(() => {
    if (!rememberProgress) return;
    const url = new URL(window.location.href);
    url.hash = `step-${step + 1}`;
    window.history.replaceState({ ...window.history.state, siaCreateStep: step, siaCreateDepth: 0 }, "", url);
    const restoreStep = () => {
      if (window.location.pathname !== "/create") return;
      const saved = window.history.state?.siaCreateStep;
      if (Number.isInteger(saved) && saved >= 0 && saved < steps.length) {
        historyDepth.current = window.history.state?.siaCreateDepth ?? 0;
        setStep(saved);
        setErrors({});
      }
    };
    window.addEventListener("popstate", restoreStep);
    return () => window.removeEventListener("popstate", restoreStep);
  }, [rememberProgress]);
  const set = <K extends keyof ProfileInput>(key: K, next: ProfileInput[K]) => {
    if (key === "username") usernameTouched.current = true;
    setValue((current) => ({
      ...current,
      [key]: next,
      ...(key === "display_name" && !usernameTouched.current ? { username: usernameFromName(String(next)) } : {}),
    }));
    // An error describes the value that failed; once that value changes it is out of date.
    setErrors((current) => {
      const stale = key === "display_name" && !usernameTouched.current ? [key, "username"] : [key];
      if (!stale.some((field) => field in current)) return current;
      const nextErrors = { ...current };
      for (const field of stale) delete nextErrors[field];
      return nextErrors;
    });
  };
  const hiddenContacts = value.contact_items.filter((item) => item.value.trim() && !item.is_public).length;
  const currentStep = steps[step] ?? steps[0]!;
  const CurrentIcon = currentStep.icon;
  const preview = {
    ...value,
    display_name: value.display_name || "Your name",
    username: value.username || "yourname",
    role: value.role || "What you do",
  };

  useEffect(() => {
    // On a phone the step body is its own scroll area on very short screens; a new step
    // should not open halfway down.
    if (wizardBodyRef.current) wizardBodyRef.current.scrollTop = 0;
    if (step === 0) return;
    wizardHeadingRef.current?.focus({ preventScroll: true });
    wizardHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // Runs after validation sets errors (and after any step switch commits), so focus lands on
  // the first invalid field even when it lives on an earlier step.
  useEffect(() => {
    const field = pendingFocus.current;
    if (!field) return;
    pendingFocus.current = null;
    const id = fieldFocusId[field];
    const target = id ? document.getElementById(id) : null;
    if (target) target.focus();
    else wizardHeadingRef.current?.focus({ preventScroll: true });
  }, [errors, step]);

  const next = () => {
    if (step === 0) {
      const result = validationErrors(value);
      if (result.errors.display_name || result.errors.username || result.errors.role) {
        pendingFocus.current = result.errors.display_name ? "display_name" : result.errors.username ? "username" : "role";
        setErrors(result.errors);
        return;
      }
    }
    if (step === 1) {
      const result = validationErrors(value);
      if (result.errors.current_context || result.errors.bio) {
        pendingFocus.current = result.errors.current_context ? "current_context" : "bio";
        setErrors(result.errors);
        return;
      }
    }
    if (step === 0 && avatar.avatarMode === "photo" && !avatar.previewUrl) {
      pendingFocus.current = "photo";
      setErrors({ photo: "Take or choose a photo, or select another option." });
      return;
    }
    setErrors({});
    changeStep(Math.min(step + 1, steps.length - 1));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step < steps.length - 1) { next(); return; }
    const pruned = pruneEmptyContactItems(value);
    if (pruned !== value) setValue(pruned);
    const result = validationErrors(pruned);
    if (!result.data) {
      setErrors(result.errors);
      // The failing field may belong to an earlier step, where its message is rendered.
      // Without this the submit button appears to do nothing at all.
      const firstField = Object.keys(result.errors)[0];
      pendingFocus.current = firstField ?? null;
      const target = firstField === undefined ? undefined : fieldStep[firstField];
      if (target !== undefined && target !== step) changeStep(target);
      return;
    }
    if (avatar.avatarMode === "photo" && !avatar.previewUrl) {
      pendingFocus.current = "photo";
      setErrors({ photo: "Take or choose a photo, or select another option." });
      changeStep(0);
      return;
    }
    setErrors({});
    void onSubmit(result.data, avatar.change);
  };

  return (
    <div className="profile-builder">
      <ProfilePreviewStrip profile={preview} photoPreviewUrl={avatar.previewUrl} />
      <form className="form-card wizard-card" onSubmit={submit} noValidate>
        <nav className="wizard-progress" aria-label="Profile creation progress">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return <span className={index === step ? "wizard-dot wizard-dot-active" : index < step ? "wizard-dot wizard-dot-done" : "wizard-dot"} key={item.label}><Icon size={15} /><small>{item.label}</small></span>;
          })}
        </nav>

        <div className="wizard-heading" ref={wizardHeadingRef} tabIndex={-1}><span className="wizard-heading-icon"><CurrentIcon /></span><div><span>{step + 1} / {steps.length}</span><h2>{currentStep.title}</h2></div></div>

        <div className="wizard-body" ref={wizardBodyRef}>
          {step === 0 && <>
            <p className="wizard-account-note">Three small steps, then a free account to save your Sia.</p>
            <BasicsFields value={value} errors={errors} set={set} availability={availability} />
            <details className="wizard-optional" open={errors.photo ? true : undefined}>
              <summary>Choose a photo or character <span>Optional</span><ChevronDown size={16} /></summary>
              <AppearanceFields value={value} set={set} avatarMode={avatar.avatarMode} photoPreviewUrl={avatar.previewUrl} photoError={errors.photo} onAvatarModeChange={(mode) => { avatar.setAvatarMode(mode); setErrors({}); }} onPhotoSelected={(photo) => { avatar.choosePhoto(photo); setErrors({}); }} onPhotoRemove={() => { avatar.removePhoto(); set("profile_character", "plain"); setErrors({}); }} />
            </details>
          </>}
          {step === 1 && <>
            <TextField id="current-context" label="What’s happening?" hint="Optional" maxLength={160} placeholder="At a design meetup in London" value={value.current_context} error={errors.current_context} onChange={(event) => set("current_context", event.target.value)} />
            <ContextSuggestions value={value} set={set} />
            <TagPicker label="Open to" helper="Pick what feels welcome, or carry on for now." suggestions={openToSuggestions} value={value.open_to} onChange={(nextValue) => set("open_to", nextValue)} />
            <details className="wizard-optional" open={errors.interests || errors.bio ? true : undefined}>
              <summary>Interests and a short intro <span>Optional</span><ChevronDown size={16} /></summary>
              <TagPicker label="I’m into" helper="Good starting points for a conversation." suggestions={interestSuggestions} value={value.interests} onChange={(nextValue) => set("interests", nextValue)} />
              <TextAreaField id="bio" label="About you" hint="Optional" maxLength={300} value={value.bio} error={errors.bio} onChange={(event) => set("bio", event.target.value)} />
            </details>
          </>}
          {step === 2 && <>
            <p className="visibility-lede">Who can open your profile?</p>
            <VisibilityChoice value={value} set={set} onChoose={() => setErrors({})} />
            <SearchListingChoice value={value} set={set} />
            <p className="wizard-review-note">{value.is_public ? "Your QR opens your Sia. Only contact details you publish appear on the card." : "Your Sia stays private. You can make it shareable any time in Edit."}</p>
            <details className="wizard-optional" open={errors.contact_items ? true : undefined}>
              <summary>Ways to reach you <span>Optional</span><ChevronDown size={16} /></summary>
              <ContactItemsEditor value={value.contact_items} error={errors.contact_items} onChange={(nextValue) => set("contact_items", nextValue)} />
            </details>
            {hiddenContacts > 0 && <p className="hidden-contacts-note"><LockKeyhole size={14} /><span>{hiddenContacts} contact detail{hiddenContacts === 1 ? " stays" : "s stay"} hidden until you publish {hiddenContacts === 1 ? "it" : "them"}.</span></p>}
            <details className="wizard-optional"><summary>Colour mood <span>Optional</span><ChevronDown size={16} /></summary><ColourFields value={value} set={set} /></details>
            <p className="wizard-review-note">Create a free account next to save your Sia. You can edit every detail afterward.</p>
          </>}

        </div>

        {serverError && <p className="form-error" role="alert">{serverError}</p>}
        <div className="wizard-actions">
          {step > 0 ? <Button type="button" variant="quiet" onClick={() => { if (rememberProgress && historyDepth.current > 0) window.history.back(); else changeStep(step - 1, true); }}><ArrowLeft size={17} /> Back</Button> : <span />}
          <Button type="submit" loading={submitting}>{step === steps.length - 1 ? submitLabel : <>Next <ArrowRight size={17} /></>}</Button>
        </div>
        <p className="form-privacy"><LockKeyhole size={12} /> You control who can see it.</p>
        {onDiscard && <button type="button" className="wizard-discard" onClick={onDiscard}>Discard draft and start again</button>}
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
  const set = <K extends keyof ProfileInput>(key: K, next: ProfileInput[K]) => {
    setValue((current) => ({ ...current, [key]: next }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const { [key]: _stale, ...rest } = current;
      return rest;
    });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (avatar.avatarMode === "photo" && !avatar.previewUrl) {
      setErrors({ photo: "Take or choose a photo, or select another option." });
      return;
    }
    const pruned = pruneEmptyContactItems(value);
    if (pruned !== value) setValue(pruned);
    const result = validationErrors(pruned);
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
        <ContextSuggestions value={value} set={set} />
      </section>

      <details className="edit-details">
        <summary><span><UserRound size={18} /> About me</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body"><BasicsFields value={value} errors={errors} set={set} /><IntroDetails value={value} errors={errors} set={set} /></div>
      </details>
      <details className="edit-details">
        <summary><span><MessageCircleMore size={18} /> Connect</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body connect-fields"><TagPicker label="I’m into" helper="Pick a few." suggestions={interestSuggestions} value={value.interests} onChange={(nextValue) => set("interests", nextValue)} /><TagPicker label="Open to" helper="What feels welcome?" suggestions={openToSuggestions} value={value.open_to} onChange={(nextValue) => set("open_to", nextValue)} /><ContactItemsEditor value={value.contact_items} error={errors.contact_items} onChange={(nextValue) => set("contact_items", nextValue)} /></div>
      </details>
      <details className="edit-details">
        <summary><span><Palette size={18} /> Style</span><span className="visibility-summary">{avatar.avatarMode === "photo" ? "My photo" : avatar.avatarMode === "initial" ? "Initial" : getProfileCharacterOption(value.profile_character).label} · {profileThemeOptions.find((theme) => theme.id === getProfileTheme(value.profile_theme))?.label}</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body"><StyleFields value={value} set={set} avatarMode={avatar.avatarMode} photoPreviewUrl={avatar.previewUrl} photoError={errors.photo} onAvatarModeChange={(mode) => { avatar.setAvatarMode(mode); setErrors({}); }} onPhotoSelected={(photo) => { avatar.choosePhoto(photo); setErrors({}); }} onPhotoRemove={() => { avatar.removePhoto(); set("profile_character", "plain"); setErrors({}); }} /></div>
      </details>
      <details className="edit-details">
        <summary><span><Globe2 size={18} /> Visibility</span><span className="visibility-summary">{value.is_public ? "Public" : "Private"}</span><ChevronDown size={18} /></summary>
        <div className="edit-details-body"><VisibilityChoice value={value} set={set} /><SearchListingChoice value={value} set={set} /></div>
      </details>

      {serverError && <p className="form-error" role="alert">{serverError}</p>}
      <div className="edit-save"><Button type="submit" loading={submitting}><Check size={18} /> Save</Button></div>
    </form>
  );
}
