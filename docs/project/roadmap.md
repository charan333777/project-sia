# Roadmap

What is planned but not built. Items move from here to
[`progress-log.md`](progress-log.md) once they ship, and the matching row in
[`overview.md`](overview.md) is updated in the same pass.

Last reviewed: 2026-09-04, against the live site.

## Next up

### 1. The public profile has no action — the largest gap in the product

`/u/:username` currently offers exactly one thing to the person who just scanned the QR code:
**"Create mine."** There is no way to say hello, reply, save a contact, or reach the person at all.
Verified live on 2026-09-04: no "Say hello", "Wave", "Contact" or "Save contact" anywhere in the page.

This contradicts what the marketing site promises — the homepage mock shows a **"Say hello 👋"**
button that does not exist, and step 3 of "Three small steps" says *"Give new people an easy,
natural way to start a conversation."*

**The important part: the hello system is already built.** The API has `sendNearbySignal`,
`respondNearbySignal`, `proposeNearbyMeet`, `respondNearbyMeet`, `sendNearbyMeetStatus`,
`blockNearbyProfile` and `reportNearbyProfile`. Every one is namespaced `/nearby/*`, so the entire
connection loop is locked behind the feature that cannot work without local density — while QR,
which works today with zero other users, has no path into any of it.

So this is plumbing, not new product: expose the existing signal/meet loop to the QR flow. For a
logged-out scanner, "Say hello" doubles as the signup wedge — they create a Sia in order to reply,
which is the viral loop the product currently lacks.

### 2. No Terms, Privacy Policy or contact route

`/terms`, `/privacy`, `/legal`, `/about`, `/contact` and `/support` all return 404, and the footer
links only Home / Create a profile / Nearby. Sia handles location data and publishes personal
profiles, with UK and EU users. This is both a legal exposure and a trust gap that undercuts the
privacy positioning the product otherwise works hard for.

### 3. Region move — the single biggest performance win, and it is free

Measured 2026-09-04: the homepage (static, edge-served) returns in **0.07s**; `/u/:username`
(server-rendered, hits the API) takes **0.7–2.0s**, median ~1.1s. That is the most
latency-sensitive screen in the product — someone standing in front of another person, holding a
phone.

The cause is geography. One profile view crosses four regions:

```
UK phone → Vercel edge London (lhr1) → Vercel SSR Washington DC (iad1)
         → Render API Oregon → Supabase Frankfurt (×2: DB query + storage signed URL) → back
```

A single indexed row lookup costs ~200 ms, which is the Oregon↔Frankfurt crossing.

Do these in order — step b makes things *worse* if done before step a:

- **a. Recreate the Render web service in Frankfurt.** Render cannot change an existing service's
  region; create a new service, copy env vars, set `WEB_ORIGIN`, repoint Vercel's
  `NEXT_PUBLIC_API_URL`, then delete the Oregon service. Frankfurt is Render's only EU region and
  already matches Supabase. Expected: ~1.1s → ~0.4s.
- **b. Pin Vercel SSR to `fra1`** with `preferredRegion` on `/u/[username]` and its OG image route
  (the only dynamic routes). Expected: → ~0.15s.
- **c. Cache the Supabase Storage signed URL.** Every public profile view mints a fresh one-hour
  signed URL over the network and discards it — ~0.4s on the critical path.

London was considered and rejected: with API and database co-located, the only difference is the
user hop (~15 ms), and Render has no London region, so it would mean leaving Render *and* migrating
the Supabase project and its private storage bucket. Revisit only if UK data residency becomes a
contractual requirement — that would be a compliance decision, not a performance one.

### 4. Create flow: five steps to three

Design (mobile mockups, states and mapping):
https://claude.ai/code/artifact/2d182037-fff7-4460-a3c0-8038e4520f80

- Merge the avatar choice into step 1; keep Connect; combine colour mood + visibility as step 3.
- **Nothing is persisted.** No draft in `localStorage`, and `/create` never changes URL, so the
  browser back gesture — reflexive on mobile — discards all five steps. Give each step a URL and
  save a draft.
- **Neither visibility option is pre-selected**, yet "Create my Sia" is enabled, while the FAQ
  promises "New profiles are private by default." Pre-select Private.
- Scroll position is preserved across steps, so the step heading scrolls off after "Next".
- The live preview sits below the fold on a phone — the payoff is invisible while you type.
- No username availability check until submit.

### 5. Nearby's logged-out first impression

`/nearby` is promoted with a hero CTA on the homepage, but shows "Preparing Nearby…" for ~3s and
then hard-redirects to `/login` with no `?next=` return path, greeting a first-time visitor with
"Welcome back / Good to see you / Your Sia is waiting." Show a real logged-out preview and gate only
the visibility toggle.

Also: "0 nearby · 0 match your interests" is displayed while the user is hidden and location has
never been requested, which reads as "nobody uses this."

## Considering

Smaller, verified against the live site on 2026-09-04:

- **Bio renders orphaned.** On `/u/:username` the bio appears as a bare, unlabelled line wedged
  between the "Open to" chips and "I'm into". It should sit under the name and role.
- **"Opening this Sia…" flash** on a page that is already server-rendered — unnecessary perceived
  latency on the most time-sensitive screen.
- **QR card shows no readable URL**, so a failed scan has no fallback. Print `siaqr.com/u/<name>`
  under the code.
- **Sitemap lists 2 URLs** (`/` and `/create`); public profiles are not enumerated.
- **No security headers**: CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and
  `Permissions-Policy` are all absent. `Permissions-Policy` matters most here, given geolocation.
- **Auth is email + password only**, 6-character minimum, no social or magic link — the heaviest
  option for a "no app, two minutes" product. The sign-up tab also keeps
  `autocomplete="current-password"` (should be `new-password`) and shows "No Sia yet? Create yours".
- **Two competing account-creation paths** (`/create` wizard vs `/login` → Sign up) with different
  mental models.
- **Avatar status ring**: the status band ships with a countdown ring, but the ring around the
  avatar (designed, in the artifact above) was skipped because `.profile-avatar` has themed and
  photo variants and there are no web component tests to catch a regression.
- **Status is not wired into Nearby.** Deliberate for now — presence keeps its own opt-in and
  duration. The natural next step is Nearby surfacing only people who are `open` or `around`.

## Capacity notes

Established 2026-09-04 by measurement plus reading the code, not by load test:

- QR scanning and profile viewing: **300–500+ concurrent people** — not the bottleneck.
- Nearby open simultaneously: was **~45**, now **~200** after the 60-second prune gate.
- The remaining ceiling is the ~200 ms cross-Atlantic database round trip. The region move above
  should take Nearby past ~800.
- `scripts/nearby-load-test.mjs` turns these estimates into measurements. It refuses non-localhost
  targets without `--allow-remote`; point it at a staging deploy, not production.

## Out of scope for now

Decisions already made for V1, not gaps waiting to be filled:

- Map tiles and exact public location pins
- A permanent inbox, feed, friends or followers
- Push notifications
- Payments
- AI features
- An admin dashboard
