"use client";

import { profileDeletionGraceDays } from "@sia/validation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, ButtonLink } from "@/components/button";
import { LoadingState } from "@/components/loading-state";
import { api } from "@/lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Where someone lands after deleting, and where they return if they log back in during
 * the grace window. Restoring is offered plainly rather than hidden, because the whole
 * point of a soft delete is that a misclick is recoverable.
 */
export default function DeletedProfilePage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [pending, setPending] = useState<{ purges_at: string; restorable: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!session) { setLoading(false); return; }
    void api
      .getPendingDeletion(session.access_token)
      .then(setPending)
      .catch(() => setError("We couldn’t check your Sia. Try again in a moment."))
      .finally(() => setLoading(false));
  }, [authLoading, session]);

  if (authLoading || loading) return <LoadingState label="Checking your Sia…" />;

  const restore = async () => {
    if (!session) return;
    setRestoring(true); setError("");
    try {
      await api.restoreProfile(session.access_token);
      router.replace("/profile");
    } catch {
      setError("We couldn’t restore your Sia. Try again.");
      setRestoring(false);
    }
  };

  return (
    <main className="empty-state">
      <div>
        <span className="empty-symbol"><CheckCircle2 /></span>
        <h1>Your Sia is deleted.</h1>
        {pending?.restorable ? (
          <>
            <p>
              Your link and QR code have stopped working. Nothing is published any more.
              We’ll erase everything permanently on {formatDate(pending.purges_at)} — until then you can bring it back
              exactly as it was.
            </p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="button" loading={restoring} onClick={() => void restore()}>
              <RotateCcw size={17} /> Restore my Sia
            </Button>
          </>
        ) : (
          <>
            <p>
              Your link and QR code have stopped working, and nothing is published any more.
              Everything is erased within {profileDeletionGraceDays} days.
            </p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <ButtonLink href="/create">Start a new Sia</ButtonLink>
          </>
        )}
      </div>
    </main>
  );
}
