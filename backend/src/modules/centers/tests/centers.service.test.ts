import { ApiError } from '../../../utils/ApiError';
import { centersRepository } from '../centers.repository';
import { centersService } from '../centers.service';

jest.mock('../centers.repository', () => ({
  centersRepository: {
    create: jest.fn(),
    createAdminAssignment: jest.fn(),
    findActiveCenters: jest.fn(),
    findActiveClientRelationsBySpecialistIds: jest.fn(),
    findActiveByAdminId: jest.fn(),
    findAdminAssignment: jest.fn(),
    findById: jest.fn(),
    findProfilesByIds: jest.fn(),
    findSpecialistCountsByCenterIds: jest.fn(),
    findSpecialistsByCenterId: jest.fn(),
    findSpecialistStatsByCenterId: jest.fn(),
    getPublicUrl: jest.fn(),
    softDelete: jest.fn(),
    update: jest.fn(),
    uploadFile: jest.fn()
  }
}));

const mockedRepo = jest.mocked(centersRepository);

function makeCenter(overrides = {}) {
  return {
    id: 'center-1',
    name: 'Centro Norte',
    address: 'Av. Siempre Viva 123',
    phone: '1111-2222',
    city: 'CABA',
    province: 'Buenos Aires',
    image_url: 'https://cdn.local/center.jpg',
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
    mockedRepo.findSpecialistCountsByCenterIds.mockResolvedValue(new Map());
  });

  it('crea centro valido con ciudad provincia e imagen', async () => {
    mockedRepo.create.mockResolvedValue(makeCenter());
    mockedRepo.createAdminAssignment.mockResolvedValue(undefined);

    const result = await centersService.createCenter('admin-1', {
      name: '  Centro   Norte  ',
      address: ' Av. Siempre Viva 123 ',
      phone: ' 1111-2222 ',
      city: ' CABA ',
      province: ' Buenos   Aires ',
      imageUrl: ' https://cdn.local/center.jpg '
    });

    expect(mockedRepo.create).toHaveBeenCalledWith({
      name: 'Centro Norte',
      address: 'Av. Siempre Viva 123',
      phone: '1111-2222',
      city: 'CABA',
      province: 'Buenos Aires',
      image_url: 'https://cdn.local/center.jpg'
    });
    expect(mockedRepo.createAdminAssignment).toHaveBeenCalledWith('admin-1', 'center-1');
    expect(mockedRepo.findAdminAssignment).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'center-1',
      name: 'Centro Norte',
      address: 'Av. Siempre Viva 123',
      phone: '1111-2222',
      city: 'CABA',
      province: 'Buenos Aires',
      imageUrl: 'https://cdn.local/center.jpg',
      isActive: true,
      specialistsCount: 0,
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z'
    });
  });

  it('center_admin puede crear centro aunque no tenga centros previos', async () => {
    mockedRepo.create.mockResolvedValue(makeCenter({ id: 'center-new' }));
    mockedRepo.createAdminAssignment.mockResolvedValue(undefined);

    const result = await centersService.createCenter('admin-empty', { name: 'Centro Nuevo' });

    expect(mockedRepo.findAdminAssignment).not.toHaveBeenCalled();
    expect(mockedRepo.createAdminAssignment).toHaveBeenCalledWith('admin-empty', 'center-new');
    expect(result.id).toBe('center-new');
  });

  it('si falla crear relacion center_admins devuelve error amigable y baja el centro creado', async () => {
    mockedRepo.create.mockResolvedValue(makeCenter({ id: 'center-new' }));
    mockedRepo.createAdminAssignment.mockRejectedValue(new Error('violates foreign key constraint'));
    mockedRepo.softDelete.mockResolvedValue(makeCenter({ id: 'center-new', is_active: false }));

    const promise = centersService.createCenter('admin-1', { name: 'Centro Nuevo' });

    await expect(promise).rejects.toMatchObject({ statusCode: 500 });
    await expect(promise).rejects.toThrow('No pudimos crear el centro');

    expect(mockedRepo.softDelete).toHaveBeenCalledWith('center-new');
  });

  it('rechaza centro sin nombre', async () => {
    const promise = centersService.createCenter('admin-1', { name: '   ' });

    await expect(promise).rejects.toMatchObject({ statusCode: 400 });
    await expect(promise).rejects.toThrow('Ingres');
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('rechaza nombre de 1 caracter', async () => {
    await expect(
      centersService.createCenter('admin-1', { name: 'A' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'El nombre debe tener al menos 2 caracteres.'
    });
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('rechaza nombre de mas de 80 caracteres', async () => {
    await expect(
      centersService.createCenter('admin-1', { name: 'A'.repeat(81) })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'El nombre no puede superar los 80 caracteres.'
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

  it('acepta campos opcionales vacios', async () => {
    mockedRepo.create.mockResolvedValue(makeCenter({
      address: null,
      phone: null,
      city: null,
      province: null,
      image_url: null
    }));
    mockedRepo.createAdminAssignment.mockResolvedValue(undefined);

    const result = await centersService.createCenter('admin-1', {
      name: 'Centro Libre',
      address: '   ',
      phone: '',
      city: '',
      province: null,
      imageUrl: undefined
    });

    expect(mockedRepo.create).toHaveBeenCalledWith({
      name: 'Centro Libre',
      address: null,
      phone: null,
      city: null,
      province: null,
      image_url: null
    });
    expect(result).toEqual(expect.objectContaining({
      address: null,
      phone: null,
      city: null,
      province: null,
      imageUrl: null
    }));
  });

  it('rechaza telefono con letras', async () => {
    const promise = centersService.createCenter('admin-1', { name: 'Centro Norte', phone: '11 ABC 1234' });

    await expect(promise).rejects.toMatchObject({ statusCode: 400 });
    await expect(promise).rejects.toThrow('formato');
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('acepta telefono con simbolos permitidos', async () => {
    mockedRepo.create.mockResolvedValue(makeCenter({ phone: '+54 (11) 1234-5678' }));
    mockedRepo.createAdminAssignment.mockResolvedValue(undefined);

    await centersService.createCenter('admin-1', {
      name: 'Centro Norte',
      phone: ' +54 (11) 1234-5678 '
    });

    expect(mockedRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      phone: '+54 (11) 1234-5678'
    }));
  });

  it('rechaza telefono con menos de 6 digitos reales', async () => {
    const promise = centersService.createCenter('admin-1', { name: 'Centro Norte', phone: '+54 11' });

    await expect(promise).rejects.toMatchObject({ statusCode: 400 });
    await expect(promise).rejects.toThrow('formato');
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('rechaza ciudad numerica pura', async () => {
    const promise = centersService.createCenter('admin-1', { name: 'Centro Norte', city: '12345' });

    await expect(promise).rejects.toMatchObject({ statusCode: 400 });
    await expect(promise).rejects.toThrow('ciudad');
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('rechaza provincia numerica pura', async () => {
    const promise = centersService.createCenter('admin-1', { name: 'Centro Norte', province: '12345' });

    await expect(promise).rejects.toMatchObject({ statusCode: 400 });
    await expect(promise).rejects.toThrow('provincia');
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('edita centro con ciudad provincia e imagen', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.update.mockResolvedValue(makeCenter({
      name: 'Centro Sur',
      address: null,
      phone: '3333-4444',
      city: 'La Plata',
      province: 'Buenos Aires',
      image_url: 'https://cdn.local/sur.jpg'
    }));

    const result = await centersService.updateCenter('admin-1', 'center-1', {
      name: 'Centro Sur',
      address: null,
      phone: '3333-4444',
      city: 'La Plata',
      province: 'Buenos Aires',
      imageUrl: 'https://cdn.local/sur.jpg'
    });

    expect(mockedRepo.findAdminAssignment).toHaveBeenCalledWith('admin-1', 'center-1');
    expect(mockedRepo.update).toHaveBeenCalledWith('center-1', expect.objectContaining({
      name: 'Centro Sur',
      address: null,
      phone: '3333-4444',
      city: 'La Plata',
      province: 'Buenos Aires',
      image_url: 'https://cdn.local/sur.jpg'
    }));
    expect(result.name).toBe('Centro Sur');
    expect(result.city).toBe('La Plata');
    expect(result.imageUrl).toBe('https://cdn.local/sur.jpg');
  });

  it('lista centros con cantidad de especialistas asignados', async () => {
    mockedRepo.findActiveByAdminId.mockResolvedValue([
      makeCenter({ id: 'center-1' }),
      makeCenter({ id: 'center-2', name: 'Centro Sur' })
    ]);
    mockedRepo.findSpecialistCountsByCenterIds.mockResolvedValue(new Map([
      ['center-1', 2],
      ['center-2', 1]
    ]));

    const result = await centersService.listCenters('admin-1');

    expect(mockedRepo.findSpecialistCountsByCenterIds).toHaveBeenCalledWith(['center-1', 'center-2']);
    expect(result).toEqual([
      expect.objectContaining({ id: 'center-1', specialistsCount: 2 }),
      expect.objectContaining({ id: 'center-2', specialistsCount: 1 })
    ]);
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

    const promise = centersService.updateCenter('admin-1', 'center-1', { name: 'Centro Sur' });

    await expect(promise).rejects.toMatchObject({ statusCode: 403 });
    await expect(promise).rejects.toThrow('permiso');
    expect(mockedRepo.update).not.toHaveBeenCalled();
  });

  it('dashboard devuelve contadores', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.findSpecialistStatsByCenterId.mockResolvedValue([
      { id: 'specialist-profile-1', user_id: 'specialist-user-1', license_status: 'verified' },
      { id: 'specialist-profile-2', user_id: 'specialist-user-2', license_status: 'pending' },
      { id: 'specialist-profile-3', user_id: 'specialist-user-3', license_status: 'rejected' }
    ]);
    mockedRepo.findActiveClientRelationsBySpecialistIds.mockResolvedValue([
      { client_id: 'client-1' },
      { client_id: 'client-2' },
      { client_id: 'client-1' }
    ]);

    const result = await centersService.getDashboard('admin-1', 'center-1');

    expect(mockedRepo.findSpecialistStatsByCenterId).toHaveBeenCalledWith('center-1');
    expect(mockedRepo.findActiveClientRelationsBySpecialistIds).toHaveBeenCalledWith([
      'specialist-profile-1',
      'specialist-user-1',
      'specialist-profile-2',
      'specialist-user-2',
      'specialist-profile-3',
      'specialist-user-3'
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
      message: 'No encontramos este centro o fue dado de baja.'
    });
    expect(mockedRepo.findSpecialistStatsByCenterId).not.toHaveBeenCalled();
  });

  it('lista especialistas asignados al centro', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.findSpecialistsByCenterId.mockResolvedValue([
      {
        id: 'specialist-profile-1',
        user_id: 'user-1',
        specialty: 'dermatologo',
        license_status: 'verified',
        center_id: 'center-1'
      },
      {
        id: 'specialist-profile-2',
        user_id: 'user-2',
        specialty: 'cosmetologo',
        license_status: 'pending',
        center_id: 'center-1'
      }
    ]);
    mockedRepo.findProfilesByIds.mockResolvedValue([
      { id: 'user-1', full_name: 'Ana Perez', email: 'ana@example.com' },
      { id: 'user-2', full_name: 'Luz Gomez', email: null }
    ]);

    const result = await centersService.listCenterSpecialists('admin-1', 'center-1');

    expect(mockedRepo.findSpecialistsByCenterId).toHaveBeenCalledWith('center-1');
    expect(mockedRepo.findProfilesByIds).toHaveBeenCalledWith(['user-1', 'user-2']);
    expect(result).toEqual([
      {
        specialistProfileId: 'specialist-profile-1',
        userId: 'user-1',
        name: 'Ana Perez',
        email: 'ana@example.com',
        specialty: 'dermatologo',
        licenseStatus: 'verified',
        centerId: 'center-1'
      },
      {
        specialistProfileId: 'specialist-profile-2',
        userId: 'user-2',
        name: 'Luz Gomez',
        email: null,
        specialty: 'cosmetologo',
        licenseStatus: 'pending',
        centerId: 'center-1'
      }
    ]);
  });

  it('rechaza imagen con tipo invalido', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());

    await expect(
      centersService.uploadCenterImage('admin-1', 'center-1', makeImageFile({
        mimetype: 'application/pdf',
        buffer: validJpegBuffer()
      }))
    ).rejects.toMatchObject({
      statusCode: 400
    });
    await expect(
      centersService.uploadCenterImage('admin-1', 'center-1', makeImageFile({
        mimetype: 'application/pdf',
        buffer: validJpegBuffer()
      }))
    ).rejects.toThrow('Formato no permitido');
    expect(mockedRepo.uploadFile).not.toHaveBeenCalled();
  });

  it('rechaza imagen mayor a 5MB', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());

    await expect(
      centersService.uploadCenterImage('admin-1', 'center-1', makeImageFile({
        size: 5 * 1024 * 1024 + 1
      }))
    ).rejects.toMatchObject({
      statusCode: 413,
      message: 'La imagen no puede superar los 5 MB.'
    });
    expect(mockedRepo.uploadFile).not.toHaveBeenCalled();
  });

  it('devuelve error amigable si falla storage', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.uploadFile.mockRejectedValue(new Error('bucket not found'));

    await expect(
      centersService.uploadCenterImage('admin-1', 'center-1', makeImageFile())
    ).rejects.toMatchObject({
      statusCode: 500
    });
    await expect(
      centersService.uploadCenterImage('admin-1', 'center-1', makeImageFile())
    ).rejects.toThrow('No pudimos subir la imagen del centro');
    expect(mockedRepo.update).not.toHaveBeenCalled();
  });

  it('sube imagen valida y guarda imageUrl en el centro', async () => {
    mockedRepo.findById.mockResolvedValue(makeCenter());
    mockedRepo.uploadFile.mockResolvedValue(undefined);
    mockedRepo.getPublicUrl.mockReturnValue('https://cdn.local/center-1/image.jpg');
    mockedRepo.update.mockResolvedValue(makeCenter({ image_url: 'https://cdn.local/center-1/image.jpg' }));

    const result = await centersService.uploadCenterImage('admin-1', 'center-1', makeImageFile());

    expect(mockedRepo.uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      bucket: 'center-images',
      buffer: validJpegBuffer(),
      contentType: 'image/jpeg'
    }));
    expect(mockedRepo.update).toHaveBeenCalledWith('center-1', expect.objectContaining({
      image_url: 'https://cdn.local/center-1/image.jpg'
    }));
    expect(result.imageUrl).toBe('https://cdn.local/center-1/image.jpg');
  });
});

function validJpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0x00]);
}

function makeImageFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  const buffer = overrides.buffer ?? validJpegBuffer();

  return {
    fieldname: 'image',
    originalname: 'center.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer,
    size: buffer.length,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
    ...overrides
  };
}
