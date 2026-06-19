import type { ImagePickerAsset } from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiConfig, apiRequest } from '@/services/api/client';

export const SPECIALIST_DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type SpecialistLicenseStatus =
  | 'pending'
  | 'rejected'
  | 'verified'
  | 'not_submitted'
  | (string & {});
export type SpecialistSpecialty = 'dermatologo' | 'cosmetologo';
export type SpecialistDocumentMimeType = typeof SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES[number];

export type SpecialistStatus = {
  license_status: SpecialistLicenseStatus;
  rejection_reason: string | null;
  specialty: SpecialistSpecialty | null;
  license_number: string | null;
  full_name: string | null;
} | null;

export type MySpecialist = {
  id: string;
  fullName: string;
  email: string | null;
  specialty: SpecialistSpecialty | null;
};

export type SpecialistDirectoryItem = {
  id: string;
  fullName: string;
  email: string | null;
  specialty: SpecialistSpecialty;
};

export type SpecialistPatient = {
  relationId: string;
  id: string;
  fullName: string;
  email: string | null;
  skinType: string | null;
  profileImageUrl?: string | null;
};

export type SpecialistDocumentImage = {
  uri: string;
  name: string;
  type: SpecialistDocumentMimeType;
  size: number | null;
  file?: File;
  blob?: Blob;
};

type SpecialistStatusResponse = {
  specialistProfile?: RawSpecialistStatus | null;
  specialist_profile?: RawSpecialistStatus | null;
} & RawSpecialistStatus;

type SpecialistsSearchResponse = {
  specialists: Array<{
    id: string;
    fullName: string;
    email: string | null;
    specialty: SpecialistSpecialty;
  }>;
};

type MySpecialistResponse = {
  relation: {
    specialist: {
      id: string;
      fullName: string;
      email: string | null;
      specialty: SpecialistSpecialty;
    };
  } | null;
};

type MyPatientsResponse = {
  patients: SpecialistPatient[];
};

type RawSpecialistStatus = {
  license_status?: unknown;
  licenseStatus?: unknown;
  rejection_reason?: unknown;
  rejectionReason?: unknown;
  specialty?: unknown;
  license_number?: unknown;
  licenseNumber?: unknown;
  full_name?: unknown;
  fullName?: unknown;
};

type SpecialistRegisterPayload = {
  specialty: SpecialistSpecialty;
  licenseNumber: string;
  dniPhoto: SpecialistDocumentImage;
  titlePhoto: SpecialistDocumentImage;
};

type SpecialistDocumentKind = 'dni' | 'titulo';

export async function prepareSpecialistDocumentImage(
  asset: ImagePickerAsset,
  kind: SpecialistDocumentKind
): Promise<SpecialistDocumentImage> {
  const originalType = getAssetMimeType(asset);

  if (!isAllowedDocumentMimeType(originalType)) {
    throw new Error('Formato no permitido. Usá JPG, PNG o WEBP.');
  }

  const prepared = await getPreparedDocument(asset, kind, originalType);
  const size = await getDocumentSize(prepared, asset);

  if (size !== null && size > SPECIALIST_DOCUMENT_MAX_SIZE_BYTES) {
    throw new Error('La imagen es demasiado grande. Probá con otra imagen o sacá una foto más cerca.');
  }

  return {
    ...prepared,
    size
  };
}

export async function registerSpecialist(payload: SpecialistRegisterPayload): Promise<SpecialistStatus> {
  const formData = new FormData();
  formData.append('specialty', payload.specialty);
  formData.append('licenseNumber', payload.licenseNumber);
  await appendImageToFormData(formData, 'dniPhoto', payload.dniPhoto);
  await appendImageToFormData(formData, 'titlePhoto', payload.titlePhoto);

  const response = await fetch(`${apiConfig.baseUrl}/specialist/register`, {
    method: 'POST',
    headers: await getMultipartAuthHeaders(),
    body: formData
  });

  if (!response.ok) {
    await logBackendErrorInDevelopment(response);
    throw new Error(getFriendlyErrorMessage(response.status));
  }

  const body = await response.json() as SpecialistStatusResponse;
  return normalizeSpecialistStatusResponse(body);
}

export async function getSpecialistStatus(): Promise<SpecialistStatus> {
  try {
    const response = await apiRequest<SpecialistStatusResponse>({ path: '/specialist/status', method: 'GET' });
    return normalizeSpecialistStatusResponse(response);
  } catch (error) {
    if (hasHttpStatus(error, 403)) {
      return null;
    }

    throw error;
  }
}

export async function getMySpecialist(): Promise<MySpecialist | null> {
  try {
    const response = await apiRequest<MySpecialistResponse>({
      path: '/specialists/my-specialist',
      method: 'GET'
    });

    const specialist = response.relation?.specialist;

    if (!specialist) {
      return null;
    }

    return {
      id: specialist.id,
      fullName: specialist.fullName,
      email: specialist.email ?? null,
      specialty: specialist.specialty
    };
  } catch (error) {
    if (hasHttpStatus(error, 401) || hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      return null;
    }

    throw error;
  }
}

export async function getSpecialists(filters: {
  specialty?: SpecialistSpecialty | 'all';
  name?: string;
} = {}): Promise<SpecialistDirectoryItem[]> {
  const params = new URLSearchParams();

  if (filters.name?.trim()) {
    params.set('name', filters.name.trim());
  }

  if (filters.specialty && filters.specialty !== 'all') {
    params.set('specialty', filters.specialty);
  }

  const query = params.toString();
  const path = query ? `/specialists?${query}` : '/specialists';

  const response = await apiRequest<SpecialistsSearchResponse>({
    path,
    method: 'GET'
  });

  return response.specialists;
}

export async function linkSpecialist(specialistId: string): Promise<void> {
  await apiRequest({
    path: '/specialists/link',
    method: 'POST',
    body: JSON.stringify({ specialistId })
  });
}

export async function unlinkSpecialist(): Promise<void> {
  await apiRequest({
    path: '/specialists/link',
    method: 'DELETE'
  });
}

export async function getMyPatients(): Promise<SpecialistPatient[]> {
  try {
    const response = await apiRequest<MyPatientsResponse>({
      path: '/specialists/my-patients',
      method: 'GET'
    });

    return response.patients;
  } catch (error) {
    if (hasHttpStatus(error, 401) || hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      return [];
    }

    throw error;
  }
}

function normalizeSpecialistStatusResponse(response: SpecialistStatusResponse | null): SpecialistStatus {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const rawProfile = response.specialistProfile ?? response.specialist_profile ?? response;

  if (!rawProfile || typeof rawProfile !== 'object') {
    return null;
  }

  const licenseStatus = getOptionalString(rawProfile.license_status ?? rawProfile.licenseStatus);

  if (!licenseStatus) {
    return null;
  }

  return {
    license_status: licenseStatus as SpecialistLicenseStatus,
    rejection_reason: getOptionalString(rawProfile.rejection_reason ?? rawProfile.rejectionReason),
    specialty: getSpecialty(rawProfile.specialty),
    license_number: getOptionalString(rawProfile.license_number ?? rawProfile.licenseNumber),
    full_name: getOptionalString(rawProfile.full_name ?? rawProfile.fullName)
  };
}

function getOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getSpecialty(value: unknown): SpecialistSpecialty | null {
  if (value === 'dermatologo' || value === 'cosmetologo') {
    return value;
  }

  return null;
}

async function appendImageToFormData(
  formData: FormData,
  fieldName: 'dniPhoto' | 'titlePhoto',
  image: SpecialistDocumentImage
): Promise<void> {
  if (Platform.OS === 'web') {
    const file = image.file ?? new File([image.blob ?? await fetchImageBlob(image.uri)], image.name, { type: image.type });
    formData.append(fieldName, file);
    return;
  }

  formData.append(fieldName, {
    uri: image.uri,
    type: image.type,
    name: image.name
  } as unknown as Blob);
}

async function getMultipartAuthHeaders(): Promise<HeadersInit> {
  const token = await getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('eos-access-token');
  }

  return SecureStore.getItemAsync('eos-access-token');
}

async function logBackendErrorInDevelopment(response: Response): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const body = await response.clone().json().catch(() => null);
  console.warn('[specialist/register]', {
    status: response.status,
    body
  });
}

async function getPreparedDocument(
  asset: ImagePickerAsset,
  kind: SpecialistDocumentKind,
  originalType: SpecialistDocumentMimeType
): Promise<Omit<SpecialistDocumentImage, 'size'>> {
  try {
    const compressed = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1280 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    return {
      uri: compressed.uri,
      name: `${kind}.jpg`,
      type: 'image/jpeg'
    };
  } catch {
    return {
      uri: asset.uri,
      name: getAssetFileName(asset, kind, originalType),
      type: originalType,
      file: Platform.OS === 'web' ? asset.file : undefined
    };
  }
}

async function getDocumentSize(
  document: Omit<SpecialistDocumentImage, 'size'>,
  originalAsset: ImagePickerAsset
): Promise<number | null> {
  if (Platform.OS === 'web') {
    if (document.file?.size) {
      return document.file.size;
    }

    if (originalAsset.file?.size && document.uri === originalAsset.uri) {
      return originalAsset.file.size;
    }

    const blob = document.blob ?? await fetchImageBlob(document.uri);
    document.blob = blob;
    return blob.size;
  }

  if (document.uri === originalAsset.uri && typeof originalAsset.fileSize === 'number') {
    return originalAsset.fileSize;
  }

  return null;
}

async function fetchImageBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

function getAssetMimeType(asset: ImagePickerAsset): string {
  return asset.mimeType ?? asset.file?.type ?? getMimeTypeFromFileName(asset.fileName ?? asset.file?.name) ?? 'image/jpeg';
}

function getAssetFileName(
  asset: ImagePickerAsset,
  kind: SpecialistDocumentKind,
  mimeType: SpecialistDocumentMimeType
): string {
  const currentName = asset.fileName ?? asset.file?.name;
  const extension = getExtensionFromMimeType(mimeType);
  return currentName?.trim() || `${kind}.${extension}`;
}

function getMimeTypeFromFileName(fileName?: string | null): SpecialistDocumentMimeType | null {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return null;
}

function getExtensionFromMimeType(mimeType: SpecialistDocumentMimeType): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function isAllowedDocumentMimeType(value: string): value is SpecialistDocumentMimeType {
  return SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES.includes(value as SpecialistDocumentMimeType);
}

function getFriendlyErrorMessage(status: number): string {
  if (status === 400) return 'Datos invalidos. Revisa los campos e intenta de nuevo.';
  if (status === 401) return 'Sesion vencida. Volve a iniciar sesion.';
  if (status === 403) return 'No tenes permisos para realizar esta accion.';
  if (status >= 500) return 'Ocurrio un error en el servidor. Intenta nuevamente en unos minutos.';
  return 'No pudimos completar la solicitud.';
}

function hasHttpStatus(error: unknown, status: number): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { status?: unknown };
  return candidate.status === status;
}
