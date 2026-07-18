import { ApiError } from '../../utils/ApiError';
import { recordAuditLog } from '../audit/audit.service';
import { profileRepository } from './profile.repository';

type UpdateProfileInput = {
  userId: string;
  role: string;
  fullName?: unknown;
};

export function getProfileHealth() {
  return {
    module: 'profile',
    status: 'ready'
  };
}

export async function updateMyProfile(input: UpdateProfileInput) {
  if (input.role === 'specialist') {
    throw new ApiError(403, 'No podés modificar estos datos desde Configuración.');
  }

  const fullName = normalizeFullName(input.fullName);

  try {
    const currentProfile = await profileRepository.findById(input.userId);

    if (!currentProfile) {
      throw new ApiError(404, 'Perfil no encontrado.');
    }

    const updatedProfile = await profileRepository.updateById(input.userId, {
      full_name: fullName,
      updated_at: new Date().toISOString()
    });

    void recordAuditLog({
      actorId: input.userId,
      actorRole: 'user',
      action: 'update',
      entity: 'user_profile',
      entityId: input.userId,
      before: currentProfile,
      after: updatedProfile
    });

    return updatedProfile;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(500, 'No pudimos actualizar tu perfil.');
  }
}

function normalizeFullName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'El nombre es obligatorio.');
  }

  const fullName = value.trim().replace(/\s+/g, ' ');

  if (fullName.length > 120) {
    throw new ApiError(400, 'El nombre es demasiado largo.');
  }

  return fullName;
}
