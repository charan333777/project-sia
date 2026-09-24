"use client";

import { PROFILE_DRAFT_KEY } from "@sia/shared";
import type { ProfileInput } from "@sia/validation";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LoadingState } from "@/components/loading-state";
import { emptyProfile, ProfileForm, type ProfileFormResume, type ProfilePhotoChange } from "@/components/profile-form";
import { api, ApiRequestError } from "@/lib/api";
import { clearProfilePhotoDraft, loadProfilePhotoDraft, saveProfilePhotoDraft } from "@/lib/profile-photo-draft";

const USERNAME_TAKEN = { username: "That username is taken. Try another one." };

type Start = { value: ProfileInput; resume?: ProfileFormResume };

function CreateContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [start, setStart] = useState<Start | null>(null);
  // Bumped to reopen the wizard on a new starting point, such as a username the API refused.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (authLoading || start) return;
    let active = true;
    const prepare = async () => {
      if (session) {
        // One account holds one Sia. Walking someone through every step only to meet
        // PROFILE_EXISTS at the end wastes all of it, so they go to the one they have.
        const outcome = await api.getMyProfile(session.access_token).then(
          () => "exists" as const,
          (caught) => caught instanceof ApiRequestError && caught.code === "PROFILE_NOT_FOUND" ? "missing" as const : "unknown" as const,
        );
        if (!active) return;
        if (outcome === "exists") { router.replace("/profile"); return; }
        if (outcome === "missing") {
          const pending = await api.getPendingDeletion(session.access_token).catch(() => null);
          if (!active) return;
          if (pending) { router.replace("/profile/deleted"); return; }
        }
      }
      // `/login` sends a draft back here rather than throwing it away when it could not be
      // saved, and "Back to edit" does the same before sign-up.
      const reason = params.get("resume");
      const raw = reason ? sessionStorage.getItem(PROFILE_DRAFT_KEY) : null;
      if (!raw) { setStart({ value: emptyProfile }); return; }
      let value: ProfileInput = emptyProfile;
      try { value = { ...emptyProfile, ...(JSON.parse(raw) as Partial<ProfileInput>) }; } catch { /* start fresh */ }
      const photo = await loadProfilePhotoDraft().catch(() => undefined);
      if (!active) return;
      // The form holds the draft from here on. Left in storage while signed in, `/login`
      // would replay it on every later visit. Removed only now, once nothing can cancel the
      // hand-over, so an interrupted run leaves it for the next one to pick up.
      sessionStorage.removeItem(PROFILE_DRAFT_KEY);
      if (reason === "details") setError("We couldn’t save some of those details. Check them, then try again.");
      setStart({ value, resume: { photo, errors: reason === "username" ? USERNAME_TAKEN : undefined } });
    };
    void prepare();
    return () => { active = false; };
  }, [authLoading, params, router, session, start]);

  const submit = async (profile: ProfileInput, photoChange: ProfilePhotoChange) => {
    setSubmitting(true);
    setError("");
    if (!session) {
      // A draft exists only to survive the trip through authentication. Writing one while
      // signed in leaves a copy behind that `/login` replays on every later visit, which
      // is how a single failure here became an error nobody could get past.
      sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(profile));
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
      let created = true;
      try {
        await api.createProfile(profile, session.access_token);
      } catch (caught) {
        if (!(caught instanceof ApiRequestError && caught.code === "PROFILE_EXISTS")) throw caught;
        created = false;
      }
      // Never replace the photo on a Sia this wizard did not create.
      if (created && photoChange.action === "upload") await api.uploadProfilePhoto(photoChange.photo, session.access_token);
      sessionStorage.removeItem(PROFILE_DRAFT_KEY);
      await clearProfilePhotoDraft().catch(() => undefined);
      router.push(created ? "/profile?created=1" : "/profile?existing=1");
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code === "USERNAME_TAKEN") {
        // Back to the username with everything else kept, rather than a message at the
        // bottom of the last step.
        setStart({ value: profile, resume: { photo: photoChange.action === "upload" ? photoChange.photo : undefined, errors: USERNAME_TAKEN } });
        setFormKey((key) => key + 1);
      } else {
        setError(caught instanceof Error ? caught.message : "We couldn’t create your profile. Please try again.");
      }
      setSubmitting(false);
    }
  };

  if (!start) return <LoadingState label="Getting things ready…" />;
  return (
    <main className="page-shell create-shell">
      <div className="builder-shell">
        <div className="page-intro"><span className="eyebrow">Your Sia</span><h1>Let’s make it yours.</h1></div>
        <ProfileForm key={formKey} initialValue={start.value} resume={start.resume} submitLabel="Create my Sia ✨" submitting={submitting} serverError={error} onSubmit={submit} />
      </div>
    </main>
  );
}

export default function CreatePage() {
  return <Suspense fallback={<LoadingState label="Getting things ready…" />}><CreateContent /></Suspense>;
}
