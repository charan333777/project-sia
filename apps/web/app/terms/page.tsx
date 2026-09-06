import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { profileDeletionGraceDays } from "@sia/validation";
import { legalConfig, legalDetailsComplete } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Sia.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="page-shell">
      <article className="legal-shell">
        <div className="page-intro">
          <span className="eyebrow">Terms</span>
          <h1>Using Sia.</h1>
          <p className="legal-updated">Last updated {legalConfig.lastUpdated}</p>
        </div>

        {!legalDetailsComplete && (
          <p className="legal-draft" role="note">
            <AlertTriangle size={16} aria-hidden="true" />
            These terms are not yet complete: the operator and governing-law details below are placeholders.
          </p>
        )}

        <section>
          <h2>Who provides Sia</h2>
          <p>
            Sia is provided by {legalConfig.controllerName} ({legalConfig.controllerAddress}). Questions about these
            terms go to {legalConfig.contactEmail}.
          </p>
        </section>

        <section>
          <h2>Your account</h2>
          <p>
            You need an account to have a profile, and you must be old enough to agree to these terms where you live.
            One person, one profile. Keep your password to yourself — anything done with your account is treated as
            done by you.
          </p>
        </section>

        <section>
          <h2>What you publish</h2>
          <p>
            Your profile is yours, and so is responsibility for it. Only publish contact details that are actually
            yours to share, and only publish them if you are willing for anyone holding your link to see them.
          </p>
          <p>Do not use Sia to impersonate someone, harass anyone, publish another person&rsquo;s details without their
            agreement, or link to anything unlawful or malicious. We may remove a profile that does.</p>
        </section>

        <section>
          <h2>Meeting people</h2>
          <p>
            Sia helps introductions happen; it does not vet anybody. We do not verify identity, and a profile is only
            ever what its owner typed. Use your judgement when meeting someone, and meet in public places.
            Arrangements you make are between you and the other person.
          </p>
        </section>

        <section>
          <h2>Availability</h2>
          <p>
            We try to keep Sia working, but it is provided as it is, without guarantees of availability. Features may
            change or be withdrawn. Nothing here excludes liability that cannot lawfully be excluded.
          </p>
        </section>

        <section>
          <h2>Ending it</h2>
          <p>
            You can delete your Sia at any time from your profile. It stops working immediately and is erased
            permanently after {profileDeletionGraceDays} days; within that window you can restore it by logging back
            in. Your username is retired permanently and is never given to anyone else.
          </p>
          <p>We may suspend or remove an account that breaks these terms.</p>
        </section>

        <section>
          <h2>Governing law</h2>
          <p>These terms are governed by the law of {legalConfig.governingLaw}.</p>
        </section>
      </article>
    </main>
  );
}
