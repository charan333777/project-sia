# QR sharing and profile personalisation

**Status:** Implemented

**Last verified:** 2026-09-04

## Purpose and user outcome

The QR experience turns a Sia profile into something a person can show, share or save. Profile
personalisation makes the card recognisable without compromising the QR code's basic scanability.

## Product flow

```text
Owner profile
→ canonical public URL: https://siaqr.com/u/<username>
→ QR generated on demand in the browser
→ display full screen, share URL, copy URL, or save SVG poster
→ another person scans the code
→ public Next.js route requests the profile from the Fastify API
→ API returns it only when is_public = true
```

The QR image is not stored in PostgreSQL or Supabase Storage. It is derived whenever needed from the
canonical public URL.

## Personalisation model

Each profile selects:

- One colour theme: `calm`, `warm`, `bold`, or `play`.
- One character: `plain`, `puppy`, `elephant`, `panda`, or `play`.
- Optionally, a private profile photo that visually takes priority over the character.

When neither a photo nor illustrated character is used, the interface displays the first initial of
the person's name. Themes and characters are independent, so any allowed character can be combined
with any colour mood.

The allowed values are shared between web and API in
[`packages/validation/src/profile.ts`](../../packages/validation/src/profile.ts) and constrained
again by PostgreSQL migrations.

## QR safety decision

The production QR remains conventional:

```text
Black QR modules
on a pure-white panel
with a four-module quiet zone
and no logo, mascot, colour or decoration inside the QR area
```

Mascot ears, medallions, shapes and colours are decoration outside the QR panel. Removing the
decoration should leave a normal usable code. This decision deliberately favours scanning over a
more experimental character-shaped QR.

Current generator settings in [`QrViewer`](../../apps/web/components/qr-viewer.tsx):

| Setting | Value |
| --- | --- |
| Library | `qrcode.react` |
| Component | `QRCodeSVG` |
| Render size | 284 |
| Error correction | `M` |
| Margin/quiet zone | 4 modules |
| Foreground | `#191919` |
| Background | `#FFFFFF` |

## Display hierarchy

The selected production hierarchy is:

1. Sia logo
2. Large functional QR code
3. Photo or character medallion where applicable
4. Profile display name
5. “Scan to meet {name}” instruction

The source decision and prototype are preserved in
[`sia-elephant-qr-final-prototype.md`](../design/sia-elephant-qr-final-prototype.md). The prototype PNG
is a visual reference only; its drawn QR pattern is not production data.

## Share and export behaviour

The owner can:

- Open the QR card in a full-screen presentation view.
- Use the Web Share API when the device supports it.
- Fall back to copying the canonical public URL.
- Build and download a self-contained SVG poster named `<username>-sia-card.svg`.

The export clones the live production SVG QR into a poster, then adds the profile name, instruction,
theme colours and optional avatar/character framing. The QR destination remains the canonical
`NEXT_PUBLIC_SITE_URL` plus `/u/<username>`.

## Character assets

Production mascot PNGs live in [`apps/web/public/mascots`](../../apps/web/public/mascots):

- Puppy
- Elephant
- Panda
- Play abstract smiley

They were generated as a consistent soft 3D/clay family with transparent backgrounds. The reusable
prompt and character-specific constraints are preserved in
[`sia-qr-personality-mascots.md`](../design/sia-qr-personality-mascots.md).

## Public-profile relationship

A QR destination works only while the profile is public. The API applies the same not-found response
to private and missing profiles, so a saved QR does not bypass privacy. Changing a username changes
the canonical URL and therefore makes previously generated QR posters point to the old address.

Profile photos use private signed URLs. An exported poster may embed the currently loaded image as
data so the saved file can render independently; storage/access details are covered in
[`profile-photos.md`](./profile-photos.md).

## Validation and QA

Automated validation tests cover allowed themes and characters. API tests verify that these fields
persist with profile creation/update. Next.js builds exercise the QR components at compile time.

The design notes define manual production checks at intended print size, reduced screen brightness
and multiple phone cameras. A completed device/print scan matrix is not currently recorded in the
repository, so it should not be assumed from the visual prototype alone.

## Rules that are easy to break

- Never put a logo, face, colour or illustration inside the QR quiet zone.
- Always use the canonical deployed origin, not `localhost` or an old Vercel preview URL.
- Keep the profile route `/u/:username` unless a migration/redirect plan protects existing cards.
- Test a saved poster as well as the on-screen code after QR/export changes.
- Treat generated design prototypes as references, not scannable production codes.
- Preserve an accessible title/label for the QR and meaningful text around it.

## Known limitations

- Username changes can invalidate already printed QR cards; there is no alias/redirect table.
- QR scan reliability has no automated image-based regression test.
- The SVG poster is the only saved format; there is no dedicated print/PDF pipeline.
- The public sitemap does not enumerate profile URLs.
- Character PNGs increase static asset weight and have no automated visual-regression check.

## Implementation locations

- [`apps/web/components/qr-viewer.tsx`](../../apps/web/components/qr-viewer.tsx)
- [`apps/web/app/profile/qr/page.tsx`](../../apps/web/app/profile/qr/page.tsx)
- [`apps/web/components/profile-card.tsx`](../../apps/web/components/profile-card.tsx)
- [`apps/web/components/profile-themes.ts`](../../apps/web/components/profile-themes.ts)
- [`apps/web/components/profile-characters.ts`](../../apps/web/components/profile-characters.ts)
- [`apps/web/components/profile-theme-picker.tsx`](../../apps/web/components/profile-theme-picker.tsx)
- [`apps/web/components/profile-character-picker.tsx`](../../apps/web/components/profile-character-picker.tsx)

## Change history

| Date | Change |
| --- | --- |
| 2026-09-04 | Created the consolidated QR, export, character, theme and scan-safety record. |
