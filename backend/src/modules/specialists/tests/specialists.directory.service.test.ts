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

const mockedRepository = jest.mocked(specialistsDirectoryRepository);

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
      license_status: 'verified'
    }
  };
}

describe('specialistsDirectoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRepository.findSpecialistProfileIdentityByUserId.mockResolvedValue(null);
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
          licenseStatus: 'verified'
        }
      ]);
      expect(result[0]).not.toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('dni_photo_url');
      expect(result[0]).not.toHaveProperty('title_photo_url');
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
    it('devuelve pacientes asociados activos e inactivos con piel y ultima actividad', async () => {
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
      mockedRepository.findProfilePhotoById.mockResolvedValue(null);

      const result = await specialistsDirectoryService.getMyPatients('specialist-1');

      expect(mockedRepository.findRelationsBySpecialistIds).toHaveBeenCalledWith(['specialist-1']);
      expect(result).toEqual([
        expect.objectContaining({
          id: 'client-1',
          relationId: 'relation-1',
          status: 'active',
          skinType: 'mixed',
          lastActivityAt: '2026-05-02'
        }),
        expect.objectContaining({
          id: 'client-2',
          relationId: 'relation-2',
          status: 'inactive',
          skinType: 'dry',
          lastActivityAt: '2026-04-20T10:00:00.000Z'
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
        { id: 'client-1', full_name: 'Camila Rodriguez', email: 'camila@example.com', skin_type: null }
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
});
