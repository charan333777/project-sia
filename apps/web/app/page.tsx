import { ArrowDown, ArrowRight, EyeOff, MapPin, MessageCircleHeart, QrCode, Radar, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { Footer } from "@/components/footer";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    locale: "en_GB",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Sia — Make hello easier" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
};

const faqItems = [
  {
    question: "What is a Sia profile?",
    answer: "A Sia is a lightweight personal profile that shows who you are, what you are interested in and what you are open to right now.",
  },
  {
    question: "Does someone need an app to view my profile?",
    answer: "No. Anyone can scan your personal QR code and open your public Sia profile in their phone browser.",
  },
  {
    question: "Can I keep my profile private?",
    answer: "Yes. New profiles are private by default, and you choose when your Sia becomes publicly shareable.",
  },
  {
    question: "Does Nearby show my exact location?",
    answer: "No. Nearby is opt-in and shares only an approximate distance band and general direction while you choose to be visible.",
  },
] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${absoluteUrl()}#organization`,
      name: siteConfig.name,
      url: absoluteUrl(),
      logo: absoluteUrl("/icon.svg"),
    },
    {
      "@type": "WebSite",
      "@id": `${absoluteUrl()}#website`,
      name: siteConfig.name,
      url: absoluteUrl(),
      description: siteConfig.description,
      inLanguage: "en-GB",
      publisher: { "@id": `${absoluteUrl()}#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      url: absoluteUrl(),
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Personal profiles for real-life connections</span>
            <h1>Make <em>hello</em> easier.</h1>
            <p className="hero-lede">Meet people more naturally with Sia. Connect nearby, introduce yourself your way and make conversations easier.</p>
            <div className="hero-actions" data-nosnippet="">
              <ButtonLink href="/create">Create mine <ArrowRight size={18} /></ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">See how <ArrowDown size={17} /></ButtonLink>
            </div>
            <div className="trust-line" aria-label="Sia benefits" data-nosnippet="">
              <span>2 min</span>
              <span aria-hidden="true">·</span>
              <span>No app to scan</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Example of a Sia profile" data-nosnippet="">
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
              <article className="step"><span className="step-icon"><UserRound /></span><span className="step-number">01</span><h3>You</h3><p>Build a lightweight profile with your interests and what you’re open to.</p></article>
              <article className="step"><span className="step-icon"><QrCode /></span><span className="step-number">02</span><h3>Share</h3><p>Share your link or let someone scan your personal QR code—no app needed.</p></article>
              <article className="step"><span className="step-icon"><MessageCircleHeart /></span><span className="step-number">03</span><h3>Hello</h3><p>Give new people an easy, natural way to start a conversation.</p></article>
            </div>
            <div className="home-inline-cta"><span>Ready?</span><ButtonLink href="/create" variant="quiet">Create mine <ArrowRight size={17} /></ButtonLink></div>
          </div>
        </section>

        <section className="faq-section" aria-labelledby="faq-heading">
          <div className="section-inner">
            <div className="section-heading"><span className="eyebrow">Good to know</span><h2 id="faq-heading">Your questions, answered.</h2></div>
            <div className="faq-grid">
              {faqItems.map((item) => (
                <article className="faq-item" key={item.question}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
