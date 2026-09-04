# SEO foundation and search readiness

**Status:** Implemented locally; awaiting production-domain configuration and deployment  
**Implemented:** 3 September 2026  
**Documented:** 4 September 2026

## Purpose

The SEO work gives Sia a technically sound, understandable public presence for search engines and people sharing links. It is intended to help search engines crawl the correct pages, understand what Sia does, avoid indexing private application screens, and produce useful search and social previews.

This is an SEO foundation, not a guarantee of ranking. Ranking will also depend on the live domain, useful content, links from other websites, real usage, competition, and time for search engines to crawl the site.

## Product positioning used

The central search-facing description is:

> Create a personal digital profile and QR code that makes meeting, networking and starting real-life conversations easier.

The preferred homepage title is:

> Digital Profile & QR Code for Real-Life Connections | Sia

The create-profile page uses:

> Create a Free Digital Profile & QR Code | Sia

These phrases were selected from Sia's existing product behaviour rather than from external keyword-volume research.

| Phrase | Reason for using it |
| --- | --- |
| Digital profile | Describes the product category in language a new visitor can understand. |
| Personal QR code | Describes the main sharing mechanism and a likely task-oriented search phrase. |
| Real-life connections | Differentiates Sia from feeds, follower-based networks, and conventional social media. |
| Networking | Covers professional and event-based use without limiting Sia to business users. |
| Easier introductions | Expresses the outcome rather than only describing the technology. |
| Meet people nearby | Represents the opt-in Nearby capability already visible on the homepage. |
| No app needed | Answers a likely objection and explains the QR experience. |
| Private by default | Communicates an important trust and privacy property. |

The phrases also appear naturally in visible headings, descriptions, feature explanations, links, and FAQ answers. They are not hidden or repeated unnaturally. A `keywords` metadata field is present for completeness and non-Google consumers, but Google does not use that field as a ranking signal; the visible content, titles, descriptions, links, and site reputation are more important.

## Work completed

### Page metadata

- Added a shared site name, canonical origin, preferred title, and description.
- Added unique metadata for the homepage and profile-creation page.
- Added application name, author, publisher, category, language/locale, referrer, and snippet-preview directives.
- Added canonical URLs to reduce duplicate-URL ambiguity.
- Added Open Graph and Twitter card metadata for link sharing.
- Added optional Google and Bing ownership-token support. No verification tag is emitted when the variables are unset.

### Crawling and indexing

- Added a generated `/robots.txt` that permits public crawling and points to the sitemap.
- Added a generated `/sitemap.xml` containing the homepage and create-profile page.
- Kept the homepage and create-profile page indexable.
- Kept public `/u/[username]` profiles indexable when the profile exists and is public.
- Marked login, password reset, owner profile, profile editing, QR management, and Nearby application screens as `noindex` because they are private, account-specific, or thin utility pages.
- Missing or inaccessible profiles return non-indexable metadata.

Public profiles are not bulk-listed in the sitemap. The current API does not provide a privacy-reviewed public-profile listing endpoint, so the SEO work deliberately avoids creating an enumerable user directory. Search engines can still discover individual public profiles when those URLs are linked publicly.

### Structured data

The homepage publishes valid JSON-LD for:

- `Organization`
- `WebSite`
- `SoftwareApplication`
- `FAQPage`

Public profile pages publish:

- `ProfilePage`
- `Person`

Profile structured data uses only information that is already shown on the public profile.

### Search and social content

- Reworked the homepage introduction so it clearly mentions a digital profile and personal QR code.
- Expanded the three-step explanation with useful, natural-language descriptions.
- Added a visible FAQ covering the product, app-free QR scanning, profile privacy, and approximate Nearby location.
- Added descriptive internal footer links.
- Added a branded global social preview image.
- Added dynamically generated, personalized social preview images for public profiles.
- Added a web application manifest and theme metadata.

### Accessibility related to search quality

The primary call-to-action colour was darkened to meet text-contrast requirements. This raised the measured homepage accessibility result without changing the visual identity materially.

## Where the implementation lives

| Area | Location |
| --- | --- |
| Shared SEO wording and canonical site URL | [`apps/web/lib/site.ts`](../../apps/web/lib/site.ts) |
| Root metadata, robots directives, sharing metadata, verification support | [`apps/web/app/layout.tsx`](../../apps/web/app/layout.tsx) |
| Homepage metadata, positioning copy, FAQ and JSON-LD | [`apps/web/app/page.tsx`](../../apps/web/app/page.tsx) |
| Global social preview image | [`apps/web/app/opengraph-image.tsx`](../../apps/web/app/opengraph-image.tsx) |
| Robots endpoint | [`apps/web/app/robots.ts`](../../apps/web/app/robots.ts) |
| Sitemap endpoint | [`apps/web/app/sitemap.ts`](../../apps/web/app/sitemap.ts) |
| Web manifest | [`apps/web/app/manifest.ts`](../../apps/web/app/manifest.ts) |
| Create-page metadata | [`apps/web/app/create/layout.tsx`](../../apps/web/app/create/layout.tsx) |
| Utility-page `noindex` metadata | [`apps/web/app/login/layout.tsx`](../../apps/web/app/login/layout.tsx), [`apps/web/app/profile/layout.tsx`](../../apps/web/app/profile/layout.tsx), [`apps/web/app/reset-password/layout.tsx`](../../apps/web/app/reset-password/layout.tsx), [`apps/web/app/nearby/page.tsx`](../../apps/web/app/nearby/page.tsx) |
| Public-profile metadata and structured data | [`apps/web/app/u/[username]/page.tsx`](../../apps/web/app/u/%5Busername%5D/page.tsx) |
| Personalized profile sharing image | [`apps/web/app/u/[username]/opengraph-image.tsx`](../../apps/web/app/u/%5Busername%5D/opengraph-image.tsx) |
| FAQ, footer and contrast styling | [`apps/web/app/globals.css`](../../apps/web/app/globals.css) |
| Footer internal links | [`apps/web/components/footer.tsx`](../../apps/web/components/footer.tsx) |
| Environment-variable examples | [`.env.example`](../../.env.example) |

There is intentionally no single "SEO file." Search readiness spans metadata, public content, crawler endpoints, structured data, route-specific indexing rules, and deployment configuration. This record is the central map for those pieces.

## Production requirements

The following values must be configured in the production hosting environment before the production build:

```env
NEXT_PUBLIC_SITE_URL=https://the-final-public-domain.example
NEXT_PUBLIC_API_URL=https://the-public-api-domain.example/api/v1
WEB_ORIGIN=https://the-final-public-domain.example
```

The committed localhost values in `.env.example` are development examples. If production is built without the real `NEXT_PUBLIC_SITE_URL`, canonical links, social metadata, `robots.txt`, and the sitemap will incorrectly reference localhost. If `NEXT_PUBLIC_API_URL` remains local, visitors' browsers will try to contact their own computers and application features will fail.

Google and Bing verification variables are optional and may remain unset during the early stages:

```env
GOOGLE_SITE_VERIFICATION=
BING_SITE_VERIFICATION=
```

Committing or pushing the code does not submit the site to a search engine. The site must be deployed on a publicly accessible HTTPS domain before it can be crawled.

## Validation results

The implementation was checked using a local optimized Next.js production build.

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Next.js production build | Passed |
| Rendered title, description and canonical tags | Passed |
| Rendered `robots.txt` and `sitemap.xml` | Passed |
| Structured-data validation in Lighthouse | Passed |
| Lighthouse SEO | 100 |
| Lighthouse accessibility after contrast correction | 100 |
| Lighthouse best practices in the full audit | 100 |
| Lighthouse performance in the full audit | 94 |

Local Lighthouse scores are evidence that the implementation is healthy, but production scores can change with hosting latency, third-party scripts, the final domain, network conditions, and later code changes. A production audit should be run after deployment.

## Known limitations and future work

1. Set the final production URLs and repeat the metadata and Lighthouse checks on the live domain.
2. Decide whether public profiles should remain discoverable only through public links or be included in a privacy-reviewed profile sitemap.
3. Perform keyword and competitor research once Sia has a clearer target audience and real search data.
4. Add useful public landing pages only when there is enough genuine content to serve a user need; avoid creating thin keyword pages.
5. Monitor real Core Web Vitals after traffic begins and optimize based on field data rather than local scores alone.
6. Search Console and Bing Webmaster Tools can be connected later for indexing and query data, but they are not required for the initial deployment.
7. Update this record whenever the positioning, index policy, domain strategy, or principal metadata changes.

## Change history

| Date | Change |
| --- | --- |
| 3 September 2026 | Implemented the initial SEO foundation and completed local validation. |
| 4 September 2026 | Added this project record for future contributors. |
