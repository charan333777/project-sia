import type { Metadata } from "next";
import Link from "next/link";
import { legalConfig, legalContactAvailable } from "@/lib/legal";

export const metadata: Metadata = { title: "Contact Sia", description: "Get help with your Sia or ask about your data.", alternates: { canonical: "/contact" } };
export default function ContactPage() {
  return <main className="page-shell"><article className="legal-shell">
    <div className="page-intro"><span className="eyebrow">Contact</span><h1>A little help with your Sia.</h1><p>Questions about your profile, privacy or an encounter?</p></div>
    {legalContactAvailable ? <p>Email <a href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a>. For privacy requests, tell us which Sia is yours. Never send a password or access token.</p> : <p role="note">Sia’s support email is being set up. A direct contact address will appear here once it is provided.</p>}
    <h2>Manage your profile</h2><p><Link href="/profile/edit">Edit your Sia</Link> to update details or visibility. Account deletion is available from your profile settings.</p>
    <h2>Nearby safety</h2><p>Open the person’s Nearby card to block or report them. Choose a public place when meeting someone.</p>
    <p><Link href="/privacy">Privacy details</Link> · <Link href="/terms">Terms</Link></p>
  </article></main>;
}
