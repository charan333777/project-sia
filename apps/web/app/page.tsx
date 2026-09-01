import { ArrowDown, ArrowRight, EyeOff, MapPin, MessageCircleHeart, QrCode, Radar, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">For real-life moments</span>
            <h1>Make <em>hello</em> easier.</h1>
            <p className="hero-lede">A small profile that helps people know you.</p>
            <div className="hero-actions">
              <ButtonLink href="/create">Create mine <ArrowRight size={18} /></ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">See how <ArrowDown size={17} /></ButtonLink>
            </div>
            <div className="trust-line" aria-label="Sia benefits">
              <span>2 min</span>
              <span aria-hidden="true">·</span>
              <span>No app to scan</span>
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
            <div className="scan-note">Say hello 👋</div>
          </div>
        </section>

        <section className="nearby-teaser-section" aria-labelledby="nearby-teaser-heading">
          <div className="nearby-teaser-inner">
            <div className="nearby-teaser-copy">
              <span className="eyebrow">Nearby</span>
              <h2 id="nearby-teaser-heading">See who’s open.</h2>
              <p>Only when they choose.</p>
              <ButtonLink href="/nearby">Explore <ArrowRight size={18} /></ButtonLink>
              <span className="nearby-teaser-privacy"><EyeOff size={15} /> Hidden first</span>
            </div>
            <div className="nearby-teaser-visual" aria-label="Preview of three people nearby">
              <span className="teaser-radius teaser-radius-large" />
              <span className="teaser-radius teaser-radius-small" />
              <span className="teaser-person teaser-person-one">M</span>
              <span className="teaser-person teaser-person-two">L</span>
              <span className="teaser-person teaser-person-three">N</span>
              <span className="teaser-you"><MapPin size={19} /><small>You</small></span>
              <span className="teaser-count"><Radar size={16} /> 3 here now</span>
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-inner">
            <div className="section-heading"><span className="eyebrow">Three small steps</span><h2>You. QR. Hello.</h2></div>
            <div className="steps">
              <article className="step"><span className="step-icon"><UserRound /></span><span className="step-number">01</span><h3>You</h3><p>Show who you are.</p></article>
              <article className="step"><span className="step-icon"><QrCode /></span><span className="step-number">02</span><h3>Share</h3><p>Let people scan.</p></article>
              <article className="step"><span className="step-icon"><MessageCircleHeart /></span><span className="step-number">03</span><h3>Hello</h3><p>Start naturally.</p></article>
            </div>
            <div className="home-inline-cta"><span>Ready?</span><ButtonLink href="/create" variant="quiet">Create mine <ArrowRight size={17} /></ButtonLink></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
