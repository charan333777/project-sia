"use client";

import { Check, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/button";
import { TextField } from "@/components/field";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true); setError("");
    const result = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    router.push("/profile");
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="auth-symbol"><LockKeyhole /></span>
        <span className="eyebrow">Almost there</span>
        <h1>New password.</h1>
        <p>Choose something only you know.</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="password-field"><TextField id="new-password" label="Password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} required value={password} placeholder="At least 6 characters" onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" loading={loading}><Check size={17} /> Save password</Button>
        </form>
      </div>
    </main>
  );
}
