import { supabase } from '../../config/supabase';
import { createSupabaseUserClient } from '../../config/supabase';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { recordAuditLog } from '../audit/audit.service';
import {
  specialistsRegistrationRepository,
  type SpecialistSpecialty,
  type SpecialistStatus
} from './specialists.registration.repository';
import { specialistsSharedRepository } from './specialists.shared.repository';
import {
  ALLOWED_SPECIALTIES,
  SPECIALIST_DOCS_BUCKET,
  SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES,
  SPECIALIST_DOCUMENT_MAX_SIZE_BYTES
} from './specialists.constants';

type SpecialistRegisterBody = {
  specialty?: unknown;
  licenseNumber?: unknown;
};

type SpecialistFiles = Partial<Record<'dniPhoto' | 'titlePhoto', Express.Multer.File[]>>;

export const specialistsRegistrationService = {
  getHealth: () => ({
    module: 'specialist',
    status: 'ready'
  }),

  register: async (
    userId: string,
    accessToken: string,
    body: SpecialistRegisterBody,
    files: SpecialistFiles
  ) => {
    let stage = 'validacion';
    const userClient = createSupabaseUserClient(accessToken);

    try {
      logSpecialistRegisterDebug(stage, { userId });
      const specialty = normalizeRequiredString(body.specialty, 'specialty');
      const licenseNumber = normalizeRequiredString(body.licenseNumber, 'licenseNumber');
      const dniPhoto = getRequiredFile(files.dniPhoto, 'dniPhoto');
      const titlePhoto = getRequiredFile(files.titlePhoto, 'titlePhoto');

      if (!ALLOWED_SPECIALTIES.includes(specialty as typeof ALLOWED_SPECIALTIES[number])) {
        throw new ApiError(400, 'Especialidad inválida.');
      }

      stage = 'consulta perfil existente';
      logSpecialistRegisterDebug(stage, { userId });
      const existingUserProfile = await specialistsSharedRepository.findSpecialistProfileByUserId(userId, userClient);

      if (existingUserProfile) {
        throw new ApiError(409, 'Ya existe una solicitud de especialista para este usuario.');
      }

      stage = 'consulta matricula';
      logSpecialistRegisterDebug(stage, { userId });
      const existingProfile = await specialistsRegistrationRepository.findByLicenseNumber(licenseNumber);

      if (existingProfile) {
        throw new ApiError(409, 'Ese número de matrícula ya está registrado.');
      }

      stage = 'storage dni';
      logSpecialistRegisterDebug(stage, { userId, mimetype: dniPhoto.mimetype, size: dniPhoto.size });
      const dniPhotoUrl = await uploadSpecialistDocument(userClient, userId, 'dni', dniPhoto);

      stage = 'storage titulo';
      logSpecialistRegisterDebug(stage, { userId, mimetype: titlePhoto.mimetype, size: titlePhoto.size });
      const titlePhotoUrl = await uploadSpecialistDocument(userClient, userId, 'titulo', titlePhoto);

      stage = 'insert DB';
      logSpecialistRegisterDebug(stage, { userId });
      const profile = await specialistsRegistrationRepository.create(
        {
          user_id: userId,
          specialty,
          license_number: licenseNumber,
          dni_photo_url: dniPhotoUrl,
          title_photo_url: titlePhotoUrl,
          license_status: 'pending',
          rejection_reason: null
        },
        userClient
      );

      if (!profile) {
        throw new ApiError(500, 'No se pudo crear la solicitud de especialista.');
      }

      void recordAuditLog({
        actorId: userId,
        actorRole: 'specialist',
        action: 'create',
        entity: 'specialist_profile',
        entityId: profile.id,
        after: profile
      });

      return profile;
    } catch (error) {
      logSpecialistRegisterError(stage, error, { userId });

      if (error instanceof ApiError) {
        throw error;
      }

      throw mapDatabaseError(error);
    }
  },

  getStatus: async (userId: string): Promise<SpecialistStatus> => {
    const [profile, profileData] = await Promise.all([
      specialistsSharedRepository.findSpecialistProfileByUserId(userId),
      specialistsSharedRepository.findProfileById(userId)
    ]);
    const fullName = profileData?.full_name ?? null;

    if (!profile) {
      return {
        license_status: 'not_submitted',
        rejection_reason: null,
        specialty: null,
        license_number: null,
        full_name: fullName,
        center_id: null,
        centerId: null,
        center: null
      };
    }

    const centerId = getSpecialistCenterId(profile);
    const center = await specialistsSharedRepository.findActiveCenterById(centerId);

    return {
      license_status: profile.license_status as SpecialistStatus['license_status'],
      rejection_reason: profile.rejection_reason,
      specialty: profile.specialty as SpecialistSpecialty,
      license_number: profile.license_number,
      full_name: fullName,
      center_id: centerId,
      centerId,
      center
    };
  }
};

function getSpecialistCenterId(profile: unknown): string | null {
  const centerId = (profile as { center_id?: unknown; centerId?: unknown }).center_id
    ?? (profile as { center_id?: unknown; centerId?: unknown }).centerId;
  return typeof centerId === 'string' && centerId.trim() ? centerId : null;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, getRequiredFieldMessage(fieldName));
  }

  return value.trim();
}

function getRequiredFieldMessage(fieldName: string): string {
  if (fieldName === 'specialty') return 'La especialidad es obligatoria.';
  if (fieldName === 'licenseNumber') return 'La matrícula es obligatoria.';
  return `${fieldName} es obligatorio.`;
}

function getRequiredFile(files: Express.Multer.File[] | undefined, fieldName: string): Express.Multer.File {
  const file = files?.[0];

  if (!file) {
    throw new ApiError(400, getRequiredFileMessage(fieldName));
  }

  validateSpecialistDocument(file);

  return file;
}

function getRequiredFileMessage(fieldName: string): string {
  if (fieldName === 'dniPhoto') return 'La foto del DNI es obligatoria.';
  if (fieldName === 'titlePhoto') return 'La foto del título profesional es obligatoria.';
  return `${fieldName} es obligatorio.`;
}

async function uploadSpecialistDocument(
  client: typeof supabase,
  userId: string,
  documentType: 'dni' | 'titulo',
  file: Express.Multer.File
): Promise<string> {
  const ext = getImageExtension(file.originalname, file.mimetype);
  const path = `${userId}/${documentType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await client.storage
    .from(SPECIALIST_DOCS_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) {
    throw mapStorageUploadError(error.message);
  }

  return path;
}

function validateSpecialistDocument(file: Express.Multer.File): void {
  if (!SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ApiError(400, 'Formato no permitido. Usá JPG, PNG o WEBP.');
  }

  if (file.size > SPECIALIST_DOCUMENT_MAX_SIZE_BYTES) {
    throw new ApiError(413, 'La imagen es demasiado grande. Subí una imagen de hasta 5 MB.');
  }

  if (!hasValidDocumentSignature(file.buffer, file.mimetype)) {
    throw new ApiError(400, 'El archivo no tiene un formato válido.');
  }
}

function mapStorageUploadError(message: string): ApiError {
  const normalized = message.toLowerCase();

  if (normalized.includes('mime') || normalized.includes('content type')) {
    return new ApiError(400, 'Formato no permitido. Usá JPG, PNG o WEBP.');
  }

  if (normalized.includes('size') || normalized.includes('too large') || normalized.includes('payload')) {
    return new ApiError(413, 'La imagen es demasiado grande. Subí una imagen de hasta 5 MB.');
  }

  if (normalized.includes('policy') || normalized.includes('permission') || normalized.includes('row-level security')) {
    return new ApiError(500, 'No pudimos subir los documentos por permisos de almacenamiento. Revisá la configuración del bucket specialist-docs.');
  }

  return new ApiError(500, 'No pudimos subir los documentos. Intentá nuevamente.');
}

function mapDatabaseError(error: unknown): ApiError {
  const dbError = error as { code?: string; message?: string; details?: string };
  const message = `${dbError.message ?? ''} ${dbError.details ?? ''}`.toLowerCase();

  if (dbError.code === '23505' || message.includes('duplicate key')) {
    if (message.includes('user_id')) {
      return new ApiError(409, 'Ya existe una solicitud de especialista para este usuario.');
    }

    if (message.includes('license_number')) {
      return new ApiError(409, 'Ese número de matrícula ya está registrado.');
    }
  }

  return new ApiError(500, getEnvironmentMessage(
    `No pudimos guardar la solicitud de especialista. Detalle: ${sanitizeErrorMessage(dbError.message)}`,
    'No pudimos guardar la solicitud de especialista. Intentá nuevamente.'
  ));
}

function getEnvironmentMessage(developmentMessage: string, productionMessage: string): string {
  return env.nodeEnv === 'development' ? developmentMessage : productionMessage;
}

function sanitizeErrorMessage(message?: string): string {
  return message?.replace(/\s+/g, ' ').trim() || 'Error de base de datos';
}

function logSpecialistRegisterDebug(stage: string, meta: Record<string, unknown>): void {
  if (env.nodeEnv !== 'development') return;
  console.info('[specialist/register]', { stage, ...meta });
}

function logSpecialistRegisterError(stage: string, error: unknown, meta: Record<string, unknown>): void {
  if (env.nodeEnv !== 'development') return;
  console.error('[specialist/register:error]', {
    stage,
    ...meta,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error)
  });
}

function getImageExtension(filename: string | undefined, mimeType: string): string {
  const filenameExt = filename?.split('.').pop()?.toLowerCase();

  if (filenameExt && ['jpg', 'jpeg', 'png', 'webp'].includes(filenameExt)) {
    return filenameExt === 'jpeg' ? 'jpg' : filenameExt;
  }

  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

function hasValidDocumentSignature(buffer: Buffer | undefined, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  return false;
}
