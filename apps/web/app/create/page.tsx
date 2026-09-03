"use client";

import { PROFILE_DRAFT_KEY } from "@sia/shared";
import type { ProfileInput } from "@sia/validation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProfileForm, type ProfilePhotoChange } from "@/components/profile-form";
import { api, ApiRequestError } from "@/lib/api";
import { clearProfilePhotoDraft, saveProfilePhotoDraft } from "@/lib/profile-photo-draft";

export default function CreatePage() {
  const router = useRouter();
  const { session } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (profile: ProfileInput, photoChange: ProfilePhotoChange) => {
    setSubmitting(true);
    setError("");
    sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(profile));
    if (!session) {
      try {
        if (photoChange.action === "upload") await saveProfilePhotoDraft(photoChange.photo);
        else await clearProfilePhotoDraft();
      } catch {
        setError("We couldn’t keep that photo for the next step. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push("/login?from=create");
      return;
    }
    try {
      try {
        await api.createProfile(profile, session.access_token);
      } catch (caught) {
        if (!(caught instanceof ApiRequestError && caught.code === "PROFILE_EXISTS")) throw caught;
      }
      if (photoChange.action === "upload") await api.uploadProfilePhoto(photoChange.photo, session.access_token);
      sessionStorage.removeItem(PROFILE_DRAFT_KEY);
      await clearProfilePhotoDraft().catch(() => undefined);
      router.push("/profile?created=1");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t create your profile. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="builder-shell">
        <div className="page-intro"><span className="eyebrow">Your Sia</span><h1>Let’s make it yours.</h1></div>
        <ProfileForm submitLabel="Create my Sia ✨" submitting={submitting} serverError={error} onSubmit={submit} />
      </div>
    </main>
  );
}
