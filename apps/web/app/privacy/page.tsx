import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { profileDeletionGraceDays } from "@sia/validation";
import { legalConfig, legalDetailsComplete } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Sia collects, why, how long it is kept, and how to have it erased.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <article className="legal-shell">
        <div className="page-intro">
          <span className="eyebrow">Privacy</span>
          <h1>What Sia knows about you.</h1>
          <p className="legal-updated">Last updated {legalConfig.lastUpdated}</p>
        </div>

        {!legalDetailsComplete && (
          <p className="legal-draft" role="note">
            <AlertTriangle size={16} aria-hidden="true" />
            This policy is not yet complete: the controller and contact details below are placeholders.
          </p>
        )}

        <section>
          <h2>Who is responsible</h2>
          <p>
            {legalConfig.controllerName} is the data controller for Sia ({legalConfig.controllerAddress}).
            For anything on this page, including erasure requests, contact {legalConfig.contactEmail}.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <p>Only what the product needs to work. There is no advertising, profiling or third-party analytics.</p>
          <ul>
            <li><strong>Your account.</strong> Email address and password, handled by our authentication provider. If you sign in with Google we receive your email address, not your Google password.</li>
            <li><strong>Your profile.</strong> Whatever you put in it: name, username, what you do, a short bio, interests, what you are open to, a colour and character, optionally a photo, and optionally contact details.</li>
            <li><strong>Contact details you add.</strong> Links, email addresses and phone numbers. Each one is private until you mark it public — see below.</li>
            <li><strong>Location, only if you turn on Nearby.</strong> Off by default.</li>
            <li><strong>How often your profile is opened.</strong> A count per day, and nothing else.</li>
          </ul>
        </section>

        <section>
          <h2>What is public, and what is not</h2>
          <p>
            A profile is private until you make it public. Making a profile public does not publish your contact
            details: every link, email address and phone number is hidden until you publish it individually.
          </p>
          <p>
            Details you have not published are removed on the server before a profile is sent to anyone. They do not
            appear in the page, its source, its preview image, or a saved contact card.
          </p>
          <p>
            Search engines are told not to index your profile unless you have asked to be listed, which is a separate
            choice and is off by default.
          </p>
        </section>

        <section>
          <h2>Location and Nearby</h2>
          <p>
            Nearby is off unless you turn it on, and it expires by itself. While it is on, your device sends its
            coordinates to us so we can find people near you. We never share your coordinates, your exact distance, or
            your exact direction with anyone — other people see only a rough distance band and one of eight compass
            sectors.
          </p>
          <p>
            Location data, waves, connections and meeting plans are deleted automatically when they expire. Blocks and
            reports are kept, because they protect other people.
          </p>
        </section>

        <section>
          <h2>How long we keep things</h2>
          <ul>
            <li><strong>Your profile:</strong> until you delete it.</li>
            <li><strong>After you delete:</strong> hidden immediately, then erased permanently after {profileDeletionGraceDays} days. Your username is retired and never reissued, so cards you have handed out never lead to a stranger.</li>
            <li><strong>Nearby data:</strong> deleted automatically when it expires.</li>
            <li><strong>Blocks and reports:</strong> kept for safety.</li>
          </ul>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            You can see, correct, export or erase your data. Editing your profile covers correction; deleting your Sia
            covers erasure. For access or a copy, write to {legalConfig.contactEmail}.
          </p>
          <p>
            If you are in the UK or EU you may also complain to a supervisory authority — in the UK, the{" "}
            {legalConfig.supervisoryAuthority}.
          </p>
        </section>

        <section>
          <h2>Who else sees your data</h2>
          <p>
            We use service providers to run Sia: hosting, database and file storage, authentication, and email delivery.
            They process data on our instructions only. We do not sell your data, and there are no advertising or
            analytics trackers on this site.
          </p>
        </section>
      </article>
    </main>
  );
}
