import { specialistsDirectoryRepository } from '../specialists.directory.repository';
import { specialistsDirectoryService } from '../specialists.directory.service';

type MockedSpecialist = {
  profile: {
    id: string;
    full_name: string;
    email: string;
    role: 'specialist';
  };
  specialistProfile: {
    specialty: 'dermatologo' | 'cosmetologo';
    license_status: 'verified';
    center: {
      id: string;
      name: string;
    } | null;
  };
};

jest.mock('../specialists.directory.repository', () => ({
  specialistsDirectoryRepository: {
    findVerifiedSpecialists: jest.fn(),
    findVerifiedSpecialistByUserId: jest.fn(),
    findActiveRelationByClientId: jest.fn(),
    findSpecialistProfileIdentityByUserId: jest.fn(),
    findRelationsBySpecialistIds: jest.fn(),
    findRelationBySpecialistAndClient: jest.fn(),
    findProfilesByIds: jest.fn(),
    findLatestSkinProfilesByUserIds: jest.fn(),
    findLatestRoutineLogsByUserIds: jest.fn(),
    findUnreadChatCountsByRelationIds: jest.fn(),
    findProfilePhotoById: jest.fn(),
    findRoutinesByUserId: jest.fn(),
    findRecentRoutineLogsByUserId: jest.fn(),
    findRoutineStepsByRoutineIds: jest.fn(),
    findStepLogsByRoutineLogIds: jest.fn(),
    findStepProductsByStepIds: jest.fn(),
    deactivateActiveRelation: jest.fn(),
    createRelation: jest.fn()
  }
}));

jest.mock('../../routines/routines.service', () => ({
  routinesService: {
    createRoutine: jest.fn()
  }
}));

jest.mock('../../notifications/notifications.service', () => ({
  notificationsService: {
    sendToUser: jest.fn().mockResolvedValue(undefined),
    saveNotification: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockedRepository = jest.mocked(specialistsDirectoryRepository);

const { routinesService } = jest.requireMock('../../routines/routines.service') as {
  routinesService: {
    createRoutine: jest.Mock;
  };
};

function makeSpecialist(id = 'specialist-1'): MockedSpecialist {
  return {
    profile: {
      id,
      full_name: 'Dra. Ana Perez',
      email: 'ana@example.com',
      role: 'specialist'
    },
    specialistProfile: {
      specialty: 'dermatologo',
      license_status: 'verified',
      center: null
    }
  };
}

describe('specialistsDirectoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRepository.findSpecialistProfileIdentityByUserId.mockResolvedValue(null);
    mockedRepository.findUnreadChatCountsByRelationIds.mockResolvedValue(new Map());
  });

  describe('searchSpecialists', () => {
    it('devuelve especialistas verificados sin email ni documentos privados', async () => {
      mockedRepository.findVerifiedSpecialists.mockResolvedValue([makeSpecialist()] as any);

      const result = await specialistsDirectoryService.searchSpecialists({});

      expect(result).toEqual([
        {
          id: 'specialist-1',
          fullName: 'Dra. Ana Perez',
          specialty: 'dermatologo',
          licenseStatus: 'verified',
          center: null
        }
      ]);
      expect(result[0]).not.toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('dni_photo_url');
      expect(result[0]).not.toHaveProperty('title_photo_url');
    });

    it('filtra especialistas por nombre normalizado', async () => {
      mockedRepository.findVerifiedSpecialists.mockResolvedValue([]);

      await specialistsDirectoryService.searchSpecialists({ name: '  ana  ' });

      expect(mockedRepository.findVerifiedSpecialists).toHaveBeenCalledWith({
        name: 'ana',
        specialty: undefined
      });
    });

    it('filtra especialistas por especialidad valida', async () => {
      mockedRepository.findVerifiedSpecialists.mockResolvedValue([]);

      await specialistsDirectoryService.searchSpecialists({ specialty: 'dermatologo' });

      expect(mockedRepository.findVerifiedSpecialists).toHaveBeenCalledWith({
        name: undefined,
        specialty: 'dermatologo'
      });
    });

    it('rechaza especialidad invalida con error controlado', async () => {
      await expect(
        specialistsDirectoryService.searchSpecialists({ specialty: 'cirujano' })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'specialty inválido.'
      });

      expect(mockedRepository.findVerifiedSpecialists).not.toHaveBeenCalled();
    });
  });

  describe('linkSpecialist', () => {
    it('crea una nueva relacion activa cuando el especialista es valido', async () => {
      mockedRepository.findVerifiedSpecialistByUserId.mockResolvedValue(makeSpecialist());
      mockedRepository.findActiveRelationByClientId.mockResolvedValue(null);
      mockedRepository.createRelation.mockResolvedValue({
        id: 'relation-1',
        client_id: 'user-1',
        specialist_id: 'specialist-1',
        status: 'active'
      } as any);

      const result = await specialistsDirectoryService.linkSpecialist('user-1', 'specialist-1');

      expect(mockedRepository.deactivateActiveRelation).toHaveBeenCalledWith('user-1');
      expect(mockedRepository.createRelation).toHaveBeenCalledWith({
        client_id: 'user-1',
        specialist_id: 'specialist-1',
        status: 'active'
      });
      expect(result).toMatchObject({
        relationId: 'relation-1',
        specialist: {
          id: 'specialist-1',
          fullName: 'Dra. Ana Perez',
          specialty: 'dermatologo'
        }
      });
    });

    it('reutiliza la relacion actual cuando ya esta vinculada al mismo especialista', async () => {
      mockedRepository.findVerifiedSpecialistByUserId.mockResolvedValue(makeSpecialist());
      mockedRepository.findActiveRelationByClientId.mockResolvedValue({
        id: 'relation-1',
        client_id: 'user-1',
        specialist_id: 'specialist-1',
        status: 'active'
      } as any);

      const result = await specialistsDirectoryService.linkSpecialist('user-1', 'specialist-1');

      expect(mockedRepository.createRelation).not.toHaveBeenCalled();
      expect(mockedRepository.deactivateActiveRelation).not.toHaveBeenCalled();
      expect(result.relationId).toBe('relation-1');
    });
  });

  describe('unlinkSpecialist', () => {
    it('desactiva la relacion activa del cliente', async () => {
      await specialistsDirectoryService.unlinkSpecialist('user-55');

      expect(mockedRepository.deactivateActiveRelation).toHaveBeenCalledWith('user-55');
    });
  });

  describe('getMyPatients', () => {
    it('devuelve solo pacientes asociados activos con piel y ultima actividad', async () => {
      mockedRepository.findRelationsBySpecialistIds.mockResolvedValue([
        {
          id: 'relation-1',
          client_id: 'client-1',
          specialist_id: 'specialist-1',
          status: 'active',
          created_at: '2026-05-01T10:00:00.000Z'
        },
        {
          id: 'relation-2',
          client_id: 'client-2',
          specialist_id: 'specialist-1',
          status: 'inactive',
          created_at: '2026-04-20T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findProfilesByIds.mockResolvedValue([
        { id: 'client-1', full_name: 'Camila Rodriguez', email: 'camila@example.com', skin_type: null },
        { id: 'client-2', full_name: 'Maria Ruiz', email: 'maria@example.com', skin_type: 'dry' }
      ] as any);
      mockedRepository.findLatestSkinProfilesByUserIds.mockResolvedValue(new Map([
        ['client-1', {
          user_id: 'client-1',
          skin_type: 'mixed',
          age_range: null,
          main_goal: 'Hidratacion',
          imperfections: null,
          routine_steps: null,
          created_at: '2026-05-01T10:00:00.000Z'
        }]
      ] as any));
      mockedRepository.findLatestRoutineLogsByUserIds.mockResolvedValue(new Map([
        ['client-1', {
          id: 'log-1',
          user_id: 'client-1',
          routine_id: 'routine-1',
          log_date: '2026-05-02',
          completed_at: null,
          completion_percentage: 100,
          created_at: '2026-05-02T10:00:00.000Z'
        }]
      ] as any));
      mockedRepository.findUnreadChatCountsByRelationIds.mockResolvedValue(new Map([
        ['relation-1', 2]
      ]));
      mockedRepository.findProfilePhotoById.mockResolvedValue(null);

      const result = await specialistsDirectoryService.getMyPatients('specialist-1');

      expect(mockedRepository.findRelationsBySpecialistIds).toHaveBeenCalledWith(['specialist-1']);
      expect(result).toEqual([
        expect.objectContaining({
          id: 'client-1',
          relationId: 'relation-1',
          status: 'active',
          skinType: 'mixed',
          unreadCount: 2,
          lastActivityAt: '2026-05-02'
        })
      ]);
    });

    it('mantiene la relacion mas reciente cuando hay historico duplicado del mismo paciente', async () => {
      mockedRepository.findRelationsBySpecialistIds.mockResolvedValue([
        {
          id: 'relation-new',
          client_id: 'client-1',
          specialist_id: 'specialist-1',
          status: 'active',
          created_at: '2026-05-10T10:00:00.000Z'
        },
        {
          id: 'relation-old',
          client_id: 'client-1',
          specialist_id: 'specialist-1',
          status: 'inactive',
          created_at: '2026-04-10T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findProfilesByIds.mockResolvedValue([
        { id: 'client-1', full_name: 'Camila Rodriguez', email: 'camila@example.com', skin_type: 'mixed' }
      ] as any);
      mockedRepository.findLatestSkinProfilesByUserIds.mockResolvedValue(new Map());
      mockedRepository.findLatestRoutineLogsByUserIds.mockResolvedValue(new Map());
      mockedRepository.findProfilePhotoById.mockResolvedValue(null);

      const result = await specialistsDirectoryService.getMyPatients('specialist-1');

      expect(mockedRepository.findProfilesByIds).toHaveBeenCalledWith(['client-1']);
      expect(result).toEqual([
        expect.objectContaining({
          relationId: 'relation-new',
          status: 'active',
          lastActivityAt: '2026-05-10T10:00:00.000Z'
        })
      ]);
    });

    it('busca relaciones tambien por specialist_profiles.id cuando existe el perfil profesional', async () => {
      mockedRepository.findSpecialistProfileIdentityByUserId.mockResolvedValue({
        id: 'specialist-profile-1',
        user_id: 'specialist-1'
      } as any);
      mockedRepository.findRelationsBySpecialistIds.mockResolvedValue([
        {
          id: 'relation-1',
          client_id: 'client-1',
          specialist_id: 'specialist-profile-1',
          status: 'active',
          created_at: '2026-05-10T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findProfilesByIds.mockResolvedValue([
        { id: 'client-1', full_name: 'Camila Rodriguez', email: 'camila@example.com', skin_type: 'mixed' }
      ] as any);
      mockedRepository.findLatestSkinProfilesByUserIds.mockResolvedValue(new Map());
      mockedRepository.findLatestRoutineLogsByUserIds.mockResolvedValue(new Map());
      mockedRepository.findProfilePhotoById.mockResolvedValue(null);

      const result = await specialistsDirectoryService.getMyPatients('specialist-1');

      expect(mockedRepository.findRelationsBySpecialistIds).toHaveBeenCalledWith([
        'specialist-1',
        'specialist-profile-1'
      ]);
      expect(result).toEqual([
        expect.objectContaining({
          id: 'client-1',
          relationId: 'relation-1',
          status: 'active'
        })
      ]);
    });

    it('no expone not_defined como tipo de piel visible', async () => {
      mockedRepository.findRelationsBySpecialistIds.mockResolvedValue([
        {
          id: 'relation-1',
          client_id: 'client-1',
          specialist_id: 'specialist-1',
          status: 'active',
          created_at: '2026-05-10T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findProfilesByIds.mockResolvedValue([
        { id: 'client-1', full_name: 'Camila Rodriguez', email: 'camila@example.com', skin_type: 'not_defined' }
      ] as any);
      mockedRepository.findLatestSkinProfilesByUserIds.mockResolvedValue(new Map());
      mockedRepository.findLatestRoutineLogsByUserIds.mockResolvedValue(new Map());
      mockedRepository.findProfilePhotoById.mockResolvedValue(null);

      const result = await specialistsDirectoryService.getMyPatients('specialist-1');

      expect(result[0].skinType).toBeNull();
    });

    it('usa el diagnostico del quiz cuando el perfil tiene not_defined', async () => {
      mockedRepository.findRelationsBySpecialistIds.mockResolvedValue([
        {
          id: 'relation-1',
          client_id: 'client-1',
          specialist_id: 'specialist-1',
          status: 'active',
          created_at: '2026-05-10T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findProfilesByIds.mockResolvedValue([
        { id: 'client-1', full_name: 'Camila Rodriguez', email: 'camila@example.com', skin_type: 'not_defined' }
      ] as any);
      mockedRepository.findLatestSkinProfilesByUserIds.mockResolvedValue(new Map([
        ['client-1', {
          user_id: 'client-1',
          skin_type: 'Mixta',
          age_range: '25-30',
          main_goal: 'Hidratar',
          imperfections: 'Manchas',
          routine_steps: 'Cinco pasos',
          created_at: '2026-05-11T10:00:00.000Z'
        }]
      ] as any));
      mockedRepository.findLatestRoutineLogsByUserIds.mockResolvedValue(new Map());
      mockedRepository.findProfilePhotoById.mockResolvedValue(null);

      const result = await specialistsDirectoryService.getMyPatients('specialist-1');

      expect(result[0].skinType).toBe('Mixta');
    });
  });

  describe('getMyPatientDetail', () => {
    it('bloquea el acceso cuando el paciente no esta asociado al especialista', async () => {
      mockedRepository.findRelationBySpecialistAndClient.mockResolvedValue(null);

      await expect(specialistsDirectoryService.getMyPatientDetail('specialist-1', 'client-9')).rejects.toMatchObject({
        statusCode: 403,
        message: 'No tenes acceso a este paciente.'
      });
    });

    it('devuelve detalle con rutinas e historial cuando la relacion existe', async () => {
      mockedRepository.findRelationBySpecialistAndClient.mockResolvedValue({
        id: 'relation-1',
        client_id: 'client-1',
        specialist_id: 'specialist-1',
        status: 'active',
        created_at: '2026-05-01T10:00:00.000Z'
      } as any);
      mockedRepository.findProfilesByIds.mockResolvedValue([
        { id: 'client-1', full_name: 'Camila Rodriguez', email: 'camila@example.com', skin_type: 'not_defined' }
      ] as any);
      mockedRepository.findLatestSkinProfilesByUserIds.mockResolvedValue(new Map([
        ['client-1', {
          user_id: 'client-1',
          skin_type: 'mixed',
          age_range: null,
          main_goal: null,
          imperfections: null,
          routine_steps: null,
          created_at: '2026-05-01T10:00:00.000Z'
        }]
      ] as any));
      mockedRepository.findProfilePhotoById.mockResolvedValue(null);
      mockedRepository.findRoutinesByUserId.mockResolvedValue([
        {
          id: 'routine-1',
          user_id: 'client-1',
          name: 'Limpieza e hidratacion',
          description: null,
          time_of_day: 'morning',
          is_active: true,
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findRecentRoutineLogsByUserId.mockResolvedValue([
        {
          id: 'log-1',
          user_id: 'client-1',
          routine_id: 'routine-1',
          log_date: '2026-05-02',
          completed_at: null,
          completion_percentage: 100,
          created_at: '2026-05-02T10:00:00.000Z',
          updated_at: '2026-05-02T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findRoutineStepsByRoutineIds.mockResolvedValue([
        {
          id: 'step-1',
          routine_id: 'routine-1',
          name: 'Gel limpiador',
          description: null,
          category: 'cleanser',
          step_order: 1,
          is_required: true,
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findStepLogsByRoutineLogIds.mockResolvedValue([
        {
          id: 'step-log-1',
          routine_log_id: 'log-1',
          step_id: 'step-1',
          is_completed: true,
          completed_at: null,
          created_at: '2026-05-02T10:00:00.000Z',
          updated_at: '2026-05-02T10:00:00.000Z'
        }
      ] as any);
      mockedRepository.findStepProductsByStepIds.mockResolvedValue([
        {
          step_id: 'step-1',
          product_id: 'product-1',
          product: { id: 'product-1', name: 'Gel suave', brand: 'EOS', category: 'cleanser' }
        }
      ] as any);

      const result = await specialistsDirectoryService.getMyPatientDetail('specialist-1', 'client-1');

      expect(result).toMatchObject({
        id: 'client-1',
        relationId: 'relation-1',
        skinType: 'mixed',
        routines: [
          {
            id: 'routine-1',
            steps: [
              {
                id: 'step-1',
                products: [{ id: 'product-1', name: 'Gel suave' }]
              }
            ]
          }
        ],
        history: [
          {
            id: 'log-1',
            routine: { id: 'routine-1', name: 'Limpieza e hidratacion' },
            steps: [{ id: 'step-1', isCompleted: true }]
          }
        ]
      });
    });
  });

  describe('assignRoutineToPatient', () => {
    it('asigna una rutina a un paciente con relacion activa', async () => {
      mockedRepository.findRelationBySpecialistAndClient.mockResolvedValue({
        id: 'relation-1',
        client_id: 'client-1',
        specialist_id: 'specialist-1',
        status: 'active',
        created_at: '2026-05-01T10:00:00.000Z'
      } as any);
      routinesService.createRoutine.mockResolvedValue({
        id: 'routine-1',
        user_id: 'client-1',
        assigned_by: 'specialist-1'
      });

      const result = await specialistsDirectoryService.assignRoutineToPatient('specialist-1', {
        clientId: 'client-1',
        name: 'Rutina indicada',
        description: 'Hidratacion',
        timeOfDay: 'morning'
      });

      expect(routinesService.createRoutine).toHaveBeenCalledWith({
        user_id: 'client-1',
        assigned_by: 'specialist-1',
        name: 'Rutina indicada',
        description: 'Hidratacion',
        time_of_day: 'morning',
        is_active: true
      });
      expect(result).toMatchObject({
        id: 'routine-1',
        user_id: 'client-1',
        assigned_by: 'specialist-1'
      });
    });

    it('rechaza asignar rutina a un paciente no vinculado', async () => {
      mockedRepository.findRelationBySpecialistAndClient.mockResolvedValue(null);

      await expect(
        specialistsDirectoryService.assignRoutineToPatient('specialist-1', {
          clientId: 'client-9',
          name: 'Rutina indicada'
        })
      ).rejects.toMatchObject({
        statusCode: 403
      });

      expect(routinesService.createRoutine).not.toHaveBeenCalled();
    });

    it('rechaza asignar rutina si la relacion esta inactiva', async () => {
      mockedRepository.findRelationBySpecialistAndClient.mockResolvedValue({
        id: 'relation-1',
        client_id: 'client-1',
        specialist_id: 'specialist-1',
        status: 'inactive',
        created_at: '2026-05-01T10:00:00.000Z'
      } as any);

      await expect(
        specialistsDirectoryService.assignRoutineToPatient('specialist-1', {
          clientId: 'client-1',
          name: 'Rutina indicada'
        })
      ).rejects.toMatchObject({
        statusCode: 403
      });

      expect(routinesService.createRoutine).not.toHaveBeenCalled();
    });

    it('convierte error de columna assigned_by faltante en error 500 controlado', async () => {
      mockedRepository.findRelationBySpecialistAndClient.mockResolvedValue({
        id: 'relation-1',
        client_id: 'client-1',
        specialist_id: 'specialist-1',
        status: 'active',
        created_at: '2026-05-01T10:00:00.000Z'
      } as any);

      routinesService.createRoutine.mockRejectedValue({
        code: 'PGRST204',
        message: "Could not find the 'assigned_by' column of 'routines' in the schema cache",
        details: null,
        hint: null
      });

      await expect(
        specialistsDirectoryService.assignRoutineToPatient('specialist-1', {
          clientId: 'client-1',
          name: 'Rutina indicada'
        })
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'No pudimos asignar la rutina en este momento.'
      });
    });
  });
});
