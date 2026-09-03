"use client";

import type { ProfileInput } from "@sia/validation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingState } from "@/components/loading-state";
import { EditProfileForm, type ProfilePhotoChange } from "@/components/profile-form";
import { useOwnedProfile } from "@/hooks/use-owned-profile";
import { api } from "@/lib/api";

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, loading, error, session } = useOwnedProfile();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  if (loading) return <LoadingState label="Opening your profile…" />;
  if (error || !profile || !session) return <div className="empty-state"><div><h1>We hit a snag.</h1><p>{error}</p></div></div>;

  const submit = async (input: ProfileInput, photoChange: ProfilePhotoChange) => {
    setSubmitting(true); setServerError("");
    try {
      await api.updateProfile(input, session.access_token);
      if (photoChange.action === "upload") await api.uploadProfilePhoto(photoChange.photo, session.access_token);
      if (photoChange.action === "remove") await api.removeProfilePhoto(session.access_token);
      router.push("/profile");
    } catch (caught) {
      setServerError(caught instanceof Error ? caught.message : "We couldn’t save your changes.");
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="narrow-shell">
        <div className="page-intro"><span className="eyebrow">Keep it current</span><h1>Edit your Sia.</h1></div>
        <EditProfileForm initialValue={profile} submitting={submitting} serverError={serverError} onSubmit={submit} />
      </div>
    </main>
  );
}
