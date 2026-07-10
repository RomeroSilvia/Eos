import { ApiError } from '../../../utils/ApiError';
import { supabase } from '../../../config/supabase';
import { ensureAdminCanAccessActiveCenter } from '../../centers/centers.service';
import { adminRepository } from '../admin.repository';
import { adminService, normalizeSpecialistDocumentPath } from '../admin.service';

jest.mock('../../../config/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn()
    }
  }
}));

jest.mock('../admin.repository', () => ({
  adminRepository: {
    findActiveCentersByIds: jest.fn(),
    findSpecialistById: jest.fn(),
    findPendingSpecialists: jest.fn(),
    findProfilesByIds: jest.fn(),
    findSpecialistDocumentsById: jest.fn(),
    updateSpecialistCenter: jest.fn(),
    updateSpecialistStatus: jest.fn()
  }
}));

jest.mock('../../centers/centers.service', () => ({
  ensureAdminCanAccessActiveCenter: jest.fn()
}));

const mockedRepo = jest.mocked(adminRepository);
const mockedEnsureCenterAccess = jest.mocked(ensureAdminCanAccessActiveCenter);
const mockedStorageFrom = supabase.storage.from as jest.Mock;
let mockedCreateSignedUrl: jest.Mock;
let mockedList: jest.Mock;

function makeSpecialist(overrides = {}) {
  return {
    id: 'specialist-profile-1',
    user_id: 'user-1',
    specialty: 'dermatologo',
    license_number: 'MN-12345',
    license_status: 'pending',
    rejection_reason: null,
    center_id: null,
    created_at: '2026-06-19T12:00:00.000Z',
    ...overrides
  };
}

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList = jest.fn().mockResolvedValue({
      data: [],
      error: null
    });
    mockedCreateSignedUrl = jest.fn((path: string) => Promise.resolve({
      data: { signedUrl: `https://signed.example/${path}` },
      error: null
    }));
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: mockedCreateSignedUrl,
      list: mockedList
    });
    mockedRepo.findActiveCentersByIds.mockResolvedValue([]);
  });

  it('center_admin puede listar especialistas pendientes sin documentos sensibles', async () => {
    mockedRepo.findPendingSpecialists.mockResolvedValue([
      {
        ...makeSpecialist(),
        dni_photo_url: 'privado/dni.jpg',
        title_photo_url: 'privado/titulo.jpg'
      } as never
    ]);
    mockedRepo.findProfilesByIds.mockResolvedValue([
      { id: 'user-1', full_name: 'Marta Lopez', email: 'marta@example.com' }
    ]);

    const result = await adminService.listPendingSpecialists();

    expect(result).toEqual([
      {
        specialistProfileId: 'specialist-profile-1',
        userId: 'user-1',
        fullName: 'Marta Lopez',
        email: 'marta@example.com',
        specialty: 'dermatologo',
        licenseNumber: 'MN-12345',
        licenseStatus: 'pending',
        rejectionReason: null,
        centerId: null,
        center: null,
        createdAt: '2026-06-19T12:00:00.000Z'
      }
    ]);
    expect(result[0]).not.toHaveProperty('dni_photo_url');
    expect(result[0]).not.toHaveProperty('title_photo_url');
  });

  it('center_admin puede aprobar especialista', async () => {
    mockedRepo.updateSpecialistStatus.mockResolvedValue(makeSpecialist({ license_status: 'verified' }));
    mockedRepo.findProfilesByIds.mockResolvedValue([
      { id: 'user-1', full_name: 'Marta Lopez', email: 'marta@example.com' }
    ]);

    const result = await adminService.updateSpecialistStatus('specialist-profile-1', {
      licenseStatus: 'verified'
    });

    expect(mockedRepo.updateSpecialistStatus).toHaveBeenCalledWith('specialist-profile-1', {
      license_status: 'verified',
      rejection_reason: null
    });
    expect(mockedEnsureCenterAccess).not.toHaveBeenCalled();
    expect(result.licenseStatus).toBe('verified');
    expect(result.rejectionReason).toBeNull();
  });

  it('center_admin puede rechazar especialista con motivo', async () => {
    mockedRepo.updateSpecialistStatus.mockResolvedValue(makeSpecialist({
      license_status: 'rejected',
      rejection_reason: 'Documento ilegible'
    }));
    mockedRepo.findProfilesByIds.mockResolvedValue([
      { id: 'user-1', full_name: 'Marta Lopez', email: 'marta@example.com' }
    ]);

    const result = await adminService.updateSpecialistStatus('specialist-profile-1', {
      licenseStatus: 'rejected',
      rejectionReason: 'Documento ilegible'
    });

    expect(mockedRepo.updateSpecialistStatus).toHaveBeenCalledWith('specialist-profile-1', {
      license_status: 'rejected',
      rejection_reason: 'Documento ilegible'
    });
    expect(mockedEnsureCenterAccess).not.toHaveBeenCalled();
    expect(result.licenseStatus).toBe('rejected');
    expect(result.rejectionReason).toBe('Documento ilegible');
  });

  it('rechazar sin motivo devuelve 400', async () => {
    await expect(
      adminService.updateSpecialistStatus('specialist-profile-1', { licenseStatus: 'rejected' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'El motivo de rechazo es obligatorio.'
    });
  });

  it('status invalido devuelve 400', async () => {
    await expect(
      adminService.updateSpecialistStatus('specialist-profile-1', { licenseStatus: 'pending' })
    ).rejects.toThrow(ApiError);
  });

  it('devuelve 409 cuando no se actualiza ninguna fila', async () => {
    mockedRepo.updateSpecialistStatus.mockResolvedValue(null);

    await expect(
      adminService.updateSpecialistStatus('specialist-profile-1', { licenseStatus: 'verified' })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'La solicitud ya fue procesada.'
    });
  });

  it('devuelve 409 si la solicitud ya estaba verified', async () => {
    mockedRepo.updateSpecialistStatus.mockResolvedValue(null);

    await expect(
      adminService.updateSpecialistStatus('specialist-profile-1', {
        licenseStatus: 'rejected',
        rejectionReason: 'Duplicada'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'La solicitud ya fue procesada.'
    });
  });

  it('devuelve 409 si la solicitud ya estaba rejected', async () => {
    mockedRepo.updateSpecialistStatus.mockResolvedValue(null);

    await expect(
      adminService.updateSpecialistStatus('specialist-profile-1', {
        licenseStatus: 'verified'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'La solicitud ya fue procesada.'
    });
  });

  it('asigna especialista a centro valido', async () => {
    mockedRepo.findSpecialistById.mockResolvedValue(makeSpecialist());
    mockedEnsureCenterAccess.mockResolvedValue({
      id: 'center-1',
      name: 'Centro Norte',
      address: null,
      phone: null,
      city: null,
      province: null,
      image_url: null,
      is_active: true,
      created_at: '2026-07-01T12:00:00.000Z',
      updated_at: '2026-07-01T12:00:00.000Z'
    });
    mockedRepo.updateSpecialistCenter.mockResolvedValue(makeSpecialist({ center_id: 'center-1' }));
    mockedRepo.findProfilesByIds.mockResolvedValue([
      { id: 'user-1', full_name: 'Marta Lopez', email: 'marta@example.com' }
    ]);

    const result = await adminService.updateSpecialistCenter('admin-1', 'specialist-profile-1', {
      centerId: 'center-1'
    });

    expect(mockedRepo.findSpecialistById).toHaveBeenCalledWith('specialist-profile-1');
    expect(mockedEnsureCenterAccess).toHaveBeenCalledWith('admin-1', 'center-1');
    expect(mockedRepo.updateSpecialistCenter).toHaveBeenCalledWith('specialist-profile-1', {
      center_id: 'center-1'
    });
    expect(result.centerId).toBe('center-1');
  });

  it('desasocia especialista con centerId null', async () => {
    mockedRepo.findSpecialistById.mockResolvedValue(makeSpecialist({ center_id: 'center-1' }));
    mockedEnsureCenterAccess.mockResolvedValue({
      id: 'center-1',
      name: 'Centro Norte',
      address: null,
      phone: null,
      city: null,
      province: null,
      image_url: null,
      is_active: true,
      created_at: '2026-07-01T12:00:00.000Z',
      updated_at: '2026-07-01T12:00:00.000Z'
    });
    mockedRepo.updateSpecialistCenter.mockResolvedValue(makeSpecialist({ center_id: null }));
    mockedRepo.findProfilesByIds.mockResolvedValue([
      { id: 'user-1', full_name: 'Marta Lopez', email: 'marta@example.com' }
    ]);

    const result = await adminService.updateSpecialistCenter('admin-1', 'specialist-profile-1', {
      centerId: null
    });

    expect(mockedEnsureCenterAccess).toHaveBeenCalledWith('admin-1', 'center-1');
    expect(mockedRepo.updateSpecialistCenter).toHaveBeenCalledWith('specialist-profile-1', {
      center_id: null
    });
    expect(result.centerId).toBeNull();
  });

  it('body invalido al asignar centro devuelve 400', async () => {
    await expect(
      adminService.updateSpecialistCenter('admin-1', 'specialist-profile-1', {
        centerId: ''
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'centerId debe ser un string o null.'
    });
    expect(mockedRepo.findSpecialistById).not.toHaveBeenCalled();
  });

  it('admin sin acceso al centro recibe 403', async () => {
    mockedRepo.findSpecialistById.mockResolvedValue(makeSpecialist());
    mockedEnsureCenterAccess.mockRejectedValue(new ApiError(403, 'No tenés permiso para gestionar este centro.'));

    await expect(
      adminService.updateSpecialistCenter('admin-1', 'specialist-profile-1', {
        centerId: 'center-2'
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'No tenés permiso para gestionar este centro.'
    });
    expect(mockedRepo.updateSpecialistCenter).not.toHaveBeenCalled();
  });

  it('especialista inexistente devuelve 404', async () => {
    mockedRepo.findSpecialistById.mockResolvedValue(null);

    await expect(
      adminService.updateSpecialistCenter('admin-1', 'specialist-inexistente', {
        centerId: 'center-1'
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Especialista no encontrado.'
    });
    expect(mockedEnsureCenterAccess).not.toHaveBeenCalled();
    expect(mockedRepo.updateSpecialistCenter).not.toHaveBeenCalled();
  });

  it('centro inexistente o inactivo devuelve 404', async () => {
    mockedRepo.findSpecialistById.mockResolvedValue(makeSpecialist());
    mockedEnsureCenterAccess.mockRejectedValue(new ApiError(404, 'Centro no encontrado o inactivo.'));

    await expect(
      adminService.updateSpecialistCenter('admin-1', 'specialist-profile-1', {
        centerId: 'center-inactivo'
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Centro no encontrado o inactivo.'
    });
    expect(mockedRepo.updateSpecialistCenter).not.toHaveBeenCalled();
  });

  it('center_admin puede obtener signed URLs temporales', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedStorageFrom).toHaveBeenCalledWith('specialist-docs');
    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(1, 'user-1/dni/documento.jpg', 300);
    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(2, 'user-1/titulo/titulo.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/documento.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
    expect(result).not.toHaveProperty('dni_photo_url');
    expect(result).not.toHaveProperty('title_photo_url');
  });

  it('normaliza path interno sin modificarlo', () => {
    expect(normalizeSpecialistDocumentPath('user-1/dni/documento.jpg')).toBe('user-1/dni/documento.jpg');
  });

  it('elimina slash inicial del path interno', () => {
    expect(normalizeSpecialistDocumentPath('/user-1/dni/documento.jpg')).toBe('user-1/dni/documento.jpg');
  });

  it('normaliza path con bucket incluido antes de generar signed URLs', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'specialist-docs/user-1/dni/documento.jpg',
      title_photo_url: '/specialist-docs/user-1/titulo/titulo.jpg'
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(1, 'user-1/dni/documento.jpg', 300);
    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(2, 'user-1/titulo/titulo.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/documento.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('normaliza path encodeado con bucket incluido antes de generar signed URLs', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'specialist-docs%2Fuser-1%2Fdni%2Fdocumento.jpg',
      title_photo_url: '%2Fspecialist-docs%2Fuser-1%2Ftitulo%2Ftitulo.jpg'
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(1, 'user-1/dni/documento.jpg', 300);
    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(2, 'user-1/titulo/titulo.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/documento.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('normaliza URL completa antes de generar signed URLs', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'https://project.supabase.co/storage/v1/object/sign/specialist-docs/user-1/dni/documento.jpg?token=abc',
      title_photo_url: 'https://project.supabase.co/storage/v1/object/public/specialist-docs/user-1/titulo/titulo.jpg'
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(1, 'user-1/dni/documento.jpg', 300);
    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(2, 'user-1/titulo/titulo.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/documento.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('normaliza URL legacy render/image/authenticated antes de generar signed URLs', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'https://project.supabase.co/storage/v1/render/image/authenticated/specialist-docs/user-1/dni/documento.jpg?width=640',
      title_photo_url: 'https://project.supabase.co/storage/v1/render/image/sign/specialist-docs/user-1/titulo/titulo.jpg?token=abc123'
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(1, 'user-1/dni/documento.jpg', 300);
    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(2, 'user-1/titulo/titulo.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/documento.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('normaliza URL con query path antes de generar signed URLs', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'https://project.supabase.co/storage/v1/render/image?path=specialist-docs%2Fuser-1%2Fdni%2Fdocumento.jpg&width=640',
      title_photo_url: 'https://project.supabase.co/storage/v1/render/image?path=%2Fspecialist-docs%2Fuser-1%2Ftitulo%2Ftitulo.jpg&width=640'
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(1, 'user-1/dni/documento.jpg', 300);
    expect(mockedCreateSignedUrl).toHaveBeenNthCalledWith(2, 'user-1/titulo/titulo.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/documento.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('documentos de specialistProfileId inexistente devuelve 404', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue(null);

    await expect(adminService.getSpecialistDocuments('inexistente')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Solicitud de especialista no encontrada.'
    });
  });

  it('maneja dni faltante sin romper la respuesta completa', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: null,
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedCreateSignedUrl).toHaveBeenCalledTimes(1);
    expect(mockedCreateSignedUrl).toHaveBeenCalledWith('user-1/titulo/titulo.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: false,
        url: null,
        errorMessage: 'El documento no está disponible.'
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('maneja titulo faltante sin romper la respuesta completa', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: null
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(mockedCreateSignedUrl).toHaveBeenCalledTimes(1);
    expect(mockedCreateSignedUrl).toHaveBeenCalledWith('user-1/dni/documento.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/documento.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: false,
        url: null,
        errorMessage: 'El documento no está disponible.'
      },
      expiresIn: 300
    });
  });

  it('devuelve 404 controlado si ambos paths faltan en DB', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: null,
      title_photo_url: null
    });

    await expect(adminService.getSpecialistDocuments('specialist-profile-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'No se encontraron los archivos subidos para esta solicitud.'
    });
    expect(mockedCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('maneja archivo inexistente en storage sin romper si el otro documento existe', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });
    const createSignedUrl = jest.fn((path: string) => Promise.resolve(
      path.includes('/dni/')
        ? {
          data: null,
          error: { message: 'Object not found' }
        }
        : {
          data: { signedUrl: `https://signed.example/${path}` },
          error: null
        }
    ));
    const list = jest.fn((folderPath: string) => Promise.resolve(
      folderPath.includes('/dni')
        ? {
          data: [{ name: 'otro-documento.jpg' }],
          error: null
        }
        : {
          data: [],
          error: null
        }
    ));
    mockedStorageFrom.mockReturnValue({
      createSignedUrl,
      list
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(result).toEqual({
      dniPhoto: {
        available: false,
        url: null,
        errorMessage: 'No se pudo cargar este documento. Es posible que el archivo no exista o haya sido removido.'
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('recupera documento cuando el path exacto no existe pero hay archivos en la carpeta', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });

    const createSignedUrl = jest.fn((path: string) => Promise.resolve(
      path === 'user-1/dni/documento.jpg'
        ? {
          data: null,
          error: { message: 'Object not found' }
        }
        : {
          data: { signedUrl: `https://signed.example/${path}` },
          error: null
        }
    ));

    const list = jest.fn((folderPath: string) => Promise.resolve(
      folderPath === 'user-1/dni'
        ? {
          data: [{ name: '1782077012800-79xz1xmk0k8.jpg' }],
          error: null
        }
        : {
          data: [],
          error: null
        }
    ));

    mockedStorageFrom.mockReturnValue({
      createSignedUrl,
      list
    });

    const result = await adminService.getSpecialistDocuments('specialist-profile-1');

    expect(createSignedUrl).toHaveBeenCalledWith('user-1/dni/documento.jpg', 300);
    expect(list).toHaveBeenCalledWith('user-1/dni', {
      limit: 20,
      sortBy: { column: 'created_at', order: 'desc' }
    });
    expect(createSignedUrl).toHaveBeenCalledWith('user-1/dni/1782077012800-79xz1xmk0k8.jpg', 300);
    expect(result).toEqual({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/user-1/dni/1782077012800-79xz1xmk0k8.jpg',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/user-1/titulo/titulo.jpg',
        errorMessage: null
      },
      expiresIn: 300
    });
  });

  it('devuelve 404 controlado si ambos documentos faltan en storage', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Object not found' }
      }),
      list: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    });

    await expect(adminService.getSpecialistDocuments('specialist-profile-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'No se encontraron los archivos subidos para esta solicitud.'
    });
  });

  it('error de storage devuelve mensaje claro si ambos documentos fallan', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'storage unavailable' }
      }),
      list: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    });

    await expect(adminService.getSpecialistDocuments('specialist-profile-1')).rejects.toMatchObject({
      statusCode: 500,
      message: 'No pudimos generar los enlaces seguros de los documentos.'
    });
  });
});
