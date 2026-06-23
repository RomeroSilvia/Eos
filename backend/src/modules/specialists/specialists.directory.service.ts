import { ApiError } from '../../utils/ApiError';
import { specialistsDirectoryRepository } from './specialists.directory.repository';
import { routinesService } from '../routines/routines.service';
import { notificationsService } from '../notifications/notifications.service';
import { ALLOWED_SPECIALTIES, type AllowedSpecialty } from './specialists.constants';

type SearchFilters = {
  specialty?: string;
  name?: string;
};

type AssignRoutineInput = {
  clientId: string;
  name: string;
  description?: string | null;
  timeOfDay?: string | null;
  isActive?: boolean;
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
    const relations = (await specialistsDirectoryRepository.findRelationsBySpecialistIds(specialistIds))
      .filter((relation) => relation.status === 'active');

    if (relations.length === 0) {
      return [];
    }

    const clientIds = [...new Set(relations.map((relation) => relation.client_id))];
    const relationIds = relations.map((relation) => relation.id);

    const clients = await specialistsDirectoryRepository.findProfilesByIds(clientIds);
    const latestSkinProfiles = await specialistsDirectoryRepository.findLatestSkinProfilesByUserIds(clientIds);
    const latestRoutineLogs = await specialistsDirectoryRepository.findLatestRoutineLogsByUserIds(clientIds);
    const unreadCounts = await specialistsDirectoryRepository.findUnreadChatCountsByRelationIds(relationIds, specialistId);
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
        unreadCount: unreadCounts.get(relationByClientId.get(client.id)!.id) ?? 0,
        lastActivityAt: resolveLastActivityAt(relationByClientId.get(client.id)!, latestRoutineLogs.get(client.id))
      }));
  },

  getMyPatientDetail: async (specialistId: string, patientId: string) => {
    const specialistIds = await getSpecialistRelationIds(specialistId);
    const relation = await specialistsDirectoryRepository.findRelationBySpecialistAndClient(specialistIds, patientId);

    if (!relation || relation.status !== 'active') {
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
  },

  assignRoutineToPatient: async (specialistId: string, input: AssignRoutineInput) => {
    const specialistIds = await getSpecialistRelationIds(specialistId);
    const relation = await specialistsDirectoryRepository.findRelationBySpecialistAndClient(
      specialistIds,
      input.clientId
    );

    if (!relation || relation.status !== 'active') {
      throw new ApiError(403, 'No tenés una relación activa con este paciente.');
    }

    const name = normalizeRequiredRoutineName(input.name);
    const timeOfDay = normalizeRoutineTimeOfDay(input.timeOfDay);

    try {
      const routine = await routinesService.createRoutine({
        user_id: input.clientId,
        assigned_by: specialistId,
        name,
        description: input.description ?? null,
        time_of_day: timeOfDay,
        is_active: input.isActive ?? true
      });

      const title = 'Nueva rutina asignada';
      const body = `Tu especialista te asignó la rutina "${name}".`;
      await notificationsService.sendToUser(input.clientId, title, body, { kind: 'routine-assigned' });
      await notificationsService.saveNotification(input.clientId, title, body, 'routine-assigned');

      return routine;
    } catch (error) {
      if (isMissingAssignedByColumnError(error)) {
        console.error('[specialists.assignRoutineToPatient] Missing DB column routines.assigned_by. Apply migration database/e2_m4_assigned_routines.sql', {
          specialistId,
          clientId: input.clientId,
          error
        });

        throw new ApiError(500, 'No pudimos asignar la rutina en este momento.');
      }

      throw error;
    }
  }
};

function isMissingAssignedByColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const normalized = error as {
    code?: string;
    message?: string;
    details?: string;
  };

  const combinedText = [normalized.message, normalized.details]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  if (!combinedText.includes('assigned_by')) {
    return false;
  }

  return normalized.code === '42703' || normalized.code === 'PGRST204';
}

function normalizeRequiredRoutineName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'El nombre de la rutina es obligatorio.');
  }

  return value.trim();
}

function normalizeRoutineTimeOfDay(value: unknown): 'morning' | 'night' | 'custom' | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value === 'morning' || value === 'night' || value === 'custom') {
    return value;
  }

  throw new ApiError(400, 'Tipo de rutina inválido.');
}

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
