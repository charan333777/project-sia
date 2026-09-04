# Profile photos

**Status:** Implemented

**Last verified:** 2026-09-04

## Purpose and user outcome

Profile photos are optional. A person may take a photo or choose one from their device, preview it,
and use it on their profile and QR card. Someone who does not want a photo can use a Sia character
or a simple initial instead.

The design prioritises privacy: the original device image is not uploaded unchanged, stored objects
are private, metadata is removed server-side, and access uses short-lived signed URLs.

## End-to-end flow

```text
Camera or device image
→ browser checks source type/size
→ centre-crop and resize to 512 × 512
→ encode as WebP for upload/preview
→ hold in memory or IndexedDB before sign-up
→ authenticated multipart API request
→ server size and file-signature validation
→ server removes image metadata
→ private Supabase Storage object
→ profiles.avatar_path stores only the object path
→ permitted profile response receives a one-hour signed URL
→ profile card and QR card render the temporary URL
```

## Browser responsibilities

[`ProfilePhotoPicker`](../../apps/web/components/profile-photo-picker.tsx) provides two entry paths:

- `getUserMedia` camera capture when supported and permitted.
- A normal file picker, including mobile capture fallback.

The selected source must be an image and no larger than 12 MB. Browser preparation centre-crops the
shorter image dimension, resizes to 512 × 512, and outputs WebP at quality 0.86. This reduces upload
size and gives the profile/QR UI a predictable square asset.

Browser checks improve usability but are not trusted security controls. The API independently
validates the resulting bytes.

## Create-before-login handoff

Profile text and a photo use different browser stores:

```text
Profile fields ──► sessionStorage
Prepared photo ──► IndexedDB database `sia-profile-drafts`
```

IndexedDB is used because `sessionStorage` is unsuitable for a binary image. After Supabase provides
an authenticated session, the login flow creates the profile, uploads the held photo, clears both
draft stores, and redirects to the owner profile.

No photo object is written to Supabase before there is an authenticated owner.

## API and service responsibilities

| Layer | Responsibility |
| --- | --- |
| Fastify route | Requires bearer authentication, accepts one multipart `photo`, enforces 5 MB limit |
| `ProfileService` | Owner lookup, validation orchestration, replacement/removal consistency |
| `ProfilePhotoStorage` | Signature detection, metadata sanitisation and provider interface |
| `SupabaseProfilePhotoStorage` | Private object upload/removal and one-hour signed URL creation |
| `ProfileRepository` | Updates `profiles.avatar_path` only for the verified owner |

Protected endpoints:

- `POST /api/v1/profiles/me/photo`
- `DELETE /api/v1/profiles/me/photo`

The upload route has a tighter limit of 10 requests per minute in addition to the global API limit.

## Server-side validation and sanitisation

The API accepts JPEG, PNG and WebP up to 5 MB. It determines type from the binary signature rather
than trusting the multipart filename or content type.

Metadata removal covers:

- JPEG APP1 and APP13 sections, which may contain EXIF, XMP, IPTC or GPS information.
- PNG `eXIf`, text and compressed/international text chunks.
- WebP EXIF and XMP chunks, including corresponding extended-header flags.

The sanitiser preserves image data while removing common metadata locations. It is not a general
malware scanner or full image decoder.

## Storage and access model

The migration [`202609030001_add_profile_photos.sql`](../../supabase/migrations/202609030001_add_profile_photos.sql)
creates/configures:

- Nullable `profiles.avatar_path`.
- Private `profile-photos` bucket.
- 5 MB bucket limit.
- JPEG, PNG and WebP allowed MIME types.

Objects use this shape:

```text
profile-photos/
└── <verified-user-id>/
    └── <random-uuid>.<jpg|png|webp>
```

The database stores the internal path, never a permanent public URL. When a permitted owner or
public-profile request loads the profile, the API creates a signed URL valid for one hour. A private
profile therefore cannot obtain public visibility merely because it has a photo.

## Replacement and deletion behaviour

Replacement is designed to minimise broken references:

1. Upload the new private object.
2. Update the verified owner's `avatar_path`.
3. If the database update fails, remove the newly uploaded orphan.
4. After a successful update, attempt to remove the old object.

Deletion first clears `avatar_path`, then attempts to remove the old object. Storage deletion errors
are tolerated after the database is safe, so an infrastructure problem does not leave the profile
pointing to a missing or unintended object.

If signed-URL generation fails, the rest of the profile still loads with `avatar_url: null` and the
UI can fall back to the selected character or initial.

## Display priority

```text
Available private photo via signed URL
    ↓ otherwise
Selected Sia character
    ↓ otherwise
First initial of display name
```

The same choice is reflected in owner/public profile cards and the QR poster.

## Configuration

| Variable | Location | Purpose |
| --- | --- | --- |
| `PROFILE_PHOTO_BUCKET` | API environment | Bucket name; defaults to `profile-photos` |
| `SUPABASE_URL` | API environment | Storage project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | API environment | Server-only Storage access |

Do not create public bucket policies for this flow. The API service credential owns storage access,
and all user-facing access is mediated by profile visibility and signed URLs.

## Validation performed

API tests cover:

- Uploading a private profile photo.
- Replacing the previous photo and removing the old object.
- Removing a photo.
- Rejecting content whose binary signature is not a supported image.

The implementation was also verified through build, type-check and production integration work.
There is no automated browser camera test, image-decoder security test or scheduled orphan-object
reconciliation.

## Known limitations

- Cropping is a fixed centre crop; the user cannot reposition or zoom.
- Metadata stripping is format-specific and does not re-encode the image on the server.
- Signed URLs last one hour and may remain usable until expiry after visibility changes.
- There is no automatic scan for abandoned/orphaned bucket objects.
- A browser draft photo remains in IndexedDB until the normal completion/clear path runs.

## Implementation locations

- [`apps/web/components/profile-photo-picker.tsx`](../../apps/web/components/profile-photo-picker.tsx)
- [`apps/web/lib/profile-photo-draft.ts`](../../apps/web/lib/profile-photo-draft.ts)
- [`apps/api/src/services/profile-photo-storage.ts`](../../apps/api/src/services/profile-photo-storage.ts)
- [`apps/api/src/services/profile-service.ts`](../../apps/api/src/services/profile-service.ts)
- [`apps/api/src/repositories/postgres-profile-repository.ts`](../../apps/api/src/repositories/postgres-profile-repository.ts)
- [`docs/database/schema.md`](../database/schema.md)

## Change history

| Date | Change |
| --- | --- |
| 2026-09-04 | Created the dedicated implementation, privacy, storage and lifecycle record for optional profile photos. |
