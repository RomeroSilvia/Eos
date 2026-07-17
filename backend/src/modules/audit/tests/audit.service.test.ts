import { ApiError } from '../../../utils/ApiError';
import { auditRepository } from '../audit.repository';
import { getAuditLogs, isIsoDate } from '../audit.service';

jest.mock('../audit.repository', () => ({
  auditRepository: {
    findAuditLogs: jest.fn()
  }
}));

const mockedRepo = jest.mocked(auditRepository);

function makeAuditLog(overrides = {}) {
  return {
    id: 'log-1',
    actor_id: 'admin-1',
    actor_role: 'center_admin',
    action: 'update',
    entity: 'center',
    entity_id: 'center-1',
    before: { name: 'Antes' },
    after: { name: 'Después' },
    metadata: null,
    created_at: '2026-07-01T12:00:00.000Z',
    ...overrides
  };
}

describe('auditService.getAuditLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRepo.findAuditLogs.mockResolvedValue({ data: [makeAuditLog()], total: 1 });
  });

  it('devuelve una página con los defaults de paginación cuando no se pasan filtros', async () => {
    const result = await getAuditLogs({});

    expect(mockedRepo.findAuditLogs).toHaveBeenCalledWith({
      entity: undefined,
      entityId: undefined,
      actorId: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: 20
    });
    expect(result).toEqual({
      items: [makeAuditLog()],
      total: 1,
      page: 1,
      limit: 20
    });
  });

  it('aplica los filtros de entity, entityId y actorId al repository', async () => {
    await getAuditLogs({ entity: 'routine', entityId: 'routine-1', actorId: 'admin-2' });

    expect(mockedRepo.findAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'routine',
        entityId: 'routine-1',
        actorId: 'admin-2'
      })
    );
  });

  it('rechaza un rango de fechas con "from" posterior a "to"', async () => {
    await expect(getAuditLogs({ from: '2026-07-10', to: '2026-07-01' })).rejects.toThrow(ApiError);
    expect(mockedRepo.findAuditLogs).not.toHaveBeenCalled();
  });

  it('rechaza una fecha "from" con formato inválido', async () => {
    await expect(getAuditLogs({ from: '10-07-2026' })).rejects.toThrow(ApiError);
  });

  it('limita el "limit" solicitado al máximo permitido', async () => {
    await getAuditLogs({ limit: '500' });

    expect(mockedRepo.findAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
  });

  it('rechaza un "page" no numérico o no positivo', async () => {
    await expect(getAuditLogs({ page: '0' })).rejects.toThrow(ApiError);
    await expect(getAuditLogs({ page: 'abc' })).rejects.toThrow(ApiError);
  });
});

describe('isIsoDate', () => {
  it('acepta fechas válidas en formato YYYY-MM-DD', () => {
    expect(isIsoDate('2026-07-17')).toBe(true);
  });

  it('rechaza formatos inválidos', () => {
    expect(isIsoDate('17/07/2026')).toBe(false);
    expect(isIsoDate('2026-13-40')).toBe(false);
  });
});
