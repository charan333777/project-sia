"use client";

import { PROFILE_DRAFT_KEY } from "@sia/shared";
import { profileInputSchema } from "@sia/validation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/button";
import { TextField } from "@/components/field";
import { api, ApiRequestError } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signup" | "login">(searchParams.get("from") === "create" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = getSupabaseBrowserClient();
  const hasDraft = typeof window !== "undefined" && Boolean(sessionStorage.getItem(PROFILE_DRAFT_KEY));

  const finish = async (accessToken: string) => {
    const rawDraft = sessionStorage.getItem(PROFILE_DRAFT_KEY);
    if (!rawDraft) { router.push("/profile"); return; }
    try {
      const draft = profileInputSchema.parse(JSON.parse(rawDraft));
      await api.createProfile(draft, accessToken);
      sessionStorage.removeItem(PROFILE_DRAFT_KEY);
      router.push("/profile?created=1");
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code === "PROFILE_EXISTS") {
        sessionStorage.removeItem(PROFILE_DRAFT_KEY);
        router.push("/profile");
        return;
      }
      throw caught;
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) await finish(result.data.session.access_token);
      else setMessage("Check your email to confirm your account, then return here to log in. Your profile draft is safe on this device.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <span className="eyebrow">{hasDraft ? "One last step" : "Welcome back"}</span>
      <h1>{hasDraft ? "Save your Sia." : "Good to see you."}</h1>
      <p>{hasDraft ? "Create an account so your profile belongs securely to you." : "Log in to view and update your profile."}</p>
      <div className="auth-tabs" role="tablist" aria-label="Account action">
        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>Create account</button>
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>Log in</button>
      </div>
      {!supabase ? (
        <p className="config-message" role="status">Supabase isn’t configured yet. Add the browser-safe URL and anon key from <code>.env.example</code> to start authentication.</p>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <TextField id="email" label="Email" type="email" autoComplete="email" required value={email} placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} />
          <TextField id="password" label="Password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} placeholder="At least 6 characters" onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="status-message" role="status">{message}</p>}
          <Button type="submit" loading={loading}>{mode === "signup" ? "Create account and save" : "Log in"}</Button>
        </form>
      )}
      <p className="auth-note">No profile yet? <Link href="/create">Create yours first</Link>.</p>
    </div>
  );
}

export default function LoginPage() {
  return <main className="auth-shell"><Suspense fallback={<div className="auth-card">Loading…</div>}><LoginForm /></Suspense></main>;
}
