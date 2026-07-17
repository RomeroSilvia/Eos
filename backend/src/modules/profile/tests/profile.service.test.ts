import { ApiError } from '../../../utils/ApiError';
import { recordAuditLog } from '../../audit/audit.service';
import { profileRepository } from '../profile.repository';
import { updateMyProfile } from '../profile.service';

jest.mock('../profile.repository', () => ({
  profileRepository: {
    findById: jest.fn(),
    updateById: jest.fn()
  }
}));

jest.mock('../../audit/audit.service', () => ({
  recordAuditLog: jest.fn(async () => undefined)
}));

const mockedRepo = jest.mocked(profileRepository);
const mockedRecordAuditLog = jest.mocked(recordAuditLog);

function makeProfile(overrides = {}) {
  return {
    id: 'user-1',
    full_name: 'Marta Lopez',
    email: 'marta@example.com',
    role: 'user',
    skin_type: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('profileService.updateMyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('actualiza el nombre y registra auditoría con before/after', async () => {
    const before = makeProfile();
    const after = makeProfile({ full_name: 'Marta Gómez', updated_at: '2026-07-17T12:00:00.000Z' });

    mockedRepo.findById.mockResolvedValue(before);
    mockedRepo.updateById.mockResolvedValue(after);

    const result = await updateMyProfile({ userId: 'user-1', role: 'user', fullName: 'Marta Gómez' });

    expect(mockedRepo.updateById).toHaveBeenCalledWith('user-1', expect.objectContaining({ full_name: 'Marta Gómez' }));
    expect(result).toEqual(after);
    expect(mockedRecordAuditLog).toHaveBeenCalledWith({
      actorId: 'user-1',
      actorRole: 'user',
      action: 'update',
      entity: 'user_profile',
      entityId: 'user-1',
      before,
      after
    });
  });

  it('rechaza modificar el perfil de un especialista', async () => {
    await expect(
      updateMyProfile({ userId: 'specialist-1', role: 'specialist', fullName: 'Nuevo Nombre' })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockedRecordAuditLog).not.toHaveBeenCalled();
  });

  it('perfil inexistente devuelve 404 sin registrar auditoría', async () => {
    mockedRepo.findById.mockResolvedValue(null);

    await expect(
      updateMyProfile({ userId: 'user-inexistente', role: 'user', fullName: 'Alguien' })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockedRepo.updateById).not.toHaveBeenCalled();
    expect(mockedRecordAuditLog).not.toHaveBeenCalled();
  });

  it('nombre vacío devuelve 400 sin consultar el repository', async () => {
    await expect(updateMyProfile({ userId: 'user-1', role: 'user', fullName: '  ' })).rejects.toMatchObject({
      statusCode: 400
    });

    expect(mockedRepo.findById).not.toHaveBeenCalled();
  });
});
