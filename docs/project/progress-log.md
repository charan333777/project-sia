# Progress log

What has shipped, newest first. One entry per meaningful change: what it was, why it mattered, and
where it lives. Entries below the 2026-09-04 line were reconstructed from git history.

## 2026-09-24 — One tap to the code, and a status that asks to be switched on

Five follow-ups from the same review. Web-only; the API and schema are unchanged. Not yet
deployed.

**Link previews say the pitch.** `siteConfig.description` — the meta and Open Graph description, the
JSON-LD and now the manifest — was still "Meet people more naturally…". It now opens with "Sia makes
the first conversation more meaningful", so a link dropped into a group chat repeats what people
heard at the meetup. The home share image pairs the same line with "Make hello easier."

**One tap to the code.** Someone opens Sia to show their QR to the person in front of them, so:
- The manifest's `start_url` is `/profile/qr` (signed out, that page sends you to log in). `scope`
  is set to `/` explicitly — left out, it would default to `/profile/` and the rest of Sia would
  open outside the app — and `id: "/"` keeps an existing install the same app. Long-pressing the
  Android icon offers Show my QR, My Sia and Nearby.
- An iPhone ignores `start_url` and adds whatever page is open, which is why the offer lives on the
  QR page: `components/home-screen-tip.tsx` explains Share → Add to Home Screen on iOS, uses
  Chrome's install prompt on Android when there is one (caught app-wide by
  `components/install-prompt-listener.tsx`, since it fires only once and usually before the QR page
  mounts), and falls back to the browser-menu instructions otherwise. Phones only, never inside the
  installed app, gone for good once dismissed.
- Home-screen icons were missing: an iPhone used a screenshot of the page. `app/apple-icon.tsx` and
  `app/app-icon/[name]/route.tsx` draw the mark as PNGs (192, 512 and a maskable 512) from
  `lib/app-icon.tsx`, with room around the loops so the bitmap does not clip them.

**The QR shows why to scan.** Under the name, the on-screen card shows the live status ("Open · At
the design meetup") or else the "right now" line (`components/qr-viewer.tsx`). The printable poster
shows **Open to** instead — paper cannot expire, and a printed status would go on saying "at the
meetup" after it ended. The poster builder moved to `lib/qr-poster.ts` so it could be tested; the
line takes as many tags as fit (measured: about 16px a character at 34px Arial, capitals ~40% wider),
and its room comes out of the code panel, which stays 660px of the 1080px width.

**A nudge when the status is off.** A public Sia with nothing showing gets "Heading out? · Open for
3h" above the card (`components/profile-status-nudge.tsx`). It sends the right-now line back as the
status detail, because a status without one clears it. "Not now" quiets it for 12 hours on that
device. The picker below now follows a duration set from the nudge.

**Unknown profiles return 404.** `/u/<missing>` returned 200 with a `noindex` page: `app/loading.tsx`
and `app/u/[username]/loading.tsx` wrapped the page in Suspense, so the 200 was sent before
`notFound()` ran. Both are removed — `/u/[username]` is the only page that loads data on the server,
every other page is static or client-rendered. The same change ends the "Opening this Sia…" flash
on the most time-sensitive screen (roadmap). Measured locally against the live API: missing 404,
real profile 200 at ~0.22s to first byte.

Tests: `lib/qr-poster.test.ts` (line fitting, ordering and spacing with and without a photo, full-size
code when there is no line) and `components/profile-status-nudge.test.tsx` (one tap keeps the
right-now line, hidden when a status is live or the Sia is private, Not now sticks). Node 25's own
`localStorage` global shadows jsdom's, so the nudge test installs an in-memory one.

## 2026-09-24 — First impressions: the scanner's next step, and a hero that shows the code

A review of siaqr.com against digital-card and meet-people apps (Blinq, Popl, HiHello, Linktree,
NameDrop, happn, iicebrkr) found the two screens that decide whether Sia spreads — the home page
and the public card — both underselling it. Web-only; the API and schema are unchanged. Not yet
deployed.

**Public card.**
- The intro sits under the name and role instead of between the two tag lists, where it read as a
  stray line (the roadmap's "Bio renders orphaned").
- On a phone, **Save contact** floats at the bottom of the screen until the real button scrolls into
  view, so the scanner's main action is always in reach. The floating copy is `aria-hidden`
  and unfocusable, so assistive technology still meets one Save
  (`components/profile-contact-panel.tsx`).
- The invitation under the card was a thin "Make hello easier · Create mine" strip. It is now a card
  that keeps the tagline and says what a Sia is before asking — "Made with Sia · Make hello easier",
  a profile and QR code, yours in 2 minutes. A signed-in scanner already has one, so they get "Your
  turn — show them yours", linking to their QR (`components/profile-viral-card.tsx`).

**Home page.**
- **"Make hello easier." stays the headline.** It is the line Sia is introduced with at meetups and in
  groups, so the lede under it now says the same pitch out loud — "Sia makes the first conversation
  more meaningful" — then what a scan shows, instead of "Meet people more naturally…". The eyebrow
  ("Your profile, one scan away") fits one line on a phone, and the trust line leads with Free.
- The hero's "Say hello 👋" sticker promised a button no real card has. It is now a real QR code that
  opens `/create`: "Scan to make yours" on a laptop, "Yours in 2 min" on a phone
  (`components/hero-qr.tsx`), under the same dark-on-white, quiet-zone rules as a Sia code.
- A "Made for the places you meet people" row — meetups, conferences, campus, coworking, travel,
  parties — sits under the hero, and step 3 says what the scan gives the other person.
- The drifting hero orbit no longer widens the page by 3px at tablet widths.

**Wizard.** The "Right now" step and the edit form offer six starting points ("At a meetup", "New in
town", …). A tap fills the field, which stays editable; tapping the same one clears it. A render test
in `components/profile-form.test.tsx` covers fill, edit and clear.

`apps/web/app/page.tsx`, `apps/web/app/globals.css`, `apps/web/components/profile-card.tsx`,
`apps/web/components/profile-form.tsx`.

## 2026-09-22 — Smoke-test fixes: nothing someone builds gets thrown away

A live smoke test of siaqr.com at 375×812 turned up flows that lost work or said the wrong thing.
All of these are web-only; the API and schema are unchanged. Not yet deployed.

**Lost work.**
- A taken username after sign-up used to drop the whole draft (409 is terminal) and then say "open
  your Sia" when none existed. `/login` now sends any terminal hand-off to
  `/create?resume=username|details`. The create page lifts the draft and its photo into the wizard,
  opening on the failing field. It removes the draft from storage only after the hand-over, so an
  interrupted effect cannot eat it; a StrictMode test guards this.
- A signed-in user with a Sia could run `/create` again. `PROFILE_EXISTS` was swallowed and a chosen
  photo replaced their existing one. `/create` now redirects them to `/profile`. A draft that meets
  `PROFILE_EXISTS` at `/login` leaves the existing photo alone and lands on `/profile?existing=1`,
  which says the Sia was kept.

**Going where you meant to go.** A signed-out tap on Nearby went to a bare `/login` ("Welcome back")
and ended on `/profile`. `useOwnedProfile` now sends `/login?next=<path>`. `lib/next-path.ts` only
accepts same-site paths, and the destination survives Google OAuth in sessionStorage. The Nearby
arrival gets its own heading.

**Wizard.**
- The username follows the name until it is edited, drops characters it cannot hold as they are
  typed, and has spellcheck off (`lib/username.ts`).
- An error clears as soon as its field changes, in both the create and edit forms.
- Private now says the QR won't open for anyone else.
- The last step flags hidden contact details, with a Review link back to them.
- Sign-up shows "@handle is ready to save" with Back to edit.

**Smaller fixes.**
- The profile status Off option reads "Just your 'right now' line" when that line exists, because it
  still shows.
- Nearby shows "Who's around?" instead of "0 nearby" while hidden.
- The not-found page leads with "Make your own Sia".
- The owner's Preview link carries `?preview=1`, which skips the view count and swaps "Create mine"
  for a way back (`components/profile-viral-card.tsx`).
- Home CTAs read "Open my Sia" when signed in (`components/home-cta.tsx`). The FAQ ends in a button,
  and the radar teaser is labelled "Example".
- The mobile hero gap is smaller, and "Say hello" no longer sits on the chips.
- The header labels Create on phones and hides links to the current page.
- The QR and Edit pages have their own titles.

## 2026-09-22 — "Show my QR" moves to the top of the owner page

A live smoke test at 375×812 found that on `/profile` every action (Share, Edit, QR, Copy) sat about
two screens down, below the card, the scan count and the status picker. The moment someone opens
this page is usually the moment they want to show their code to the person in front of them.

The actions now sit directly under the "Your Sia" heading, above the card: a full-width **Show my
QR** primary button, then Share · Copy link · Edit as one compact row. A private Sia gets **Choose
visibility** as the primary instead, with Edit beside it. Copy confirms in its own label ("Copied")
and through a visually hidden status line, so the old centred status paragraph no longer reserves
blank space. `apps/web/app/profile/page.tsx`, owner action rules in `app/globals.css`. Not yet
deployed.

## 2026-09-18 — Create wizard fits one phone screen

On a phone, `/create` scrolled on every step and the live preview sat below the form, so it was
never in view while typing. Measured at 375×812, the Connect step needed 911px and Style up to 653px
against roughly 370px of room.

**One screen, preview on top.** Below 840px the page is exactly `100dvh` tall: a compact preview
strip on top, the step card filling the rest, Back/Next always visible. The strip shows avatar, name,
role, handle and the "right now" line in the chosen colour mood; tapping it opens the full card in a
bottom sheet (`components/profile-preview-strip.tsx`). The step body is its own scroll area only as a
fallback, so the page itself never scrolls. Desktop keeps the side-by-side full preview.

**Eight short steps instead of five.** You · Now · Into · Open to · Reach · Look · Colour ·
Visibility. Connect and Style were split, and the short intro moved from You to Now. `fieldStep` in
`lib/contact-items.ts` follows the new order, so a late validation error still returns to the step
that owns the field. The edit page is unchanged — it still shows the intro under About me.

**What fits.** At 375×812 every step fits with three contact rows, three custom tags or a photo. At
375×667 (an iPhone with Safari's toolbars showing) everything fits except three or more contact rows,
which scroll inside the card. Not yet deployed.

## 2026-09-18 — Home FAQ: questions first, answers drop down

The "Good to know" section showed all four questions and answers at once, which made a long wall of
text at the bottom of the home page on a phone. It now lists only the questions as dropdowns; tapping
one opens its answer underneath, and opening another closes the first.

They are native `<details name="faq">` elements in `apps/web/app/page.tsx`, so there is no client
JavaScript, keyboard and screen-reader behaviour come from the browser, and the answers stay in the
server HTML alongside the `FAQPage` JSON-LD. The list is a single centred column at every width, since
a two-column grid leaves a tall empty card beside whichever answer is open. Not yet deployed.

## 2026-09-09 — The hand-off that could not be escaped

Reported as "I am getting this error again": signing in showed **Almost there — you're signed in, but
we couldn't finish setting up your Sia. That didn't work. Try again in a moment.** on every visit,
with no way past it.

**Why it recurred.** `/create` wrote the draft to `sessionStorage` before checking for a session, so
a signed-in submit left a copy behind, and the copy was only removed on full success. `/login` then
replayed that draft on every visit and, on failure, set `handoffFailed` without dropping it. The
retry re-sent identical input — including the same access token — so the outcome could never change.
Nothing in the loop could heal itself; only clearing `sessionStorage` by hand got anyone out.

**Why the screen said nothing useful.** The hand-off piped its errors through `friendlyAuthError`,
which exists to hide Supabase's library shapes and only matches Supabase's strings. Sia's own
sentences matched none of them, so `"Please log in to continue."` and `"That username is already in
use."` both arrived as a generic shrug. The reason was known and then discarded.

**What changed.** A draft is now written only while signed out. Failures are classified by status in
`profile-handoff.ts` — a 4xx is terminal and the draft is dropped, 408/429/5xx keeps it for a retry
that means something, and a 401 earns exactly one silent `refreshSession` before asking for a fresh
login. `handoffErrorMessage` shows the API's own sentence and keeps the generic line for throwables
carrying no message. The card gained a **Continue without it** escape hatch, plus states for
re-authentication and for partial success.

**A photo no longer costs the profile.** `loadProfilePhotoDraft()` was the one draft call without a
`.catch()`, sitting one line above `clearProfilePhotoDraft().catch(...)`, so a blocked IndexedDB
failed a hand-off over an optional extra. Both the read and the upload are now contained: the profile
is saved, the draft cleared, and the caveat shown rather than the whole step lost.

**Tests.** Nine render tests drive the real page through jsdom against a failing API. Reverting each
fix turns exactly its own test red — no terminal discard, the old `friendlyAuthError` path, no token
refresh, the un-caught IndexedDB read — which is the check this log applied on 2026-09-05. One guards
an ordering trap: a 409 is terminal by status, so the `PROFILE_EXISTS` pardon has to happen first, or
owning a profile would discard your draft. Eight more cover the classifier directly.

`apps/web/lib/profile-handoff.ts`, `apps/web/lib/profile-handoff.test.ts`,
`apps/web/app/login/page.tsx`, `apps/web/app/login/page.test.tsx`, `apps/web/app/create/page.tsx`.

## 2026-09-05 — Deletion, scan counts, search listing, and the legal pages

Four features, plus a production bug found while testing them.

**Account deletion, 30-day soft delete.** Confirming requires typing your own username, and the
dialog states what happens rather than implying it. The profile is hidden the instant `deleted_at` is
set — public page 404s, QR stops resolving, writes refused — while the row survives 30 days so a
misclick is recoverable by logging back in. A sweep, rate-limited the same way Nearby prunes, then
erases the row and its photo. Reads filter `deleted_at` themselves, so an unswept row is never
served: the sweep performs erasure, it does not police visibility.

Usernames are **retired permanently** on purge. Printed cards outlive accounts, and reissuing
`@charan` would send everyone holding an old card to a stranger. `use-owned-profile` now routes a
deleted account to recovery instead of `/create`, which would have dead-ended on `PROFILE_EXISTS`.

**Scan counts.** One row per profile per UTC day holding an integer — the schema has nowhere to put a
visitor, so the privacy claim is structural rather than a promise. Counting happens in the browser
after hydration, which is what keeps crawlers and link previews out: verified by loading the page in
a real browser (count rose) and then fetching it as Googlebot (count unchanged).

**Search listing is a separate opt-in.** Public means "reachable by link"; listed means "indexed in a
directory of every profile", which is a different decision now that a card carries a phone number.
Default off; only opted-in profiles enter `sitemap.xml`.

**Terms and privacy published.** Both pages describe what Sia actually does — per-detail publishing,
server-side filtering, Nearby's bands and sectors, the deletion window, retired usernames. The
controller, address, contact email and governing law are `TODO:` placeholders in
`apps/web/lib/legal.ts`, and both pages show a visible warning until they are replaced. **These pages
are not complete until Charan fills those in.**

**The bug found on the way.** The web API client set `Content-Type: application/json` on every
request, including bodyless ones. Fastify rejects a request that declares a JSON body and sends
none, so it 500s before routing. Confirmed against production: a bodyless `DELETE` with that header
returned 500, without it 401. It had been breaking `removeProfilePhoto`, `clearProfileStatus`,
`hideNearby` and `blockNearbyProfile` from the browser — every bodyless call the app makes. The
header is now sent only when there is a body, and `apps/web/lib/api.test.ts` guards it.

Migrations `202609050002_add_account_deletion.sql`, `202609050003_add_profile_views.sql`,
`202609050004_add_search_listing.sql`.

## 2026-09-05 — Render tests, and the owner's own card

Two follow-ups to the signup dead end.

**The owner's profile offered to save you to yourself.** `/profile` renders the same `ProfileCard`
as the public page, so the contact panel arrived with a **Save contact** button and a note about
coming back for the current details — addressed to the person whose details they are. The rows stay,
because seeing what is published is useful; the actions are suppressed. `ProfileCard` takes an
`owner` flag and the panel's flag is now `readOnly`, which says what it does.

**`@sia/web` has render tests.** Both bugs found today lived in the wiring between form state and the
rendered error — territory a schema test cannot reach, which is why a suite of 23 passing validation
tests said nothing while signup was broken. `profile-form.test.tsx` drives the real wizard through
jsdom: it walks the steps, taps "+ Link", and asserts on what a person would actually see. Reverting
the fix turns three of the five red, so they test the behaviour rather than describing it.

Adding `jsdom` re-resolved vitest's peer hash and left `packages/validation`'s symlink pointing at a
store path that no longer existed — typecheck failed there until a workspace-wide `pnpm install`
relinked it. `pnpm install --frozen-lockfile` now succeeds, so CI is unaffected.

`apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`,
`apps/web/components/profile-form.test.tsx`, `apps/web/components/profile-card.tsx`,
`apps/web/components/profile-contact-panel.tsx`, `apps/web/app/profile/page.tsx`.

## 2026-09-05 — Signup dead end from an untouched contact row

Reported after the contact card shipped: new signups could fail with no explanation.

Tapping **+ Link** adds a blank row immediately, and the schema rightly refuses an empty value. The
resulting error is keyed to `contact_items`, which the wizard renders on step 2 — but the person is
on step 5 pressing **Create my Sia**. The message was set and never shown, so the button did
nothing: no error, no navigation, no draft saved. A curious tap on the new control was enough to
make a profile unsaveable, which is as bad as it sounds for a first-run experience.

Two fixes, because either alone leaves a hole. Rows opened and never typed into are dropped before
validation — an untouched row is an empty row, not a mistake. And a validation failure now sends the
person to the step that renders the message, so the submit button can never again appear inert. A
row carrying only a label is deliberately kept rather than silently discarded: someone meant
something by it, and it should fail where they can see it.

Both helpers moved to `apps/web/lib/contact-items.ts` so they could be tested, which makes this the
first test coverage in `@sia/web` — its script was `vitest run --passWithNoTests` and is now
`vitest run`. That absence is exactly why this reached production.

`apps/web/lib/contact-items.ts`, `apps/web/lib/contact-items.test.ts`,
`apps/web/components/profile-form.tsx`, `apps/web/package.json`.

## 2026-09-05 — Contact-card outage, and the fixes it prompted

**The incident.** The contact-card code deployed ahead of its migration. Every stored profile came
back without `contact_items`, `publicContactItems(undefined)` threw, and every public profile
returned 500 — so every QR scan hit an error page. `/profile/edit` failed the same way in the
browser, on `value.length`. Applying the migration restored service immediately; no data was lost.

The lesson was not "remember the migration" but that the code should not have cared. `present()`
now normalises `contact_items` to `[]`, `publicContactItems` tolerates null, and the editor guards
its array, so a row predating the column is served rather than fatal. An API test reproduces the
outage exactly — removing the guards turns it back into a 500.

**Sign-in.** Four fixes. A failed post-auth hand-off used to leave someone authenticated but stuck
on an error with no way forward except a reload; there is now an explicit retry that re-runs the
hand-off against the live session. Supabase's raw error text no longer reaches the screen — known
cases are mapped to plain sentences and anything unrecognised falls back to one, instead of showing
"AuthApiError". A signup whose confirmation email never arrives can be resent. And the mode switch
dropped `role="tab"` for `aria-pressed`, because there was no tabpanel for those tabs to control.

**The QR card now prints its own address.** A card is held up in bad light to old cameras, and a
failed scan previously had no recourse at all. The readable URL appears under the code on screen and
on the downloadable poster, where a failed scan is otherwise final.

**Contact rows look tappable.** They were already links — the whole row opens the link, mail app or
dialer — but on a phone there is no hover to reveal it, so the copy button looked like the only
action. Links now carry an outward arrow, email and phone a chevron. A line under **Save contact**
notes that a saved contact includes the person's Sia link, which is the honest version of "this card
stays current": the vCard is a snapshot, the link is not.

**Docs corrected.** `overview.md` and `deployment-and-domain.md` named the retired Oregon API host;
benchmarking that host is what produced the earlier "2.3s round trip" figure. The live API is
`project-sia-1` at ~150–200 ms warm. Roadmap item 3(a) is marked shipped with measured numbers, and
two stale sign-in claims were removed. The old Oregon service is still running and still serving
production data — deleting it is outstanding.

`apps/web/app/login/page.tsx`, `apps/web/components/qr-viewer.tsx`,
`apps/web/components/profile-contact-panel.tsx`, `apps/api/src/services/profile-service.ts`,
`packages/validation/src/profile.ts`.

## 2026-09-05 — The contact card

A scanned Sia now answers "how do I reach this person?". A profile carries up to eight contact
details — links, emails and phone numbers — and the public card renders them under **Reach me**,
each with a copy button, plus **Save contact**, which builds a vCard in the browser so the scanner
can drop the person straight into their phone. That makes the QR useful outside an event: at a
conference, while travelling, or any time the card is shown instead of a number being dictated.

**Storing a detail and publishing it are separate decisions.** Every entry carries its own
`is_public`, defaulting to false, so adding a phone number never publishes it as a side effect. The
filter is applied server-side in `ProfileService.presentPublic`, the sole caller being `getPublic`
— the one public read path. A hidden detail is therefore absent from the API response rather than
present-but-unrendered, which is what keeps it out of the page source, the JSON payload, the Open
Graph image and the downloaded vCard alike. `ProfileCard` filters a second time so the builder
preview shows the owner exactly what a scanner would see.

Links are normalised to absolute URLs and restricted to `http`/`https` by a protocol allowlist
rather than a pattern, so no encoding of `javascript:` or `data:` gets through. Embedded credentials
are stripped, because `https://linkedin.com@evil.example` reads as a trusted host to someone who
just scanned a code in person. Rendered links carry `rel="noopener noreferrer nofollow"`. Published
links also populate `sameAs` in the existing `ProfilePage` JSON-LD.

Stored as one jsonb array rather than a column per contact type, so supporting a new kind of detail
later is a validation change instead of another migration.

Migration `202609050001_add_profile_contact_items.sql`, `packages/validation/src/profile.ts`,
`apps/api/src/services/profile-service.ts`, `apps/web/components/contact-items-editor.tsx`,
`apps/web/components/profile-contact-panel.tsx`, `apps/web/lib/vcard.ts`.

Not built: a third "visible to signed-in scanners only" tier. Deliberate — it is the right answer
for a phone number eventually, but it doubles the states to explain and test, and binary
public/hidden is the honest first version.

## 2026-09-05 — The QR page leads with the code

The owner's QR page rendered the whole "Make it yours" panel permanently between the card and the
actions. The personalisation controls were taller than the QR itself and pushed Full screen, Share
and Save below the fold, so the page opened on pickers rather than on the thing it exists to show.

The panel is now collapsed behind a fourth toolbox action, **Style**, and expands in place beneath
it. Expanding scrolls it just into view; collapsing is the default on every visit. Character and
colour mood are unchanged and still save immediately against the card above them, which is why the
panel stays on this route instead of moving to `/profile/edit` — the live preview is the point.

The toolbox went from three columns to four `minmax(0, 1fr)` ones, stacked icon-over-label at every
width and dropping to 2x2 below 380px. `minmax(0, ...)` rather than plain `1fr` because a single
long label would otherwise widen its own column and leave the row uneven.

Public profiles at `/u/:username` never rendered this panel and are untouched.

`apps/web/app/profile/qr/page.tsx`, `apps/web/app/globals.css`.

## 2026-09-03 — Search and social discoverability

Full SEO pass so a shared Sia link previews well and the site can be indexed. Added canonical
metadata, Open Graph images for the homepage and each public profile, `robots.txt`, `sitemap.xml`,
a web manifest, and JSON-LD (Organization, WebSite, SoftwareApplication, FAQPage, ProfilePage).
`/nearby` is explicitly `noindex`. Introduced `apps/web/lib/site.ts` as the single source for the
canonical origin, plus optional Google/Bing verification tokens.

Commit `88c3edf`.

## 2026-09-03 — Private profile photos

Customers can put a real photo on their profile and QR card. Uploads go through the API as
`multipart/form-data`, are validated by file signature (not by the client's content type), stripped
of EXIF/XMP/IPTC metadata — GPS included — and stored in a **private** Supabase Storage bucket.
Profiles receive one-hour signed URLs only after the same access checks used for profile data.
A photo chosen before sign-up is held in IndexedDB and uploaded once the session exists.

`apps/api/src/services/profile-photo-storage.ts`, `apps/web/components/profile-photo-picker.tsx`,
`apps/web/lib/profile-photo-draft.ts`, migration `202609030001_add_profile_photos.sql`. Commit `23dbff3`.

## 2026-09-02 — Nearby backend

The privacy-first meeting loop, end to end. PostGIS presence with a 200 m GiST-indexed search;
responses carry only a distance band and one of eight bearing sectors, never coordinates. Preset
intention Waves requiring mutual acceptance, two-hour connections, Meet Cards with a public-place
label and preset coordination statuses, plus blocks and reports. Presence, Waves, connections and
plans expire and are pruned; blocks and reports are retained.

`apps/api/src/services/nearby-service.ts`, `apps/api/src/repositories/postgres-nearby-repository.ts`,
`packages/validation/src/nearby.ts`, migration `202609010005_add_nearby.sql`. Commit `6cf63f1`.

## 2026-09-01 — Profile personality and QR poster

Made a Sia feel like its owner: four colour themes, five characters with soft-3D mascot art, and a
redesigned QR page that exports a shareable SVG poster. The QR itself stayed a conventional
high-contrast code with a clean quiet zone — mascot decoration sits outside the panel.

`apps/web/components/profile-themes.ts`, `apps/web/components/profile-characters.ts`,
`apps/web/app/profile/qr/page.tsx`, `apps/web/public/mascots/`,
[design notes](../design/sia-elephant-qr-final-prototype.md). Migrations `…0002`, `…0003`, `…0004`.
Commit `1c68f95`.

## 2026-09-04 — Nearby load and throttling fixes

Four changes found while estimating how many people can use Sia in one room at once.

**The expiry sweep left the request path.** `pruneExpired` ran a four-DELETE write transaction on
*every* Nearby poll — six sequential round trips holding a pooled connection, from every client
every 8 seconds. Every read query already filters expired rows (`visible_until > now()`,
`expires_at > now()`), so an unpruned row was never visible anyway; the sweep only performs the
physical erasure. It now runs at most once every 60 seconds across all callers, with concurrent
polls sharing one in-flight sweep and a failed sweep retried on the next request. This is the
largest single capacity change: roughly 8 snapshots/second becomes roughly 40.

**Rate limiting counts per user, not per IP.** The limiter keyed on `req.ip`, so a room sharing one
wifi — the exact situation Nearby exists for — was throttled as though it were one person, breaking
at about 14 people. It now keys on the token subject, falling back to IP when no token is present.

**Throttled requests return 429 instead of 500.** `@fastify/rate-limit` throws a plain error
carrying a status code, which the error handler did not recognise, so every throttle was answered
with `INTERNAL_ERROR`, logged as an unhandled fault, and gave the client no reason to back off.

**Nearby polls adaptively and pauses when hidden.** 8s while something is happening, 30s on an
empty radar, and nothing at all in a backgrounded tab — there was no visibility handling before.

`apps/api/src/repositories/postgres-nearby-repository.ts`, `apps/api/src/app.ts`,
`apps/web/components/nearby-experience.tsx`. Load-test harness in
`scripts/nearby-load-test.mjs` (refuses non-localhost targets without `--allow-remote`).

## 2026-09-04 — Profile status

Replaced the open-ended "Right now" text box with a chosen **state** that expires by itself:
`open`, `around`, `focused`, or `off`, each active state carrying a duration of `30m`, `1h`, `3h`
or `8h`. `current_context` is kept as the optional detail line shown under the state, so no existing
profile text was lost.

The expiry is derived on the server from the duration and re-checked on every read, which means a
status can go stale in the database but never on screen. Durations are fixed spans rather than
wall-clock targets ("today", "this evening") so expiry never depends on a timezone the API does not
know. Status is deliberately absent from `profileInputSchema` and has its own endpoints, so a
profile update cannot assert its own expiry.

Not yet wired into Nearby — presence keeps its own separate opt-in and duration for now.

`PUT`/`DELETE /api/v1/profiles/me/status`, migration `202609040001_add_profile_status.sql`,
`packages/validation/src/profile.ts`, `apps/api/src/services/profile-service.ts`,
`apps/web/components/profile-status-picker.tsx`, `apps/web/components/profile-status-panel.tsx`.

## 2026-09-01 — Nearby first pass and UI refresh

First Nearby screen and radar visual (`9b76ceb`), on top of a broad UI refresh of the homepage,
profile flow and auth screens (`c28f2c3`). Web app deployed to Vercel (`cbc98bb`).

## 2026-08-29 — V1 foundation

Homepage, creation-before-registration flow, Supabase email/password auth, owner profile, editing,
QR view and public profile. Fastify V1 REST API with token verification, authorization, validation,
a stable error envelope, CORS, security headers and rate limiting. First PostgreSQL migration,
provider interfaces, focused tests, Docker packaging and GitHub Actions.

Commits `d82def3`, `e360abe`, `1cabe7f`.
