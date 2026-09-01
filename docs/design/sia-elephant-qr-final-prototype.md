# Sia Elephant QR — final prototype

## Decision

Use one calm elephant character system around a conventional QR code. The QR remains a standard, high-contrast black square on a pure-white panel; the elephant ears sit behind the panel and the face appears in a separate medallion below it.

This combines the strongest ideas from the four exploration boards without turning the QR modules into an illustration. It gives Sia a recognisable personality while preserving contrast, quiet zone, and predictable scanning.

## Display hierarchy

1. Sia logo
2. Large functional QR code
3. Elephant mascot medallion
4. Profile name
5. “Scan to meet {name}”

## Production rules

- Keep the QR black on white and generate it from the profile URL at runtime.
- Keep a minimum four-module white quiet zone around the complete QR.
- Never place the mascot, logo, ears, colour, texture, or illustration inside that quiet zone.
- Treat the ears and mascot as theme decoration only; the QR must still work if they are removed.
- Export and scan-test at intended print size, at 50% screen brightness, and from at least three phone cameras.
- Use the existing Calm palette: `#FFFDFC`, `#E8EDF8`, `#617FC0`, and `#191919`.

## Image-generation prompt

```text
Use case: ui-mockup
Asset type: final presentation prototype for the Sia project QR display
Primary request: Synthesize the four reference boards into ONE definitive portrait QR display card, not a comparison sheet and not multiple variants. The final concept is “Sia Elephant”: warm, approachable character personality with scan reliability treated as the highest priority.
Input images: Image 1: card layout and character-theme reference; Image 2: character QR exploration reference only; Image 3: QR styling reference; Image 4: elephant card framing reference.
Scene/backdrop: one finished physical/digital card floating front-on against a minimal warm ivory studio background.
Subject: a vertically oriented rounded Sia profile card. At the top, render the existing purple-blue interlocking-link Sia mark and the word “Sia”. In the centre, place one large conventional black square QR-code placeholder inside a crisp pure-white rounded-square panel with generous uninterrupted white quiet zone. The QR must remain rectangular, flat, high contrast, and completely free of faces, logos, coloured modules, or decoration. Place soft blue-lilac elephant ears symmetrically behind the OUTSIDE left and right edges of the white QR panel; the ears must not enter the panel or quiet zone. Below the QR, place a small circular medallion with a charming baby-elephant face, then the user name and scan instruction.
Style/medium: polished shippable product UI mockup with refined soft 3D/clay illustration accents, delicate shadows, premium friendly SaaS aesthetic.
Composition/framing: centered single card, straight-on, ample margins, 4:5 portrait hierarchy; brand at top, QR dominant, mascot medallion secondary, name and CTA at bottom.
Lighting/mood: soft studio light, reassuring, welcoming, calm.
Color palette: Sia Calm theme — warm ivory #FFFDFC, mist blue #E8EDF8, periwinkle #617FC0, very pale lilac, near-black #191919.
Text (verbatim): “Sia” at top, “Maya” below the medallion, “Scan to meet Maya” below the name. Render each exactly once and no other text.
Constraints: one card only; QR occupies about half the card width and is the strongest visual element; preserve a generous pure-white quiet zone; all character decoration stays outside the QR panel; accurate readable text; rounded 30px-style corners; clean visual hierarchy; presentation-ready; no watermark.
Avoid: animal-shaped QR codes, QR modules forming a face, embedded logo in QR, coloured QR, multiple variants, comparison labels, extra text, confetti clutter, paw-print clutter, ears overlapping the QR panel, distorted perspective.
```

The prototype image is a visual mockup. Its generated QR pattern is not the production code and should be replaced with the real `QRCodeSVG` output.
