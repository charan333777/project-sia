"use client";

import { PROFILE_DRAFT_KEY } from "@sia/shared";
import { profileInputSchema } from "@sia/validation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/button";
import { TextField } from "@/components/field";
import { api, ApiRequestError } from "@/lib/api";
import { classifyHandoffError, handoffErrorMessage, type HandoffOutcome } from "@/lib/profile-handoff";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { clearProfilePhotoDraft, loadProfilePhotoDraft } from "@/lib/profile-photo-draft";

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#fbbc05" d="M6.4 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.32-1.93V7.45H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.55l3.34-2.62Z" />
      <path fill="#ea4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.45l3.34 2.62C7.19 7.7 9.4 5.94 12 5.94Z" />
    </svg>
  );
}

/**
 * Supabase's own wording leaks library shapes ("AuthApiError", "invalid_grant") into a screen
 * people meet before they trust the product. Known cases get our words; anything unrecognised
 * falls back to a plain sentence rather than the raw message.
 */
function friendlyAuthError(caught: unknown) {
  const raw = caught instanceof Error ? caught.message : "";
  const text = raw.toLowerCase();
  if (text.includes("invalid login credentials")) return "That email and password don’t match. Try again, or reset your password.";
  if (text.includes("email not confirmed")) return "Confirm your email first — check your inbox for the link.";
  if (text.includes("user already registered") || text.includes("already been registered")) return "There’s already an account with that email. Log in instead.";
  if (text.includes("password should be at least")) return "Use a password of at least 6 characters.";
  if (text.includes("unable to validate email") || text.includes("invalid email")) return "That email address doesn’t look right.";
  if (text.includes("rate limit") || text.includes("too many")) return "Too many attempts. Wait a minute, then try again.";
  if (text.includes("failed to fetch") || text.includes("networkerror")) return "We couldn’t reach Sia. Check your connection and try again.";
  return "That didn’t work. Try again in a moment.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading, signOut } = useAuth();
  const finishingRef = useRef(false);
  const [mode, setMode] = useState<"signup" | "login">(searchParams.get("from") === "create" ? "signup" : "login");
  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const supabase = getSupabaseBrowserClient();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");

  /** Lets the draft go for good — once it has been saved, or once it never can be. */
  const discardDraft = useCallback(async () => {
    sessionStorage.removeItem(PROFILE_DRAFT_KEY);
    setHasDraft(false);
    await clearProfilePhotoDraft().catch(() => undefined);
  }, []);

  /**
   * The profile is already saved by the time this runs, so the photo is an optional
   * extra: neither a blocked IndexedDB nor a rejected upload may cost someone the
   * profile itself. Returns a sentence to show when the photo did not make it.
   */
  const attachDraftPhoto = useCallback(async (accessToken: string) => {
    let photo: Blob | undefined;
    try {
      photo = await loadProfilePhotoDraft();
    } catch {
      return "We couldn’t read the photo you chose.";
    }
    if (!photo) return null;
    try {
      await api.uploadProfilePhoto(photo, accessToken);
      return null;
    } catch (caught) {
      return handoffErrorMessage(caught);
    }
  }, []);

  const finish = useCallback(async (accessToken: string) => {
    if (finishingRef.current) return null;
    finishingRef.current = true;
    try {
      const rawDraft = sessionStorage.getItem(PROFILE_DRAFT_KEY);
      if (!rawDraft) { router.replace("/profile"); return null; }
      const draft = profileInputSchema.parse(JSON.parse(rawDraft));
      try {
        await api.createProfile(draft, accessToken);
      } catch (caught) {
        if (!(caught instanceof ApiRequestError && caught.code === "PROFILE_EXISTS")) throw caught;
      }
      const photoProblem = await attachDraftPhoto(accessToken);
      await discardDraft();
      if (!photoProblem) router.replace("/profile?created=1");
      return photoProblem;
    } catch (caught) {
      finishingRef.current = false;
      throw caught;
    }
  }, [attachDraftPhoto, discardDraft, router]);

  useEffect(() => {
    setHasDraft(Boolean(sessionStorage.getItem(PROFILE_DRAFT_KEY)));
  }, []);

  // `partial` is a success with a caveat: the profile is saved, the photo is not.
  const [handoff, setHandoff] = useState<{ kind: HandoffOutcome | "partial"; message: string } | null>(null);

  const runHandoff = useCallback(async (accessToken: string) => {
    setLoading(true); setError(""); setMessage(""); setHandoff(null);
    let token = accessToken;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const photoProblem = await finish(token);
        if (photoProblem) setHandoff({ kind: "partial", message: photoProblem });
        break;
      } catch (caught) {
        const outcome = classifyHandoffError(caught);
        // A dead access token is worth exactly one silent refresh. Retrying with the
        // same one is what turned this screen into a loop nobody could leave.
        if (outcome === "reauth" && attempt === 0 && supabase) {
          const refreshed = await supabase.auth.refreshSession().catch(() => null);
          const nextToken = refreshed?.data.session?.access_token;
          if (nextToken) { token = nextToken; continue; }
        }
        // Nothing about this draft can succeed on a retry, so let it go rather than
        // leave someone to meet the same error on every visit to this page.
        if (outcome === "terminal") await discardDraft();
        setHandoff({ kind: outcome, message: handoffErrorMessage(caught) });
        break;
      }
    }
    setLoading(false);
  }, [discardDraft, finish, supabase]);

  useEffect(() => {
    if (authLoading || !session || finishingRef.current || handoff) return;
    void runHandoff(session.access_token);
  }, [authLoading, handoff, runHandoff, session]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${siteUrl}/login` },
      });
      if (result.error) throw result.error;
    } catch (caught) {
      setError(friendlyAuthError(caught));
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true); setError(""); setMessage("");
    try {
      if (forgot) {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/reset-password` });
        if (result.error) throw result.error;
        setMessage("Open the link we sent to your email.");
        return;
      }
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl}/login` } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) { await runHandoff(result.data.session.access_token); return; }
      setMessage("Confirm your email, then come back here. Your Sia is safe.");
    } catch (caught) {
      setError(friendlyAuthError(caught));
    } finally { setLoading(false); }
  };

  const resendConfirmation = async () => {
    if (!supabase || !email) return;
    setLoading(true); setError("");
    try {
      const result = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${siteUrl}/login` } });
      if (result.error) throw result.error;
      setMessage("Sent again — check your inbox.");
    } catch (caught) {
      setError(friendlyAuthError(caught));
    } finally { setLoading(false); }
  };

  const switchMode = (nextMode: "signup" | "login") => {
    setMode(nextMode); setForgot(false); setError(""); setMessage("");
  };

  return (
    <div className="auth-card">
      {forgot ? (
        <>
          <button type="button" className="auth-back" onClick={() => setForgot(false)}><ArrowLeft size={16} /> Back</button>
          <span className="eyebrow">Password reset</span>
          <h1>Check your inbox.</h1>
          <p>We’ll send one secure link.</p>
        </>
      ) : (
        <>
          <span className="eyebrow">{hasDraft ? "One last step" : mode === "signup" ? "Join Sia" : "Welcome back"}</span>
          <h1>{hasDraft ? "Save your Sia." : mode === "signup" ? "Create your space." : "Good to see you."}</h1>
          <p>{hasDraft ? "So it always belongs to you." : mode === "signup" ? "A small place that feels like you." : "Your Sia is waiting."}</p>
          <div className="auth-tabs" role="group" aria-label="Account action">
            <button type="button" aria-pressed={mode === "signup"} onClick={() => switchMode("signup")}>Sign up</button>
            <button type="button" aria-pressed={mode === "login"} onClick={() => switchMode("login")}>Log in</button>
          </div>
        </>
      )}

      {!supabase ? (
        <p className="config-message" role="status">Authentication isn’t ready yet.</p>
      ) : handoff && session ? (
        <div className="auth-success" role="status">
          <span><MailCheck /></span>
          {handoff.kind === "partial" ? (
            <>
              <h2>Your Sia is saved</h2>
              <p>We couldn’t add your photo. {handoff.message} You can add it any time from Edit.</p>
              <Button type="button" onClick={() => router.replace("/profile?created=1")}>Continue <ArrowRight size={17} /></Button>
            </>
          ) : handoff.kind === "reauth" ? (
            <>
              <h2>Please log in again</h2>
              <p>Your session ran out before we could finish. {handoff.message} Your Sia is still safe.</p>
              <Button type="button" loading={loading} onClick={() => void signOut().then(() => setHandoff(null))}>Log in again <ArrowRight size={17} /></Button>
            </>
          ) : handoff.kind === "terminal" ? (
            <>
              <h2>We couldn’t save those details</h2>
              <p>{handoff.message} We have stopped trying, so this will not greet you again — open your Sia and edit it there.</p>
              <Button type="button" onClick={() => router.replace("/profile")}>Continue <ArrowRight size={17} /></Button>
            </>
          ) : (
            <>
              <h2>Almost there</h2>
              <p>You’re signed in, but we couldn’t finish setting up your Sia. {handoff.message}</p>
              <Button type="button" loading={loading} onClick={() => void runHandoff(session.access_token)}>Try again <ArrowRight size={17} /></Button>
              <button type="button" onClick={() => { void discardDraft(); router.replace("/profile"); }}>Continue without it</button>
            </>
          )}
        </div>
      ) : message ? (
        <div className="auth-success" role="status">
          <span><MailCheck /></span>
          <h2>Check your email</h2>
          <p>{message}</p>
          {mode === "signup" && !forgot && (
            <button type="button" onClick={() => void resendConfirmation()} disabled={loading}>Didn’t arrive? Send it again</button>
          )}
          <button type="button" onClick={() => { setMessage(""); setError(""); }}>Use another email</button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          {!forgot && (
            <>
              <Button type="button" variant="secondary" className="google-auth-button" loading={loading} onClick={() => void signInWithGoogle()}>
                <GoogleMark /> Continue with Google
              </Button>
              <div className="auth-divider"><span>or continue with email</span></div>
            </>
          )}
          <TextField id="email" label="Email" type="email" autoComplete="email" required value={email} placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} />
          {!forgot && (
            <div className="password-field">
              <TextField id="password" label="Password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} placeholder="At least 6 characters" onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {!forgot && mode === "login" && <button type="button" className="forgot-link" onClick={() => { setForgot(true); setError(""); }}>Forgot password?</button>}
          <Button type="submit" loading={loading}>{forgot ? <>Send link <ArrowRight size={17} /></> : mode === "signup" ? <>Create account <ArrowRight size={17} /></> : <>Log in <ArrowRight size={17} /></>}</Button>
        </form>
      )}
      {!forgot && !hasDraft && <p className="auth-note">No Sia yet? <Link href="/create">Create yours</Link></p>}
    </div>
  );
}

export default function LoginPage() {
  return <main className="auth-shell"><Suspense fallback={<div className="auth-card">Loading…</div>}><LoginForm /></Suspense></main>;
}
