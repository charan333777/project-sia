# Roadmap

What remains planned. Implemented changes are recorded in
[`progress-log.md`](progress-log.md) and [`overview.md`](overview.md).
Last reviewed: 2026-09-30 against the live audit and local implementation.

## Release the audit improvements

The three-stage wizard, draft/history recovery, sample profile, signed-out Nearby preview,
contact-link saving, keyboard controls, static illustrated characters, event presets, indexing
fix and web headers are implemented locally. They are not yet deployed.

- Supply accurate `LEGAL_CONTROLLER_NAME`, `LEGAL_CONTROLLER_ADDRESS`, `LEGAL_CONTACT_EMAIL`
  and `LEGAL_GOVERNING_LAW` in the web build environment. `/privacy`, `/terms` and `/contact`
  already exist; their remaining gap is the actual owner information.
- Apply `202609300001_add_illustrated_profile_characters.sql`, deploy the compatible API, then web.
- Verify on physical iOS/Android devices: keyboard/text enlargement, photo selection and camera
  denial, native sharing and vCard import; check with VoiceOver and reduced motion.
- Run a two-person Nearby check in a staging environment, including Wave acceptance, expiry,
  blocking and reporting. The fictional preview is not a substitute for this check.
- Compare setup completion and time to first usable QR with a baseline. Pilot at a specific
  meetup/campus/community; local density is an adoption problem as well as a UI problem.

## QR-origin mutual Hello — product decision required

The public scanner can save the name/Sia link and use an owner-interest conversation prompt.
A Sia-native preset Hello could connect that encounter to an authenticated mutual response.

This requires a separate authorization scope: the current Nearby SQL requires active presence
within 200 m. A copied QR is not evidence of proximity. Design owner opt-in, recipient discovery,
rate limits/caps, mutual acceptance, expiry, block/report and moderation before exposing it.
Reuse preset intentions and service patterns without weakening Nearby's proximity rule.
A permanent inbox or free-form chat remains outside V1.

## Deeper avatar representation — after the curated release

Four illustrated people now join the existing four mascots, with photos and initials retained.
Evaluate whether people want deeper representation before adding a modular avatar configuration
with versioned allowlisted parts. AI selfie generation would require a separate decision and
queued jobs, spending caps, consent, private storage and deletion/moderation handling.
Neither alternative is part of the current static character implementation.

## Technical follow-ups

- Review production report-only CSP observations before enforcement; add a nonce strategy for
  framework scripts and a reporting destination if central collection is needed.
- Measure public-profile performance after the Frankfurt route preference and request-local
  fetch deduplication deploy. Any signed-photo URL cache must remain access-aware, expire safely,
  and stop serving private/deleted profiles. No broad personalized-response cache is planned.
- Verify whether the old Oregon Render service still exists and remove it if obsolete; historical
  documentation is not evidence of its current state.
- Add a moderation workflow for `nearby_reports`, and a data export flow.
- Review the account-creation entry paths and password policy alongside the auth provider.
- Root `CHANGELOG.md` still predates the newer feature areas.

## Capacity

Previous capacity figures were estimates, not fresh load-test results. Use
`scripts/nearby-load-test.mjs` against localhost or an explicitly authorized staging target
before making concurrent-user claims. The harness refuses remote targets without
`--allow-remote`; do not load-test production as part of routine UI checks.

## Out of scope for V1

Map tiles/exact public pins, permanent inbox/feed/followers, push notifications, payments,
AI features and a full admin dashboard remain outside V1 until an explicit scope decision.
