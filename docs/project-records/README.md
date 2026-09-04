# Project records

This folder is the human-readable memory of the Sia project. Each document records one meaningful area of work so that a future contributor can understand what exists, why it was built that way, where the implementation lives, how it was checked, and what remains to be done.

These records complement the Git history and `CHANGELOG.md`:

- Git shows the exact code changes.
- The changelog gives a short chronological summary.
- Project records preserve the reasoning, terminology, operational requirements, and measured results behind a topic.

## Records

| Topic | Status | Document |
| --- | --- | --- |
| Project architecture and service interactions | Implemented; last verified 2026-09-04 | [Architecture](./architecture.md) |
| Production deployment and custom domain | Implemented and live; last verified 2026-09-04 | [Deployment and domain](./deployment-and-domain.md) |
| Authentication and profile-draft handoff | Implemented for email/password | [Authentication](./authentication.md) |
| Authentication email delivery with Resend | Configured; end-to-end inbox smoke test pending | [Authentication email](./authentication-email.md) |
| Nearby privacy, safety and meeting lifecycle | Implemented | [Nearby privacy](./nearby-privacy.md) |
| Private profile-photo pipeline | Implemented | [Profile photos](./profile-photos.md) |
| QR sharing and profile personalisation | Implemented | [QR and personalisation](./qr-and-personalisation.md) |
| Capacity and scaling assumptions | Planning record; not load-tested | [Capacity and scaling](./capacity-and-scaling.md) |
| Testing and release process | Baseline implemented; coverage gaps recorded | [Testing and release](./testing-and-release.md) |
| SEO foundation and search readiness | Implemented; production configuration pending | [SEO](./seo.md) |

## Format for future records

Create one Markdown file per topic using a short, durable name such as `authentication-email.md`, `google-login.md`, or `nearby-privacy.md`. Prefer updating an existing topic record over creating several overlapping files.

Each record should normally contain:

1. Purpose and user outcome
2. Work completed
3. Important wording or product decisions
4. Implementation locations
5. Configuration or operational requirements
6. Validation and measured results
7. Known limitations
8. Recommended next steps
9. Change history

Keep records concise enough to scan, but include the reasoning that cannot be recovered by reading the code alone. Never place passwords, API keys, service-role keys, access tokens, or other secrets in these documents.
