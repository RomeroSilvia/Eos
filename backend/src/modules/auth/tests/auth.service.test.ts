import { recordAuditLog } from '../../audit/audit.service';
import { authRepository } from '../auth.repository';
import { authService } from '../auth.service';

jest.mock('../auth.repository', () => ({
  authRepository: {
    createAuthUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithIdToken: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updatePasswordWithToken: jest.fn(),
    findProfileById: jest.fn(),
    upsertProfile: jest.fn(),
    createProfile: jest.fn()
  }
}));

jest.mock('../../audit/audit.service', () => ({
  recordAuditLog: jest.fn(async () => undefined)
}));

const mockedRepo = jest.mocked(authRepository);
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

describe('authService.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedRepo.createAuthUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'marta@example.com' } },
      error: null
    } as never);
    mockedRepo.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'marta@example.com' },
        session: { access_token: 'token-123' }
      },
      error: null
    } as never);
  });

  it('registra un usuario nuevo y emite auditoría de creación', async () => {
    const profile = makeProfile();
    mockedRepo.upsertProfile.mockResolvedValue(profile);

    const result = await authService.register({
      email: 'marta@example.com',
      password: 'Secreta123',
      username: 'marta',
      firstName: 'Marta',
      lastName: 'Lopez',
      role: 'user'
    });

    expect(result.profile).toEqual(profile);
    expect(mockedRecordAuditLog).toHaveBeenCalledWith({
      actorId: 'user-1',
      actorRole: 'user',
      action: 'create',
      entity: 'user_profile',
      entityId: 'user-1',
      after: profile
    });
  });

  it('registra un especialista con actorRole "specialist"', async () => {
    const profile = makeProfile({ role: 'specialist' });
    mockedRepo.upsertProfile.mockResolvedValue(profile);

    await authService.register({
      email: 'marta@example.com',
      password: 'Secreta123',
      username: 'marta',
      firstName: 'Marta',
      lastName: 'Lopez',
      role: 'specialist',
      specialty: 'dermatologo'
    });

    expect(mockedRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorRole: 'specialist', entity: 'user_profile', action: 'create' })
    );
  });

  it('no registra auditoría si la creación del usuario falla', async () => {
    mockedRepo.createAuthUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'email already registered' }
    } as never);

    await expect(
      authService.register({
        email: 'marta@example.com',
        password: 'Secreta123',
        username: 'marta',
        firstName: 'Marta',
        lastName: 'Lopez',
        role: 'user'
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockedRecordAuditLog).not.toHaveBeenCalled();
  });
});
