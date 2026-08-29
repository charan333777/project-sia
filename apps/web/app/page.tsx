import { ArrowDown, CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Real people. Better first moments.</span>
            <h1>Give people a reason to say <em>hello.</em></h1>
            <p className="hero-lede">Sia is a small, personal profile that shares who you are, what you’re doing, and what you’re open to—so real conversations can start naturally.</p>
            <div className="hero-actions">
              <ButtonLink href="/create">Create your profile</ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">See how it works <ArrowDown size={17} /></ButtonLink>
            </div>
            <div className="trust-line" aria-label="Sia benefits">
              <span><CheckCircle2 size={15} /> Takes two minutes</span>
              <span><CheckCircle2 size={15} /> No app needed to scan</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Example of a Sia profile">
            <div className="hero-orbit" aria-hidden="true" />
            <article className="profile-card-mini">
              <div className="mini-top"><div className="mini-avatar">M</div><div><h2>Maya</h2><p>Product designer</p></div></div>
              <div className="mini-current"><span>Right now</span><strong>Exploring a design meetup in London</strong></div>
              <p className="mini-open">Open to</p>
              <div className="mini-chips"><span>Creative ideas</span><span>Coffee</span><span>A quick chat</span></div>
            </article>
            <div className="scan-note">Now you know what to say 👋</div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-inner">
            <div className="section-heading"><span className="eyebrow">How it works</span><h2>From a glance to a real conversation.</h2><p>A simple profile and QR code remove the awkward guesswork from approaching someone new.</p></div>
            <div className="steps">
              <article className="step"><span className="step-number">1</span><h3>Create your profile</h3><p>Share a little about who you are, your interests, and what’s happening for you right now.</p></article>
              <article className="step"><span className="step-number">2</span><h3>Share your Sia</h3><p>Get a personal profile link and QR code that opens instantly—no download or login required.</p></article>
              <article className="step"><span className="step-number">3</span><h3>Start real conversations</h3><p>People understand your context and have something meaningful with which to begin.</p></article>
            </div>
          </div>
        </section>

        <section className="home-closing">
          <span className="eyebrow">A warmer way to meet</span>
          <h2>Your next good conversation might be one hello away.</h2>
          <p>Create the small profile that makes meeting you feel a little easier.</p>
          <ButtonLink href="/create">Create your profile</ButtonLink>
        </section>
      </main>
      <Footer />
    </>
  );
}
