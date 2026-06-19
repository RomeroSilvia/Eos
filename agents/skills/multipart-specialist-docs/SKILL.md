---
name: multipart-specialist-docs
description: Use this skill when implementing EOS specialist registration with DNI/title image uploads from React Native to Express using multipart/form-data, expo-image-picker, FormData, multer memoryStorage, and Supabase Storage.
---

# multipart-specialist-docs

Use this workflow for Módulo 3 — Registro de Especialista.

## Goal

Implement upload of specialist verification documents:

- DNI photo.
- Professional title photo.

Frontend must send `multipart/form-data`.
Backend must receive files with `multer.memoryStorage()`.
Files must be uploaded to private Supabase Storage bucket `specialist-docs`.

## Frontend rules

Use `expo-image-picker` to select images.

Build a `FormData` payload with:

- `specialty`
- `licenseNumber`
- `dniPhoto`
- `titlePhoto`

Use the same image upload pattern already used by products if available.

Do not manually set the `Content-Type` boundary. Let `fetch` set it.

Expected fields:

```ts
formData.append('specialty', specialty);
formData.append('licenseNumber', licenseNumber);
formData.append('dniPhoto', {
  uri: dniAsset.uri,
  name: 'dni.jpg',
  type: 'image/jpeg',
} as any);
formData.append('titlePhoto', {
  uri: titleAsset.uri,
  name: 'titulo.jpg',
  type: 'image/jpeg',
} as any);
```

## Backend rules

Use `multer.memoryStorage()`.

Expected fields:

```ts
upload.fields([
  { name: 'dniPhoto', maxCount: 1 },
  { name: 'titlePhoto', maxCount: 1 },
])
```

Upload paths:

```text
{userId}/dni/{timestamp}.jpg
{userId}/titulo/{timestamp}.jpg
```

The bucket is private. Do not assume public URLs unless the project already has a signed URL strategy.

## Validation

Reject request if:

- `specialty` is missing.
- `licenseNumber` is missing.
- `dniPhoto` is missing.
- `titlePhoto` is missing.

Allowed specialties:

- `dermatologo`
- `cosmetologo`

## Database insert

Insert into `specialist_profiles`:

- `user_id`
- `specialty`
- `license_number`
- `dni_photo_url`
- `title_photo_url`
- `license_status = 'pending'`

## Do not

- Do not store documents in a public bucket.
- Do not implement M4 panel.
- Do not implement M5 chat.
- Do not skip backend tests.
