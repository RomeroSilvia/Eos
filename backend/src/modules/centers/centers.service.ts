import { ApiError } from '../../utils/ApiError';
import { centersRepository } from './centers.repository';
import type { CenterRow, CenterSummary, CreateCenterInput, UpdateCenterInput } from './centers.types';

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

    const center = await centersRepository.create(payload);
    await centersRepository.createAdminAssignment(adminUserId, center.id);

    return toCenterSummary(center);
  },

  updateCenter: async (
    adminUserId: string,
    centerId: string,
    input: UpdateCenterInput
  ): Promise<CenterSummary> => {
    const center = await getActiveCenterOrThrow(centerId);
    await ensureAdminCanAccessCenter(adminUserId, center.id);

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
    const center = await getActiveCenterOrThrow(centerId);
    await ensureAdminCanAccessCenter(adminUserId, center.id);

    const deleted = await centersRepository.softDelete(center.id);

    if (!deleted) {
      throw new ApiError(404, 'Centro no encontrado o inactivo.');
    }
  }
};

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
