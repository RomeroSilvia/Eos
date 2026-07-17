import { ApiError } from '../../../utils/ApiError';
import { auditRepository } from '../audit.repository';
import { getAuditLogs, isIsoDate } from '../audit.service';

jest.mock('../audit.repository', () => ({
  auditRepository: {
    findAuditLogs: jest.fn(),
    findProfileNamesByIds: jest.fn(),
    findProfileIdsByRole: jest.fn(),
    findRoutineNamesByIds: jest.fn(),
    findProductNamesByIds: jest.fn(),
    findCenterNamesByIds: jest.fn(),
    findSpecialistProfileRows: jest.fn(),
    findSpecialtyByUserIds: jest.fn(),
    findSubscriptionRows: jest.fn(),
    findSubscriptionPlanNamesByIds: jest.fn(),
    findStepsWithProducts: jest.fn()
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
    mockedRepo.findProfileNamesByIds.mockResolvedValue(new Map());
    mockedRepo.findProfileIdsByRole.mockResolvedValue([]);
    mockedRepo.findRoutineNamesByIds.mockResolvedValue(new Map());
    mockedRepo.findProductNamesByIds.mockResolvedValue(new Map());
    mockedRepo.findCenterNamesByIds.mockResolvedValue(new Map([['center-1', 'Centro Norte']]));
    mockedRepo.findSpecialistProfileRows.mockResolvedValue([]);
    mockedRepo.findSpecialtyByUserIds.mockResolvedValue(new Map());
    mockedRepo.findSubscriptionRows.mockResolvedValue([]);
    mockedRepo.findSubscriptionPlanNamesByIds.mockResolvedValue(new Map());
    mockedRepo.findStepsWithProducts.mockResolvedValue(new Set());
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
      limit: 10
    });
    expect(result).toEqual({
      items: [
        {
          id: 'log-1',
          actorId: 'admin-1',
          actorRole: 'center_admin',
          actorName: 'Administrador de Centro',
          actorProfile: 'Administrador de Centro',
          action: 'update',
          entity: 'center',
          entityId: 'center-1',
          entityLabel: 'Centro Norte',
          routineStepDetail: null,
          before: { name: 'Antes' },
          after: { name: 'Después' },
          metadata: null,
          createdAt: '2026-07-01T12:00:00.000Z'
        }
      ],
      total: 1,
      page: 1,
      limit: 10
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

  it('resuelve actor "Usuario" para actorRole=user con su nombre de perfil', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [makeAuditLog({ actor_id: 'user-1', actor_role: 'user' })],
      total: 1
    });
    mockedRepo.findProfileNamesByIds.mockResolvedValue(new Map([['user-1', 'Marta Gómez']]));

    const result = await getAuditLogs({});

    expect(result.items[0].actorName).toBe('Marta Gómez');
    expect(result.items[0].actorProfile).toBe('Usuario');
  });

  it('resuelve actor "Especialista - {especialidad}" para actorRole=specialist', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [makeAuditLog({ actor_id: 'specialist-1', actor_role: 'specialist' })],
      total: 1
    });
    mockedRepo.findProfileNamesByIds.mockResolvedValue(new Map([['specialist-1', 'Dra. Pérez']]));
    mockedRepo.findSpecialtyByUserIds.mockResolvedValue(new Map([['specialist-1', 'dermatologo']]));

    const result = await getAuditLogs({});

    expect(result.items[0].actorName).toBe('Dra. Pérez');
    expect(result.items[0].actorProfile).toBe('Especialista - dermatologo');
  });

  it('marca entidad no encontrada cuando el lookup no devuelve nombre ni hay fallback en before/after', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [makeAuditLog({ before: { status: 'active' }, after: null })],
      total: 1
    });
    mockedRepo.findCenterNamesByIds.mockResolvedValue(new Map());

    const result = await getAuditLogs({});

    expect(result.items[0].entityLabel).toBe('Registro eliminado o no disponible');
  });

  it('usa el nombre de "before" como entityLabel cuando el registro ya no existe (eliminado)', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [makeAuditLog({ action: 'delete', before: { name: 'Centro Sur' }, after: null })],
      total: 1
    });
    mockedRepo.findCenterNamesByIds.mockResolvedValue(new Map());

    const result = await getAuditLogs({});

    expect(result.items[0].entityLabel).toBe('Centro Sur');
  });

  it('arma routineStepDetail cuando el metadata es de un paso de rutina, marcando hasProducts', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [
        makeAuditLog({
          entity: 'routine',
          entity_id: 'routine-1',
          metadata: { changeType: 'routine_step', stepId: 'step-1', stepName: 'Limpieza facial', category: 'am' }
        })
      ],
      total: 1
    });
    mockedRepo.findRoutineNamesByIds.mockResolvedValue(new Map([['routine-1', 'Rutina de Marta']]));
    mockedRepo.findStepsWithProducts.mockResolvedValue(new Set(['step-1']));

    const result = await getAuditLogs({});

    expect(mockedRepo.findStepsWithProducts).toHaveBeenCalledWith(['step-1']);
    expect(result.items[0].routineStepDetail).toEqual({
      category: 'am',
      stepName: 'Limpieza facial',
      hasProducts: true
    });
  });

  it('routineStepDetail.hasProducts es false cuando el paso no tiene productos vinculados', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [
        makeAuditLog({
          entity: 'routine',
          entity_id: 'routine-1',
          metadata: { changeType: 'routine_step', stepId: 'step-2', stepName: 'Hidratación', category: 'pm' }
        })
      ],
      total: 1
    });
    mockedRepo.findRoutineNamesByIds.mockResolvedValue(new Map([['routine-1', 'Rutina de Marta']]));
    mockedRepo.findStepsWithProducts.mockResolvedValue(new Set());

    const result = await getAuditLogs({});

    expect(result.items[0].routineStepDetail).toEqual({
      category: 'pm',
      stepName: 'Hidratación',
      hasProducts: false
    });
  });

  it('routineStepDetail es null cuando metadata no tiene forma de paso de rutina', async () => {
    const result = await getAuditLogs({});

    expect(mockedRepo.findStepsWithProducts).toHaveBeenCalledWith([]);
    expect(result.items[0].routineStepDetail).toBeNull();
  });

  it('reemplaza owner_id por el nombre resuelto cuando owner_type es user', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [
        makeAuditLog({
          entity: 'subscription',
          entity_id: 'sub-1',
          before: null,
          after: { id: 'sub-1', status: 'active', owner_id: 'user-1', owner_type: 'user', plan_id: 'plan-1' }
        })
      ],
      total: 1
    });
    mockedRepo.findProfileNamesByIds.mockResolvedValue(new Map([['user-1', 'Marta Gómez']]));

    const result = await getAuditLogs({});

    expect(result.items[0].after).toEqual({
      id: 'sub-1',
      status: 'active',
      owner_type: 'user',
      plan_id: 'plan-1',
      owner: 'Marta Gómez'
    });
  });

  it('reemplaza owner_id por el nombre resuelto cuando owner_type es center', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [
        makeAuditLog({
          entity: 'subscription',
          entity_id: 'sub-2',
          before: null,
          after: { id: 'sub-2', status: 'active', owner_id: 'center-1', owner_type: 'center', plan_id: 'plan-1' }
        })
      ],
      total: 1
    });
    mockedRepo.findCenterNamesByIds.mockResolvedValue(new Map([['center-1', 'Centro Norte']]));

    const result = await getAuditLogs({});

    expect(result.items[0].after).toEqual(
      expect.objectContaining({ owner: 'Centro Norte' })
    );
    expect(result.items[0].after).not.toHaveProperty('owner_id');
  });

  it('usa "No disponible" cuando el owner_id no se resuelve en profiles ni centers', async () => {
    mockedRepo.findAuditLogs.mockResolvedValue({
      data: [
        makeAuditLog({
          entity: 'subscription',
          entity_id: 'sub-3',
          before: null,
          after: { id: 'sub-3', owner_id: 'user-inexistente', owner_type: 'user' }
        })
      ],
      total: 1
    });
    mockedRepo.findProfileNamesByIds.mockResolvedValue(new Map());

    const result = await getAuditLogs({});

    expect(result.items[0].after).toEqual(expect.objectContaining({ owner: 'No disponible' }));
  });

  it('filtro entity=user_profile resuelve ids con role=user y los pasa como entityIdIn', async () => {
    mockedRepo.findProfileIdsByRole.mockResolvedValue(['user-1', 'user-2']);

    await getAuditLogs({ entity: 'user_profile' });

    expect(mockedRepo.findProfileIdsByRole).toHaveBeenCalledWith('user');
    expect(mockedRepo.findAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'user_profile', entityIdIn: ['user-1', 'user-2'] })
    );
  });

  it('filtro entity=user_profile sin usuarios devuelve página vacía sin consultar audit_logs', async () => {
    mockedRepo.findProfileIdsByRole.mockResolvedValue([]);

    const result = await getAuditLogs({ entity: 'user_profile' });

    expect(mockedRepo.findAuditLogs).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10 });
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
