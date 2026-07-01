import { ApiError } from '../../../utils/ApiError';
import { centersRepository } from '../centers.repository';
import { centersService } from '../centers.service';

jest.mock('../centers.repository', () => ({
  centersRepository: {
    create: jest.fn(),
    createAdminAssignment: jest.fn(),
    findActiveCenters: jest.fn(),
    findActiveClientRelationsBySpecialistIds: jest.fn(),
    findAdminAssignment: jest.fn(),
    findById: jest.fn(),
    findSpecialistStatsByCenterId: jest.fn(),
    softDelete: jest.fn(),
    update: jest.fn()
  }
}));

const mockedRepo = jest.mocked(centersRepository);

function makeCenter(overrides = {}) {
  return {
    id: 'center-1',
    name: 'Centro Norte',
    address: 'Av. Siempre Viva 123',
    phone: '1111-2222',
    is_active: true,
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-01T12:00:00.000Z',
    ...overrides
  };
}

function makeAssignment(overrides = {}) {
  return {
    id: 'assignment-1',
    user_id: 'admin-1',
    center_id: 'center-1',
    role: 'center_admin',
    created_at: '2026-07-01T12:00:00.000Z',
    ...overrides
  };
}

describe('centersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRepo.findActiveCenters.mockResolvedValue([]);
    mockedRepo.findAdminAssignment.mockResolvedValue(makeAssignment());
  });

  it('crea centro valido', async () => {
    mockedRepo.create.mockResolvedValue(makeCenter());
    mockedRepo.createAdminAssignment.mockResolvedValue(undefined);

    const result = await centersService.createCenter('admin-1', {
      name: '  Centro   Norte  ',
      address: ' Av. Siempre Viva 123 ',
      phone: ' 1111-2222 '
    });

    expect(mockedRepo.create).toHaveBeenCalledWith({
      name: 'Centro Norte',
      address: 'Av. Siempre Viva 123',
      phone: '1111-2222'
    });
    expect(mockedRepo.createAdminAssignment).toHaveBeenCalledWith('admin-1', 'center-1');
    expect(result).toEqual({
      id: 'center-1',
      name: 'Centro Norte',
      address: 'Av. Siempre Viva 123',
      phone: '1111-2222',
      isActive: true,
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z'
    });
  });

  it('rechaza centro sin nombre', async () => {
    await expect(
      centersService.createCenter('admin-1', { name: '   ' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'El nombre del centro es obligatorio.'
    });
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('rechaza centro duplicado activo', async () => {
    mockedRepo.findActiveCenters.mockResolvedValue([makeCenter({ name: 'Centro Norte' })]);

    await expect(
      centersService.createCenter('admin-1', { name: ' centro   norte ' })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Ya existe un centro activo con ese nombre.'
    });
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('edita centro', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.update.mockResolvedValue(makeCenter({
      name: 'Centro Sur',
      address: null,
      phone: '3333-4444'
    }));

    const result = await centersService.updateCenter('admin-1', 'center-1', {
      name: 'Centro Sur',
      address: null,
      phone: '3333-4444'
    });

    expect(mockedRepo.findAdminAssignment).toHaveBeenCalledWith('admin-1', 'center-1');
    expect(mockedRepo.update).toHaveBeenCalledWith('center-1', expect.objectContaining({
      name: 'Centro Sur',
      address: null,
      phone: '3333-4444'
    }));
    expect(result.name).toBe('Centro Sur');
  });

  it('baja centro con soft delete', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.softDelete.mockResolvedValue(makeCenter({ is_active: false }));

    await centersService.deleteCenter('admin-1', 'center-1');

    expect(mockedRepo.softDelete).toHaveBeenCalledWith('center-1');
  });

  it('rechaza acceso a centro ajeno', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.findAdminAssignment.mockResolvedValue(null);

    await expect(
      centersService.updateCenter('admin-1', 'center-1', { name: 'Centro Sur' })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'No tenés permiso para gestionar este centro.'
    });
    expect(mockedRepo.update).not.toHaveBeenCalled();
  });

  it('dashboard devuelve contadores', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.findSpecialistStatsByCenterId.mockResolvedValue([
      { id: 'specialist-1', license_status: 'verified' },
      { id: 'specialist-2', license_status: 'pending' },
      { id: 'specialist-3', license_status: 'rejected' }
    ]);
    mockedRepo.findActiveClientRelationsBySpecialistIds.mockResolvedValue([
      { client_id: 'client-1' },
      { client_id: 'client-2' },
      { client_id: 'client-1' }
    ]);

    const result = await centersService.getDashboard('admin-1', 'center-1');

    expect(mockedRepo.findSpecialistStatsByCenterId).toHaveBeenCalledWith('center-1');
    expect(mockedRepo.findActiveClientRelationsBySpecialistIds).toHaveBeenCalledWith([
      'specialist-1',
      'specialist-2',
      'specialist-3'
    ]);
    expect(result).toEqual({
      specialistsTotal: 3,
      specialistsVerified: 1,
      specialistsPending: 1,
      clientsTotal: 2
    });
  });

  it('dashboard rechaza centro inexistente o inactivo', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter({ is_active: false }));

    await expect(
      centersService.getDashboard('admin-1', 'center-1')
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Centro no encontrado o inactivo.'
    });
    expect(mockedRepo.findSpecialistStatsByCenterId).not.toHaveBeenCalled();
  });
});
