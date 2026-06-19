import { specialistsRepository } from '../specialists.repository';
import { specialistsService } from '../specialists.service';

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

jest.mock('../specialists.repository', () => ({
  specialistsRepository: {
    findVerifiedSpecialists: jest.fn(),
    findVerifiedSpecialistByUserId: jest.fn(),
    findActiveRelationByClientId: jest.fn(),
    deactivateActiveRelation: jest.fn(),
    createRelation: jest.fn()
  }
}));

const mockedRepository = jest.mocked(specialistsRepository);

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

describe('specialistsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      const result = await specialistsService.linkSpecialist('user-1', 'specialist-1');

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

      const result = await specialistsService.linkSpecialist('user-1', 'specialist-1');

      expect(mockedRepository.createRelation).not.toHaveBeenCalled();
      expect(mockedRepository.deactivateActiveRelation).not.toHaveBeenCalled();
      expect(result.relationId).toBe('relation-1');
    });
  });

  describe('unlinkSpecialist', () => {
    it('desactiva la relacion activa del cliente', async () => {
      await specialistsService.unlinkSpecialist('user-55');

      expect(mockedRepository.deactivateActiveRelation).toHaveBeenCalledWith('user-55');
    });
  });
});
