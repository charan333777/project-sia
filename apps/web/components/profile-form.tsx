"use client";

import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { profileInputSchema, type ProfileInput } from "@sia/validation";
import { Button } from "./button";
import { TextAreaField, TextField } from "./field";
import { TagPicker } from "./tag-picker";

export const emptyProfile: ProfileInput = {
  username: "",
  display_name: "",
  role: "",
  bio: "",
  current_context: "",
  interests: [],
  open_to: [],
  is_public: true,
};

const interestSuggestions = ["AI", "Startups", "DevOps", "Photography", "Music", "Football", "Travel", "Design"];
const openToSuggestions = ["A quick chat", "Networking", "Making friends", "Learning", "Sharing ideas", "Coffee", "Collaborating"];

export function ProfileForm({
  initialValue = emptyProfile,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
}: {
  initialValue?: ProfileInput;
  submitLabel: string;
  submitting?: boolean;
  serverError?: string;
  onSubmit: (profile: ProfileInput) => void | Promise<void>;
}) {
  const [value, setValue] = useState<ProfileInput>(initialValue);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ProfileInput>(key: K, next: ProfileInput[K]) => setValue((current) => ({ ...current, [key]: next }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = profileInputSchema.safeParse(value);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field && !next[String(field)]) next[String(field)] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    void onSubmit(result.data);
  };

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <fieldset className="form-section">
        <legend>First, the basics</legend>
        <p className="form-section-note">Use the name you’d naturally introduce yourself with.</p>
        <TextField
          id="display-name"
          label="What should people call you?"
          hint={`${value.display_name.length}/60`}
          autoComplete="name"
          maxLength={60}
          placeholder="e.g. Zach"
          value={value.display_name}
          error={errors.display_name}
          onChange={(event) => set("display_name", event.target.value)}
        />
        <div className="field">
          <div className="field-label-row"><label htmlFor="username">Choose your Sia username</label><span>3–30 characters</span></div>
          <div className="username-input-wrap">
            <span className="username-prefix">@</span>
            <input
              id="username"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={30}
              placeholder="zach"
              value={value.username}
              aria-invalid={Boolean(errors.username)}
              onChange={(event) => set("username", event.target.value.toLowerCase().replace(/\s/g, ""))}
            />
          </div>
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>
        <TextField
          id="role"
          label="What do you do?"
          hint={`${value.role.length}/80`}
          maxLength={80}
          placeholder="e.g. AI Engineer, Student, Photographer"
          value={value.role}
          error={errors.role}
          onChange={(event) => set("role", event.target.value)}
        />
        <TextAreaField
          id="bio"
          label="A little about you"
          hint={`${value.bio.length}/300`}
          maxLength={300}
          placeholder="What would help someone understand you in a few seconds?"
          value={value.bio}
          error={errors.bio}
          onChange={(event) => set("bio", event.target.value)}
        />
      </fieldset>

      <fieldset className="form-section">
        <legend>What’s happening right now?</legend>
        <p className="form-section-note">Context makes it easier for someone to know what to say first.</p>
        <TextField
          id="current-context"
          label="What are you doing right now?"
          hint={`${value.current_context.length}/160`}
          maxLength={160}
          placeholder="e.g. Heading to a startup event"
          value={value.current_context}
          error={errors.current_context}
          onChange={(event) => set("current_context", event.target.value)}
        />
      </fieldset>

      <div className="form-section">
        <TagPicker label="What are you interested in?" helper="Pick a few easy conversation starters." suggestions={interestSuggestions} value={value.interests} onChange={(next) => set("interests", next)} />
      </div>
      <div className="form-section">
        <TagPicker label="What are you open to?" helper="Let people know that saying hello is welcome." suggestions={openToSuggestions} value={value.open_to} onChange={(next) => set("open_to", next)} />
      </div>

      {serverError && <p className="form-error" role="alert">{serverError}</p>}
      <div className="form-actions">
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
        <p className="form-privacy"><LockKeyhole size={12} /> Your profile is only saved after you securely create or access your account.</p>
      </div>
    </form>
  );
}
