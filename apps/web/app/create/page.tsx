"use client";

import { PROFILE_DRAFT_KEY } from "@sia/shared";
import { profileWizardDraftSchema, type ProfileWizardDraft, type ProfileInput } from "@sia/validation";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LoadingState } from "@/components/loading-state";
import { emptyProfile, ProfileForm, type ProfileFormResume, type ProfilePhotoChange } from "@/components/profile-form";
import { api, ApiRequestError } from "@/lib/api";
import { safeNextPath } from "@/lib/next-path";
import { clearProfilePhotoDraft, loadProfilePhotoDraft, saveProfilePhotoDraft, clearWizardPhotoDraft, loadWizardPhotoDraft, saveWizardPhotoDraft } from "@/lib/profile-photo-draft";

import { clearWizardDraft, readWizardDraft, saveWizardDraft } from "@/lib/profile-wizard-draft";

const USERNAME_TAKEN = { username: "That username is taken. Try another one." };

// Why someone was sent here with a Sia still to make, so the wizard explains itself instead of
// appearing out of nowhere. Keyed off the `from` the owned-profile redirect sets.
const CREATE_CONTEXT: Record<string, string> = {
  nearby: "Create your Sia first, so people nearby know who they’re meeting.",
  qr: "Create your Sia to get the QR code you can share.",
};

// After saving, return to the tool they were headed for. The path arrives in a query string, so
// it is validated as a same-site path and must not loop straight back into the wizard.
function returnPathFromParams(raw: string | null): string {
  const next = safeNextPath(raw);
  return next && !next.startsWith("/create") ? next : "/profile?created=1";
}

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
  const [storageNotice, setStorageNotice] = useState("");
  const photoQueue = useRef<Promise<void>>(Promise.resolve());
  const lastPhoto = useRef<Blob | null>(null);
  const progress = useCallback((draft: ProfileWizardDraft, change: ProfilePhotoChange) => {
    if (session) return;
    if (!saveWizardDraft(draft)) setStorageNotice("This browser can’t keep your draft. Keep this tab open until you save.");
    const photo = change.action === "upload" ? change.photo : null;
    if (photo === lastPhoto.current) return;
    lastPhoto.current = photo;
    photoQueue.current = photoQueue.current.catch(() => undefined)
      .then(() => photo ? saveWizardPhotoDraft(photo, draft.draft_id) : clearWizardPhotoDraft(draft.draft_id))
      .then(() => undefined)
      .catch(() => setStorageNotice("We couldn’t keep your photo between visits. Keep this tab open until you save."));
  }, [session]);
  const discard = async () => {
    await photoQueue.current;
    const wizardId = clearWizardDraft();
    if (wizardId) await clearWizardPhotoDraft(wizardId).catch(() => undefined);
    sessionStorage.removeItem(PROFILE_DRAFT_KEY);
    await clearProfilePhotoDraft().catch(() => undefined);
    lastPhoto.current = null;
    setError("");
    setStorageNotice("");
    setStart({ value: emptyProfile });
    setFormKey((key) => key + 1);
  };

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
      if (!raw) {
        const saved = session ? null : readWizardDraft();
        const photo = saved?.avatar_mode === "photo" ? await loadWizardPhotoDraft(saved.draft_id).catch(() => undefined) : undefined;
        if (!active) return;
        setStart(saved ? { value: saved.value, resume: { draftId: saved.draft_id, step: saved.step, photo, avatarMode: saved.avatar_mode, usernameTouched: saved.username_touched } } : { value: emptyProfile });
        return;
      }
      let value: ProfileInput = emptyProfile;
      const draftId = crypto.randomUUID();
      try {
        const parsed = profileWizardDraftSchema.safeParse({ version: 1, draft_id: draftId, step: 0, avatar_mode: "initial", username_touched: true, value: { ...emptyProfile, ...JSON.parse(raw) } });
        if (parsed.success) value = parsed.data.value;
      } catch { /* malformed handoff: start fresh */ }
      const photo = await loadProfilePhotoDraft().catch(() => undefined);
      if (!active) return;
      // Save unfinished work separately before consuming the completed handoff.
      // Only /login reads PROFILE_DRAFT_KEY, so refreshing here cannot replay it.
      if (!session) {
        saveWizardDraft({ version: 1, draft_id: draftId, step: 0, avatar_mode: photo ? "photo" : value.profile_character === "plain" ? "initial" : "character", username_touched: true, value });
        if (photo) await saveWizardPhotoDraft(photo, draftId).catch(() => undefined);
        if (!active) return;
      }
      sessionStorage.removeItem(PROFILE_DRAFT_KEY);
      if (reason === "details") setError("We couldn’t save some of those details. Check them, then try again.");
      setStart({ value, resume: { photo, draftId, errors: reason === "username" ? USERNAME_TAKEN : undefined } });

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
      try {
        await photoQueue.current;
        if (photoChange.action === "upload") await saveProfilePhotoDraft(photoChange.photo);
        else await clearProfilePhotoDraft();
        sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(profile));
      } catch {
        setError("We couldn’t keep your draft for the next step. Keep this tab open and try again.");
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
      const wizardId = clearWizardDraft();
      if (wizardId) await clearWizardPhotoDraft(wizardId).catch(() => undefined);
      await clearProfilePhotoDraft().catch(() => undefined);
      router.push(created ? returnPathFromParams(params.get("next")) : "/profile?existing=1");
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
  const contextNote = CREATE_CONTEXT[params.get("from") ?? ""];
  return (
    <main className="page-shell create-shell">
      <div className="builder-shell">
        <div className="page-intro"><span className="eyebrow">Your Sia</span><h1>Let’s make it yours.</h1><p>Three small steps. Create a free account to save it.</p></div>
        {contextNote && <p className="create-context-note">{contextNote}</p>}
        {storageNotice && <p className="form-error" role="status">{storageNotice}</p>}
        <ProfileForm key={formKey} initialValue={start.value} resume={start.resume} submitLabel="Save my Sia" checkUsername rememberProgress onProgress={progress} onDiscard={() => void discard()} submitting={submitting} serverError={error} onSubmit={submit} />
      </div>
    </main>
  );
}

export default function CreatePage() {
  return <Suspense fallback={<LoadingState label="Getting things ready…" />}><CreateContent /></Suspense>;
}
