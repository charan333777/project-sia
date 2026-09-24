import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  EyeOff,
  GraduationCap,
  Laptop,
  MapPin,
  MessageCircleHeart,
  PartyPopper,
  Plane,
  Presentation,
  QrCode,
  Radar,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { Footer } from "@/components/footer";
import { HeroQr } from "@/components/hero-qr";
import { HomeCta } from "@/components/home-cta";
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

// Where a code actually changes hands, so a visitor can picture their own version of it.
const moments = [
  { label: "Meetups", icon: UsersRound },
  { label: "Conferences", icon: Presentation },
  { label: "Campus", icon: GraduationCap },
  { label: "Coworking", icon: Laptop },
  { label: "Travel", icon: Plane },
  { label: "Parties", icon: PartyPopper },
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
            <span className="eyebrow">Your profile, one scan away</span>
            <h1>Make <em>hello</em> easier.</h1>
            {/* The headline and this line are the pitch Sia is introduced with at meetups — keep
                the site saying what people have already heard out loud. */}
            <p className="hero-lede">Sia makes the first conversation more meaningful. One scan shows who you are and what you’re open to right now.</p>
            <div className="hero-actions" data-nosnippet="">
              <HomeCta />
              <ButtonLink href="#how-it-works" variant="secondary">See how <ArrowDown size={17} /></ButtonLink>
            </div>
            <div className="trust-line" aria-label="Sia benefits" data-nosnippet="">
              <span>Free</span>
              <span aria-hidden="true">·</span>
              <span>2 minutes</span>
              <span aria-hidden="true">·</span>
              <span>Private until you choose</span>
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
            {/* The card on its own reads as "a profile"; the code beside it is the part that says
                how it reaches someone. The caption changes on a phone, where scanning your own
                screen is not an option. */}
            <Link className="hero-qr" href="/create">
              <HeroQr value={absoluteUrl("/create")} />
              <span className="hero-qr-point">Scan to make yours</span>
              <span className="hero-qr-touch">Yours in 2 min</span>
            </Link>
          </div>
        </section>

        <section className="moments" aria-labelledby="moments-heading" data-nosnippet="">
          <h2 id="moments-heading">Made for the places you meet people</h2>
          <ul className="moments-list">
            {moments.map(({ label, icon: Icon }) => (
              <li key={label}><Icon size={16} aria-hidden="true" /> {label}</li>
            ))}
          </ul>
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
              {/* Sample people, labelled as such so the teaser never reads as a live count. */}
              <span className="teaser-count"><Radar size={16} /> Example</span>
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-inner">
            <div className="section-heading"><span className="eyebrow">Three small steps</span><h2>You. QR. Hello.</h2></div>
            <div className="steps">
              <article className="step"><span className="step-icon"><UserRound /></span><span className="step-number">01</span><h3>You</h3><p>Build a lightweight profile with your interests and what you’re open to.</p></article>
              <article className="step"><span className="step-icon"><QrCode /></span><span className="step-number">02</span><h3>Share</h3><p>Share your link or let someone scan your personal QR code—no app needed.</p></article>
              <article className="step"><span className="step-icon"><MessageCircleHeart /></span><span className="step-number">03</span><h3>Hello</h3><p>They see what you’re open to, so they know how to start the conversation.</p></article>
            </div>
            <div className="home-inline-cta"><span>Ready?</span><HomeCta variant="quiet" iconSize={17} /></div>
          </div>
        </section>

        <section className="faq-section" aria-labelledby="faq-heading">
          <div className="section-inner">
            <div className="section-heading"><span className="eyebrow">Good to know</span><h2 id="faq-heading">Your questions, answered.</h2></div>
            <div className="faq-list">
              {faqItems.map((item) => (
                <details className="faq-item" name="faq" key={item.question}>
                  <summary>
                    <h3>{item.question}</h3>
                    <span className="faq-icon" aria-hidden="true"><ChevronDown size={18} /></span>
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <div className="home-closing-cta" data-nosnippet=""><HomeCta /></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
