import { ApiError } from '../../utils/ApiError';
import { specialistsDirectoryRepository } from './specialists.directory.repository';
import { ALLOWED_SPECIALTIES, type AllowedSpecialty } from './specialists.constants';

type SearchFilters = {
  specialty?: string;
  name?: string;
};

export const specialistsDirectoryService = {
  getHealth: () => ({
    module: 'specialists',
    status: 'ready'
  }),

  searchSpecialists: async (filters: SearchFilters) => {
    const specialty = normalizeSpecialty(filters.specialty);
    const name = normalizeOptionalString(filters.name);

    const rows = await specialistsDirectoryRepository.findVerifiedSpecialists({ specialty, name });

    return rows.map((row) => ({
      id: row.profile.id,
      fullName: row.profile.full_name,
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

    const specialist = await specialistsDirectoryRepository.findVerifiedSpecialistByUserId(specialistId);

    if (!specialist) {
      throw new ApiError(404, 'Especialista no encontrado o no verificado.');
    }

    const activeRelation = await specialistsDirectoryRepository.findActiveRelationByClientId(clientId);

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

    await specialistsDirectoryRepository.deactivateActiveRelation(clientId);

    const relation = await specialistsDirectoryRepository.createRelation({
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
    await specialistsDirectoryRepository.deactivateActiveRelation(clientId);
  },

  getMySpecialist: async (clientId: string) => {
    const relation = await specialistsDirectoryRepository.findActiveRelationByClientId(clientId);

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
    const specialistIds = await getSpecialistRelationIds(specialistId);
    const relations = await specialistsDirectoryRepository.findRelationsBySpecialistIds(specialistIds);

    if (relations.length === 0) {
      return [];
    }

    const clientIds = [...new Set(relations.map((relation) => relation.client_id))];
    const clients = await specialistsDirectoryRepository.findProfilesByIds(clientIds);
    const latestSkinProfiles = await specialistsDirectoryRepository.findLatestSkinProfilesByUserIds(clientIds);
    const latestRoutineLogs = await specialistsDirectoryRepository.findLatestRoutineLogsByUserIds(clientIds);
    const photos = await Promise.all(
      clients.map(async (client) => ({
        clientId: client.id,
        profileImageUrl: await specialistsDirectoryRepository.findProfilePhotoById(client.id)
      }))
    );
    const photoByClientId = new Map(photos.map((photo) => [photo.clientId, photo.profileImageUrl]));
    const relationByClientId = new Map<string, typeof relations[number]>();

    for (const relation of relations) {
      if (!relationByClientId.has(relation.client_id)) {
        relationByClientId.set(relation.client_id, relation);
      }
    }

    return clients
      .filter((client) => relationByClientId.has(client.id))
      .map((client) => ({
        relationId: relationByClientId.get(client.id)!.id,
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        status: relationByClientId.get(client.id)!.status,
        skinType: normalizeSkinType(client.skin_type ?? latestSkinProfiles.get(client.id)?.skin_type),
        skinProfile: latestSkinProfiles.get(client.id)
          ? {
              ageRange: latestSkinProfiles.get(client.id)!.age_range,
              mainGoal: latestSkinProfiles.get(client.id)!.main_goal,
              imperfections: latestSkinProfiles.get(client.id)!.imperfections,
              routineSteps: latestSkinProfiles.get(client.id)!.routine_steps
            }
          : null,
        profileImageUrl: photoByClientId.get(client.id) ?? null,
        lastActivityAt: resolveLastActivityAt(relationByClientId.get(client.id)!, latestRoutineLogs.get(client.id))
      }));
  },

  getMyPatientDetail: async (specialistId: string, patientId: string) => {
    const specialistIds = await getSpecialistRelationIds(specialistId);
    const relation = await specialistsDirectoryRepository.findRelationBySpecialistAndClient(specialistIds, patientId);

    if (!relation) {
      throw new ApiError(403, 'No tenes acceso a este paciente.');
    }

    const [client] = await specialistsDirectoryRepository.findProfilesByIds([patientId]);

    if (!client) {
      throw new ApiError(404, 'Paciente no encontrado.');
    }

    const [latestSkinProfiles, photos, routines, routineLogs] = await Promise.all([
      specialistsDirectoryRepository.findLatestSkinProfilesByUserIds([patientId]),
      specialistsDirectoryRepository.findProfilePhotoById(patientId),
      specialistsDirectoryRepository.findRoutinesByUserId(patientId),
      specialistsDirectoryRepository.findRecentRoutineLogsByUserId(patientId, 20)
    ]);

    const latestSkinProfile = latestSkinProfiles.get(patientId) ?? null;
    const routineIds = routines.map((routine) => routine.id);
    const routineLogIds = routineLogs.map((log) => log.id);
    const [steps, stepLogs] = await Promise.all([
      specialistsDirectoryRepository.findRoutineStepsByRoutineIds(routineIds),
      specialistsDirectoryRepository.findStepLogsByRoutineLogIds(routineLogIds)
    ]);
    const stepProducts = await specialistsDirectoryRepository.findStepProductsByStepIds(steps.map((step) => step.id));

    const routineById = new Map(routines.map((routine) => [routine.id, routine]));
    const stepsByRoutineId = groupBy(steps, (step) => step.routine_id);
    const stepLogsByRoutineLogId = groupBy(stepLogs, (stepLog) => stepLog.routine_log_id);
    const productsByStepId = groupBy(stepProducts, (stepProduct) => stepProduct.step_id);
    const latestRoutineLog = routineLogs[0] ?? null;

    return {
      relationId: relation.id,
      id: client.id,
      fullName: client.full_name,
      email: client.email,
      status: relation.status,
      skinType: normalizeSkinType(client.skin_type ?? latestSkinProfile?.skin_type),
      skinProfile: latestSkinProfile
        ? {
            ageRange: latestSkinProfile.age_range,
            mainGoal: latestSkinProfile.main_goal,
            imperfections: latestSkinProfile.imperfections,
            routineSteps: latestSkinProfile.routine_steps
          }
        : null,
      profileImageUrl: photos,
      lastActivityAt: resolveLastActivityAt(relation, latestRoutineLog ?? undefined),
      routines: routines.map((routine) => ({
        id: routine.id,
        name: routine.name,
        description: routine.description,
        timeOfDay: routine.time_of_day,
        isActive: routine.is_active,
        steps: (stepsByRoutineId.get(routine.id) ?? []).map((step) => ({
          id: step.id,
          name: step.name,
          description: step.description,
          category: step.category,
          order: step.step_order,
          products: (productsByStepId.get(step.id) ?? [])
            .map((link) => link.product)
            .filter(Boolean)
            .map((product) => ({
              id: product!.id,
              name: product!.name,
              brand: product!.brand,
              category: product!.category
            }))
        }))
      })),
      history: routineLogs.map((log) => {
        const routine = routineById.get(log.routine_id);
        const routineSteps = stepsByRoutineId.get(log.routine_id) ?? [];
        const completedStepIds = new Set(
          (stepLogsByRoutineLogId.get(log.id) ?? [])
            .filter((stepLog) => stepLog.is_completed)
            .map((stepLog) => stepLog.step_id)
        );

        return {
          id: log.id,
          date: log.log_date,
          completedAt: log.completed_at,
          completionPercentage: Number(log.completion_percentage ?? 0),
          routine: routine
            ? {
                id: routine.id,
                name: routine.name,
                description: routine.description
              }
            : null,
          steps: routineSteps.map((step) => ({
            id: step.id,
            name: step.name,
            isCompleted: completedStepIds.has(step.id),
            products: (productsByStepId.get(step.id) ?? [])
              .map((link) => link.product)
              .filter(Boolean)
              .map((product) => ({
                id: product!.id,
                name: product!.name,
                brand: product!.brand,
                category: product!.category
              }))
          }))
        };
      })
    };
  }
};

function resolveLastActivityAt(
  relation: { created_at?: string | null },
  latestRoutineLog?: { log_date?: string | null; completed_at?: string | null; created_at?: string | null }
): string | null {
  return latestRoutineLog?.completed_at ?? latestRoutineLog?.log_date ?? latestRoutineLog?.created_at ?? relation.created_at ?? null;
}

function normalizeSkinType(value?: string | null): string | null {
  if (!value || value === 'not_defined' || value === 'undefined' || value === 'unknown') {
    return null;
  }

  return value;
}

async function getSpecialistRelationIds(userId: string): Promise<string[]> {
  const specialistProfile = await specialistsDirectoryRepository.findSpecialistProfileIdentityByUserId(userId);
  return [...new Set([userId, specialistProfile?.id].filter((id): id is string => Boolean(id)))];
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }

  return grouped;
}

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
