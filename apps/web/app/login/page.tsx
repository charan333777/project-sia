"use client";

import { PROFILE_DRAFT_KEY } from "@sia/shared";
import { profileInputSchema } from "@sia/validation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/button";
import { TextField } from "@/components/field";
import { api, ApiRequestError } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { clearProfilePhotoDraft, loadProfilePhotoDraft } from "@/lib/profile-photo-draft";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    setHasDraft(Boolean(sessionStorage.getItem(PROFILE_DRAFT_KEY)));
  }, []);

  const finish = async (accessToken: string) => {
    const rawDraft = sessionStorage.getItem(PROFILE_DRAFT_KEY);
    if (!rawDraft) { router.push("/profile"); return; }
    try {
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
      router.push("/profile?created=1");
    } catch (caught) {
      throw caught;
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
      setError(caught instanceof Error ? caught.message : "That didn’t work. Try again.");
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
          <div className="auth-tabs" role="tablist" aria-label="Account action">
            <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>Sign up</button>
            <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>Log in</button>
          </div>
        </>
      )}

      {!supabase ? (
        <p className="config-message" role="status">Authentication isn’t ready yet.</p>
      ) : message ? (
        <div className="auth-success" role="status"><span><MailCheck /></span><h2>Check your email</h2><p>{message}</p><button type="button" onClick={() => setMessage("")}>Use another email</button></div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
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
