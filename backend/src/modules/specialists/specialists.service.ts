import { ApiError } from '../../utils/ApiError';
import { specialistsRepository } from './specialists.repository';

type SearchFilters = {
  specialty?: string;
  name?: string;
};

const ALLOWED_SPECIALTIES = ['dermatologo', 'cosmetologo'] as const;

type AllowedSpecialty = typeof ALLOWED_SPECIALTIES[number];

export const specialistsService = {
  getHealth: () => ({
    module: 'specialists',
    status: 'ready'
  }),

  searchSpecialists: async (filters: SearchFilters) => {
    const specialty = normalizeSpecialty(filters.specialty);
    const name = normalizeOptionalString(filters.name);

    const rows = await specialistsRepository.findVerifiedSpecialists({ specialty, name });

    return rows.map((row) => ({
      id: row.profile.id,
      fullName: row.profile.full_name,
      email: row.profile.email,
      specialty: row.specialistProfile.specialty,
      licenseStatus: row.specialistProfile.license_status
    }));
  },

  linkSpecialist: async (clientId: string, specialistId: string) => {
    if (!specialistId.trim()) {
      throw new ApiError(400, 'specialistId es requerido.');
    }

    if (clientId === specialistId) {
      throw new ApiError(400, 'No podes vincularte con tu propio perfil.');
    }

    const specialist = await specialistsRepository.findVerifiedSpecialistByUserId(specialistId);

    if (!specialist) {
      throw new ApiError(404, 'Especialista no encontrado o no verificado.');
    }

    const activeRelation = await specialistsRepository.findActiveRelationByClientId(clientId);

    if (activeRelation?.specialist_id === specialistId) {
      return {
        relationId: activeRelation.id,
        specialist: {
          id: specialist.profile.id,
          fullName: specialist.profile.full_name,
          specialty: specialist.specialistProfile.specialty
        }
      };
    }

    await specialistsRepository.deactivateActiveRelation(clientId);

    const relation = await specialistsRepository.createRelation({
      client_id: clientId,
      specialist_id: specialistId,
      status: 'active'
    });

    return {
      relationId: relation.id,
      specialist: {
        id: specialist.profile.id,
        fullName: specialist.profile.full_name,
        specialty: specialist.specialistProfile.specialty
      }
    };
  },

  unlinkSpecialist: async (clientId: string) => {
    await specialistsRepository.deactivateActiveRelation(clientId);
  },

  getMySpecialist: async (clientId: string) => {
    const relation = await specialistsRepository.findActiveRelationByClientId(clientId);

    if (!relation?.specialist) {
      return null;
    }

    return {
      relationId: relation.id,
      specialist: {
        id: relation.specialist.id,
        fullName: relation.specialist.full_name,
        email: relation.specialist.email,
        specialty: relation.specialistProfile?.specialty ?? null
      }
    };
  },

  getMyPatients: async (specialistId: string) => {
    const relations = await specialistsRepository.findActiveRelationsBySpecialistId(specialistId);

    if (relations.length === 0) {
      return [];
    }

    const clientIds = relations.map((relation) => relation.client_id);
    const clients = await specialistsRepository.findProfilesByIds(clientIds);
    const latestSkinTypes = await specialistsRepository.findLatestSkinTypesByUserIds(clientIds);
    const photos = await Promise.all(
      clients.map(async (client) => ({
        clientId: client.id,
        profileImageUrl: await specialistsRepository.findProfilePhotoById(client.id)
      }))
    );
    const photoByClientId = new Map(photos.map((photo) => [photo.clientId, photo.profileImageUrl]));
    const relationByClientId = new Map(relations.map((relation) => [relation.client_id, relation]));

    return clients
      .filter((client) => relationByClientId.has(client.id))
      .map((client) => ({
        relationId: relationByClientId.get(client.id)!.id,
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        skinType: client.skin_type ?? latestSkinTypes.get(client.id) ?? 'mixed',
        profileImageUrl: photoByClientId.get(client.id) ?? null
      }));
  }
};

function normalizeOptionalString(value?: string): string | undefined {
  if (!value) return undefined;

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeSpecialty(value?: string): AllowedSpecialty | undefined {
  if (!value) return undefined;

  if (ALLOWED_SPECIALTIES.includes(value as AllowedSpecialty)) {
    return value as AllowedSpecialty;
  }

  throw new ApiError(400, 'specialty inválido.');
}
