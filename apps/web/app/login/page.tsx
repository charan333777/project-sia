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
  const { session, loading: authLoading } = useAuth();
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

  const finish = useCallback(async (accessToken: string) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      const rawDraft = sessionStorage.getItem(PROFILE_DRAFT_KEY);
      if (!rawDraft) { router.replace("/profile"); return; }
      const draft = profileInputSchema.parse(JSON.parse(rawDraft));
      try {
        await api.createProfile(draft, accessToken);
      } catch (caught) {
        if (!(caught instanceof ApiRequestError && caught.code === "PROFILE_EXISTS")) throw caught;
      }
      const draftPhoto = await loadProfilePhotoDraft();
      if (draftPhoto) await api.uploadProfilePhoto(draftPhoto, accessToken);
      sessionStorage.removeItem(PROFILE_DRAFT_KEY);
      await clearProfilePhotoDraft().catch(() => undefined);
      router.replace("/profile?created=1");
    } catch (caught) {
      finishingRef.current = false;
      throw caught;
    }
  }, [router]);

  useEffect(() => {
    setHasDraft(Boolean(sessionStorage.getItem(PROFILE_DRAFT_KEY)));
  }, []);

  const [handoffFailed, setHandoffFailed] = useState(false);

  const runHandoff = useCallback((accessToken: string) => {
    setLoading(true); setError(""); setMessage(""); setHandoffFailed(false);
    void finish(accessToken)
      .catch((caught) => {
        setError(friendlyAuthError(caught));
        // The session is real even though the hand-off failed, so offer a way forward
        // instead of leaving someone signed in and stuck looking at an error.
        setHandoffFailed(true);
      })
      .finally(() => setLoading(false));
  }, [finish]);

  useEffect(() => {
    if (authLoading || !session || finishingRef.current || handoffFailed) return;
    runHandoff(session.access_token);
  }, [authLoading, handoffFailed, runHandoff, session]);

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
      if (result.data.session) await finish(result.data.session.access_token);
      else setMessage("Confirm your email, then come back here. Your Sia is safe.");
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
      ) : handoffFailed && session ? (
        <div className="auth-success" role="status">
          <span><MailCheck /></span>
          <h2>Almost there</h2>
          <p>You’re signed in, but we couldn’t finish setting up your Sia. {error}</p>
          <Button type="button" loading={loading} onClick={() => runHandoff(session.access_token)}>Try again <ArrowRight size={17} /></Button>
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
