import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { centersRepository } from './centers.repository';
import type {
  CenterDashboardSummary,
  CenterRow,
  CenterSpecialistSummary,
  CenterSummary,
  CreateCenterInput,
  UpdateCenterInput
} from './centers.types';

const CENTER_IMAGES_BUCKET = 'center-images';
const ALLOWED_CENTER_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_CENTER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CENTER_IMAGE_SIZE_MB = 5;
const CENTER_NAME_MIN_LENGTH = 2;
const CENTER_NAME_MAX_LENGTH = 80;
const CENTER_ADDRESS_MAX_LENGTH = 160;
const CENTER_LOCATION_MAX_LENGTH = 80;
const CENTER_PHONE_MAX_LENGTH = 20;
const CENTER_PHONE_MIN_DIGITS = 6;
const CENTER_PHONE_ALLOWED_PATTERN = /^[0-9+\-()\s]+$/;

type NormalizedCenterPayload = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  image_url?: string | null;
};

type CenterImageFile = Pick<Express.Multer.File, 'buffer' | 'mimetype' | 'size' | 'originalname'>;

type CenterProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export const centersService = {
  listCenters: async (adminUserId: string): Promise<CenterSummary[]> => {
    const centers = await centersRepository.findActiveByAdminId(adminUserId);
    const countsByCenterId = await centersRepository.findSpecialistCountsByCenterIds(centers.map((center) => center.id));
    return centers.map((center) => toCenterSummary(center, countsByCenterId.get(center.id) ?? 0));
  },

  createCenter: async (adminUserId: string, input: CreateCenterInput): Promise<CenterSummary> => {
    const payload = normalizeCreateInput(input);
    await ensureActiveNameIsAvailable(payload.name);

    let center: CenterRow;

    try {
      center = await centersRepository.create(payload);
    } catch (error) {
      throw mapCreateCenterError(error);
    }

    try {
      await centersRepository.createAdminAssignment(adminUserId, center.id);
      return toCenterSummary(center);
    } catch (error) {
      logCentersError('create-center-admin-assignment', error);
      await rollbackCreatedCenter(center.id);
      throw new ApiError(500, 'No pudimos crear el centro. Intentá nuevamente.');
    }
  },

  updateCenter: async (
    adminUserId: string,
    centerId: string,
    input: UpdateCenterInput
  ): Promise<CenterSummary> => {
    const center = await ensureAdminCanAccessActiveCenter(adminUserId, centerId);

    const payload = normalizeUpdateInput(input);

    if (payload.name) {
      await ensureActiveNameIsAvailable(payload.name, center.id);
    }

    const updated = await centersRepository.update(center.id, {
      ...payload,
      updated_at: new Date().toISOString()
    });

    if (!updated) {
      throw new ApiError(404, 'No encontramos este centro o fue dado de baja.');
    }

    return toCenterSummary(updated);
  },

  deleteCenter: async (adminUserId: string, centerId: string): Promise<void> => {
    const center = await ensureAdminCanAccessActiveCenter(adminUserId, centerId);

    const deleted = await centersRepository.softDelete(center.id);

    if (!deleted) {
      throw new ApiError(404, 'Centro no encontrado o inactivo.');
    }
  },

  getDashboard: async (adminUserId: string, centerId: string): Promise<CenterDashboardSummary> => {
    const center = await ensureAdminCanAccessActiveCenter(adminUserId, centerId);
    const specialists = await centersRepository.findSpecialistStatsByCenterId(center.id);
    const specialistIds = [
      ...new Set(specialists.flatMap((specialist) => [specialist.id, specialist.user_id]).filter(Boolean))
    ];
    const relations = await centersRepository.findActiveClientRelationsBySpecialistIds(specialistIds);
    const clientIds = new Set(relations.map((relation) => relation.client_id));

    return {
      specialistsTotal: specialists.length,
      specialistsVerified: specialists.filter((specialist) => specialist.license_status === 'verified').length,
      specialistsPending: specialists.filter((specialist) => specialist.license_status === 'pending').length,
      clientsTotal: clientIds.size
    };
  },

  listCenterSpecialists: async (adminUserId: string, centerId: string): Promise<CenterSpecialistSummary[]> => {
    const center = await ensureAdminCanAccessActiveCenter(adminUserId, centerId);
    const specialists = await centersRepository.findSpecialistsByCenterId(center.id);
    const profiles = await centersRepository.findProfilesByIds([...new Set(specialists.map((specialist) => specialist.user_id))]);
    const profilesById = new Map((profiles as CenterProfileRow[]).map((profile) => [profile.id, profile]));

    return specialists.map((specialist) => {
      const profile = profilesById.get(specialist.user_id);

      return {
        specialistProfileId: specialist.id,
        userId: specialist.user_id,
        name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        specialty: specialist.specialty,
        licenseStatus: specialist.license_status,
        centerId: specialist.center_id
      };
    });
  },

  uploadCenterImage: async (
    adminUserId: string,
    centerId: string,
    file: CenterImageFile | undefined
  ): Promise<CenterSummary> => {
    const center = await ensureAdminCanAccessActiveCenter(adminUserId, centerId);
    const image = validateCenterImage(file);
    const mimeType = resolveCenterImageMimeType(image);
    const imagePath = buildCenterImagePath(center.id, mimeType);

    try {
      await centersRepository.uploadFile({
        bucket: CENTER_IMAGES_BUCKET,
        path: imagePath,
        buffer: image.buffer,
        contentType: mimeType
      });
    } catch (error) {
      logCentersError('upload-center-image', error);
      throw new ApiError(500, 'No pudimos subir la imagen del centro. Revisá la configuración de almacenamiento.');
    }

    const imageUrl = centersRepository.getPublicUrl(CENTER_IMAGES_BUCKET, imagePath);
    const updated = await centersRepository.update(center.id, {
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    });

    if (!updated) {
      throw new ApiError(404, 'Centro no encontrado o inactivo.');
    }

    return toCenterSummary(updated);
  }
};

export async function ensureAdminCanAccessActiveCenter(adminUserId: string, centerId: string): Promise<CenterRow> {
  const center = await getActiveCenterOrThrow(centerId);
  await ensureAdminCanAccessCenter(adminUserId, center.id);
  return center;
}

async function getActiveCenterOrThrow(centerId: string): Promise<CenterRow> {
  const center = await centersRepository.findById(centerId);

  if (!center || !center.is_active) {
    throw new ApiError(404, 'No encontramos este centro o fue dado de baja.');
  }

  return center;
}

async function ensureAdminCanAccessCenter(adminUserId: string, centerId: string): Promise<void> {
  const assignment = await centersRepository.findAdminAssignment(adminUserId, centerId);

  if (!assignment) {
    throw new ApiError(403, 'No tenés permiso para gestionar este centro.');
  }
}

async function ensureActiveNameIsAvailable(name: string, ignoredCenterId?: string): Promise<void> {
  const normalizedName = normalizeNameForComparison(name);
  const activeCenters = await centersRepository.findActiveCenters();
  const duplicate = activeCenters.find((center) => {
    return center.id !== ignoredCenterId && normalizeNameForComparison(center.name) === normalizedName;
  });

  if (duplicate) {
    throw new ApiError(409, 'Ya existe un centro activo con ese nombre.');
  }
}

async function rollbackCreatedCenter(centerId: string): Promise<void> {
  try {
    await centersRepository.softDelete(centerId);
  } catch (error) {
    logCentersError('rollback-created-center', error);
  }
}

function normalizeCreateInput(
  input: CreateCenterInput
): Required<Pick<NormalizedCenterPayload, 'name'>> & Pick<NormalizedCenterPayload, 'address' | 'phone' | 'city' | 'province' | 'image_url'> {
  const name = normalizeRequiredName(input.name);

  return {
    name,
    address: normalizeAddress(input.address),
    phone: normalizePhone(input.phone),
    city: normalizeLocation(input.city, 'ciudad'),
    province: normalizeLocation(input.province, 'provincia'),
    image_url: normalizeNullableText(input.image_url ?? input.imageUrl)
  };
}

function normalizeUpdateInput(input: UpdateCenterInput): NormalizedCenterPayload {
  const payload: NormalizedCenterPayload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    payload.name = normalizeRequiredName(input.name);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'address')) {
    payload.address = normalizeAddress(input.address);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'phone')) {
    payload.phone = normalizePhone(input.phone);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'city')) {
    payload.city = normalizeLocation(input.city, 'ciudad');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'province')) {
    payload.province = normalizeLocation(input.province, 'provincia');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'image_url') || Object.prototype.hasOwnProperty.call(input, 'imageUrl')) {
    payload.image_url = normalizeNullableText(input.image_url ?? input.imageUrl);
  }

  return payload;
}

function normalizeRequiredName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'Ingresá un nombre válido.');
  }

  const normalized = normalizeDisplayText(value);

  if (!normalized) {
    throw new ApiError(400, 'Ingresá un nombre válido.');
  }

  if (normalized.length < CENTER_NAME_MIN_LENGTH) {
    throw new ApiError(400, 'El nombre debe tener al menos 2 caracteres.');
  }

  if (normalized.length > CENTER_NAME_MAX_LENGTH) {
    throw new ApiError(400, 'El nombre no puede superar los 80 caracteres.');
  }

  return normalized;
}

function normalizeAddress(value: unknown): string | null {
  const normalized = normalizeNullableText(value);

  if (normalized && normalized.length > CENTER_ADDRESS_MAX_LENGTH) {
    throw new ApiError(400, 'La dirección es demasiado larga.');
  }

  return normalized;
}

function normalizeLocation(value: unknown, field: 'ciudad' | 'provincia'): string | null {
  const normalized = normalizeNullableText(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > CENTER_LOCATION_MAX_LENGTH || /^\d+$/.test(normalized)) {
    throw new ApiError(400, field === 'ciudad' ? 'Ingresá una ciudad válida.' : 'Ingresá una provincia válida.');
  }

  return normalized;
}

function normalizePhone(value: unknown): string | null {
  const normalized = normalizeNullableText(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.length > CENTER_PHONE_MAX_LENGTH ||
    !CENTER_PHONE_ALLOWED_PATTERN.test(normalized) ||
    countDigits(normalized) < CENTER_PHONE_MIN_DIGITS
  ) {
    throw new ApiError(400, 'El teléfono no tiene un formato válido.');
  }

  return normalized;
}

function normalizeNullableText(value: unknown): string | null {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, 'Los datos del centro tienen un formato inválido.');
  }

  return normalizeDisplayText(value) || null;
}

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function normalizeDisplayText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeNameForComparison(value: string): string {
  return normalizeDisplayText(value).toLocaleLowerCase('es-AR');
}

function mapCreateCenterError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  logCentersError('create-center', error);

  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes('duplicate') ||
    message.includes('unique') ||
    message.includes('already exists')
  ) {
    return new ApiError(409, 'Ya existe un centro activo con ese nombre.');
  }

  return new ApiError(500, 'No pudimos crear el centro. Intentá nuevamente.');
}

function logCentersError(context: string, error: unknown): void {
  if (env.nodeEnv !== 'development') return;

  console.error('[centers:error]', {
    context,
    errorName: error instanceof Error ? error.name : typeof error,
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

function validateCenterImage(file: CenterImageFile | undefined): CenterImageFile {
  if (!file || file.size <= 0 || file.buffer.length === 0) {
    throw new ApiError(400, 'La imagen del centro es obligatoria.');
  }

  if (file.size > MAX_CENTER_IMAGE_SIZE_BYTES) {
    throw new ApiError(413, `La imagen no puede superar los ${MAX_CENTER_IMAGE_SIZE_MB} MB.`);
  }

  resolveCenterImageMimeType(file);
  return file;
}

function resolveCenterImageMimeType(file: CenterImageFile): string {
  const detectedMimeType = detectImageMimeType(file.buffer);
  const declaredMimeType = normalizeImageMimeType(file.mimetype);

  if (!detectedMimeType) {
    throw new ApiError(400, 'El archivo no parece ser una imagen válida.');
  }

  if (
    declaredMimeType &&
    declaredMimeType !== 'application/octet-stream' &&
    !ALLOWED_CENTER_IMAGE_MIME_TYPES.includes(declaredMimeType)
  ) {
    throw new ApiError(400, 'Formato no permitido. Usá JPG, PNG o WEBP.');
  }

  if (
    declaredMimeType &&
    declaredMimeType !== 'application/octet-stream' &&
    ALLOWED_CENTER_IMAGE_MIME_TYPES.includes(declaredMimeType) &&
    declaredMimeType !== detectedMimeType
  ) {
    throw new ApiError(400, 'El archivo no parece ser una imagen válida.');
  }

  return detectedMimeType;
}

function normalizeImageMimeType(mimeType?: string | null): string {
  if (mimeType === 'image/jpg') return 'image/jpeg';
  return mimeType ?? '';
}

function detectImageMimeType(buffer: Buffer): string | null {
  for (const mimeType of ALLOWED_CENTER_IMAGE_MIME_TYPES) {
    if (bufferMatchesMimeType(buffer, mimeType)) {
      return mimeType;
    }
  }

  return null;
}

function bufferMatchesMimeType(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  return false;
}

function buildCenterImagePath(centerId: string, mimeType: string): string {
  const extension = extensionFromMimeType(mimeType);
  const random = Math.random().toString(36).slice(2, 10);
  return `${centerId}/${Date.now()}-${random}.${extension}`;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function toCenterSummary(center: CenterRow, specialistsCount = 0): CenterSummary {
  return {
    id: center.id,
    name: center.name,
    address: center.address,
    phone: center.phone,
    city: center.city,
    province: center.province,
    imageUrl: center.image_url,
    isActive: center.is_active,
    specialistsCount,
    createdAt: center.created_at,
    updatedAt: center.updated_at
  };
}
