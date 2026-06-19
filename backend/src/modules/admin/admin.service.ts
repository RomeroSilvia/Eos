import { ApiError } from '../../utils/ApiError';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import {
  adminRepository,
  type AdminProfileRow,
  type AdminSpecialistProfileRow
} from './admin.repository';

const SPECIALIST_DOCS_BUCKET = 'specialist-docs';
const SPECIALIST_DOCUMENT_SIGNED_URL_EXPIRES_IN = 300;

export type AdminSpecialistSummary = {
  specialistProfileId: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  specialty: string;
  licenseNumber: string;
  licenseStatus: string;
  rejectionReason: string | null;
  createdAt: string;
};

export type AdminSpecialistDocuments = {
  dniPhotoUrl: string;
  titlePhotoUrl: string;
  expiresIn: number;
};

type UpdateSpecialistStatusBody = {
  licenseStatus?: unknown;
  rejectionReason?: unknown;
};

export const adminService = {
  listPendingSpecialists: async (): Promise<AdminSpecialistSummary[]> => {
    const specialists = await adminRepository.findPendingSpecialists();
    const profiles = await adminRepository.findProfilesByIds(
      [...new Set(specialists.map((specialist) => specialist.user_id))]
    );
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

    return specialists.map((specialist) => toAdminSpecialistSummary(specialist, profilesById.get(specialist.user_id)));
  },

  updateSpecialistStatus: async (
    specialistProfileId: string,
    body: UpdateSpecialistStatusBody
  ): Promise<AdminSpecialistSummary> => {
    const licenseStatus = normalizeLicenseStatus(body.licenseStatus);
    const rejectionReason = normalizeRejectionReason(body.rejectionReason);

    if (licenseStatus === 'rejected' && !rejectionReason) {
      throw new ApiError(400, 'El motivo de rechazo es obligatorio.');
    }

    const updated = await adminRepository.updateSpecialistStatus(specialistProfileId, {
      license_status: licenseStatus,
      rejection_reason: licenseStatus === 'verified' ? null : rejectionReason
    });

    if (!updated) {
      const current = await adminRepository.findSpecialistStatusById(specialistProfileId);

      if (!current) {
        throw new ApiError(404, 'Solicitud de especialista no encontrada.');
      }

      throw new ApiError(409, 'La solicitud ya fue procesada.');
    }

    const profiles = await adminRepository.findProfilesByIds([updated.user_id]);
    return toAdminSpecialistSummary(updated, profiles[0]);
  },

  getSpecialistDocuments: async (specialistProfileId: string): Promise<AdminSpecialistDocuments> => {
    const profile = await adminRepository.findSpecialistDocumentsById(specialistProfileId);

    if (!profile) {
      throw new ApiError(404, 'Solicitud de especialista no encontrada.');
    }

    if (!profile.dni_photo_url || !profile.title_photo_url) {
      throw new ApiError(404, 'El documento no esta disponible.');
    }

    const [dniPhotoUrl, titlePhotoUrl] = await Promise.all([
      createSignedDocumentUrl(profile.dni_photo_url, 'dniPhoto'),
      createSignedDocumentUrl(profile.title_photo_url, 'titlePhoto')
    ]);

    return {
      dniPhotoUrl,
      titlePhotoUrl,
      expiresIn: SPECIALIST_DOCUMENT_SIGNED_URL_EXPIRES_IN
    };
  }
};

function normalizeLicenseStatus(value: unknown): 'verified' | 'rejected' {
  if (value === 'verified' || value === 'rejected') {
    return value;
  }

  throw new ApiError(400, 'Estado de matrícula inválido.');
}

function normalizeRejectionReason(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function toAdminSpecialistSummary(
  specialist: AdminSpecialistProfileRow,
  profile?: AdminProfileRow
): AdminSpecialistSummary {
  return {
    specialistProfileId: specialist.id,
    userId: specialist.user_id,
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? null,
    specialty: specialist.specialty,
    licenseNumber: specialist.license_number,
    licenseStatus: specialist.license_status,
    rejectionReason: specialist.rejection_reason,
    createdAt: specialist.created_at
  };
}
async function createSignedDocumentUrl(path: string | null, documentType: 'dniPhoto' | 'titlePhoto'): Promise<string> {
  const internalPath = normalizeSpecialistDocumentPath(path);

  logDocumentSigningDebug({
    documentType,
    hasRawPath: Boolean(path?.trim()),
    normalizedPath: internalPath
  });

  const { data, error } = await supabase.storage
    .from(SPECIALIST_DOCS_BUCKET)
    .createSignedUrl(internalPath, SPECIALIST_DOCUMENT_SIGNED_URL_EXPIRES_IN);

  if (error || !data?.signedUrl) {
    logDocumentSigningError(documentType, internalPath, error);
    throw mapSignedUrlError(error);
  }

  return data.signedUrl;
}

export function normalizeSpecialistDocumentPath(value: string | null): string {
  const trimmedValue = value?.trim() ?? '';
  const bucketPrefix = `${SPECIALIST_DOCS_BUCKET}/`;

  if (!trimmedValue) {
    throw new ApiError(404, 'El documento no está disponible.');
  }

  const urlPath = extractStoragePathFromUrl(trimmedValue);
  let normalizedPath = decodeStoragePath(urlPath ?? trimmedValue).replace(/^\/+/, '');

  while (normalizedPath.startsWith(bucketPrefix)) {
    normalizedPath = normalizedPath.slice(bucketPrefix.length).replace(/^\/+/, '');
  }

  return normalizedPath;
}

function extractStoragePathFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const path = decodeStoragePath(url.pathname);
    const objectMarker = `/storage/v1/object/${SPECIALIST_DOCS_BUCKET}/`;
    const publicMarker = `/storage/v1/object/public/${SPECIALIST_DOCS_BUCKET}/`;
    const signedMarker = `/storage/v1/object/sign/${SPECIALIST_DOCS_BUCKET}/`;
    const marker = [objectMarker, publicMarker, signedMarker].find((candidate) => path.includes(candidate));

    if (!marker) {
      return null;
    }

    return path.slice(path.indexOf(marker) + marker.length);
  } catch {
    return null;
  }
}

function decodeStoragePath(value: string): string {
  let decodedValue = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const nextValue = decodeURIComponent(decodedValue);

      if (nextValue === decodedValue) {
        break;
      }

      decodedValue = nextValue;
    } catch {
      break;
    }
  }

  return decodedValue;
}

function mapSignedUrlError(error: unknown): ApiError {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('not exist') ||
    normalizedMessage.includes('no such') ||
    normalizedMessage.includes('404')
  ) {
    return new ApiError(404, 'No encontramos el archivo subido para este documento.');
  }

  return new ApiError(500, 'No pudimos generar el enlace seguro del documento.');
}

function logDocumentSigningDebug(meta: {
  documentType: 'dniPhoto' | 'titlePhoto';
  hasRawPath: boolean;
  normalizedPath: string;
}): void {
  if (env.nodeEnv !== 'development') return;
  console.info('[admin/specialist-documents]', meta);
}

function logDocumentSigningError(
  documentType: 'dniPhoto' | 'titlePhoto',
  normalizedPath: string,
  error: unknown
): void {
  if (env.nodeEnv !== 'development') return;
  console.error('[admin/specialist-documents:error]', {
    documentType,
    normalizedPath,
    errorMessage: getErrorMessage(error)
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }

  return String(error ?? '');
}
