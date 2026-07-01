import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { centersRepository } from './centers.repository';
import type {
  CenterDashboardSummary,
  CenterRow,
  CenterSummary,
  CreateCenterInput,
  UpdateCenterInput
} from './centers.types';

type NormalizedCenterPayload = {
  name?: string;
  address?: string | null;
  phone?: string | null;
};

export const centersService = {
  listCenters: async (adminUserId: string): Promise<CenterSummary[]> => {
    const centers = await centersRepository.findActiveByAdminId(adminUserId);
    return centers.map(toCenterSummary);
  },

  createCenter: async (adminUserId: string, input: CreateCenterInput): Promise<CenterSummary> => {
    const payload = normalizeCreateInput(input);
    await ensureActiveNameIsAvailable(payload.name);

    try {
      const center = await centersRepository.create(payload);
      await centersRepository.createAdminAssignment(adminUserId, center.id);

      return toCenterSummary(center);
    } catch (error) {
      throw mapCreateCenterError(error);
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
      throw new ApiError(404, 'Centro no encontrado o inactivo.');
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
    const specialistIds = specialists.map((specialist) => specialist.id);
    const relations = await centersRepository.findActiveClientRelationsBySpecialistIds(specialistIds);
    const clientIds = new Set(relations.map((relation) => relation.client_id));

    return {
      specialistsTotal: specialists.length,
      specialistsVerified: specialists.filter((specialist) => specialist.license_status === 'verified').length,
      specialistsPending: specialists.filter((specialist) => specialist.license_status === 'pending').length,
      clientsTotal: clientIds.size
    };
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
    throw new ApiError(404, 'Centro no encontrado o inactivo.');
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

function normalizeCreateInput(input: CreateCenterInput): Required<Pick<NormalizedCenterPayload, 'name'>> & Pick<NormalizedCenterPayload, 'address' | 'phone'> {
  const name = normalizeRequiredName(input.name);

  return {
    name,
    address: normalizeNullableText(input.address),
    phone: normalizeNullableText(input.phone)
  };
}

function normalizeUpdateInput(input: UpdateCenterInput): NormalizedCenterPayload {
  const payload: NormalizedCenterPayload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    payload.name = normalizeRequiredName(input.name);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'address')) {
    payload.address = normalizeNullableText(input.address);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'phone')) {
    payload.phone = normalizeNullableText(input.phone);
  }

  return payload;
}

function normalizeRequiredName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'El nombre del centro es obligatorio.');
  }

  const normalized = normalizeDisplayText(value);

  if (!normalized) {
    throw new ApiError(400, 'El nombre del centro es obligatorio.');
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

  if (
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('not authorized') ||
    message.includes('violates foreign key constraint')
  ) {
    return new ApiError(403, 'No tenés permiso para crear este centro.');
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

function toCenterSummary(center: CenterRow): CenterSummary {
  return {
    id: center.id,
    name: center.name,
    address: center.address,
    phone: center.phone,
    isActive: center.is_active,
    createdAt: center.created_at,
    updatedAt: center.updated_at
  };
}
