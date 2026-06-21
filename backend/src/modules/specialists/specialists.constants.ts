export const ALLOWED_SPECIALTIES = ['dermatologo', 'cosmetologo'] as const;

export type AllowedSpecialty = typeof ALLOWED_SPECIALTIES[number];

export const SPECIALIST_DOCS_BUCKET = 'specialist-docs';
export const SPECIALIST_DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
