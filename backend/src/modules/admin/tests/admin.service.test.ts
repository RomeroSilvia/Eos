import { ApiError } from '../../../utils/ApiError';
import { supabase } from '../../../config/supabase';
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
    findPendingSpecialists: jest.fn(),
    findProfilesByIds: jest.fn(),
    findSpecialistDocumentsById: jest.fn(),
    findSpecialistStatusById: jest.fn(),
    updateSpecialistStatus: jest.fn()
  }
}));

const mockedRepo = jest.mocked(adminRepository);
const mockedStorageFrom = supabase.storage.from as jest.Mock;
let mockedCreateSignedUrl: jest.Mock;

function makeSpecialist(overrides = {}) {
  return {
    id: 'specialist-profile-1',
    user_id: 'user-1',
    specialty: 'dermatologo',
    license_number: 'MN-12345',
    license_status: 'pending',
    rejection_reason: null,
    created_at: '2026-06-19T12:00:00.000Z',
    ...overrides
  };
}

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSignedUrl = jest.fn((path: string) => Promise.resolve({
      data: { signedUrl: `https://signed.example/${path}` },
      error: null
    }));
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: mockedCreateSignedUrl
    });
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

  it('specialistProfileId inexistente devuelve 404', async () => {
    mockedRepo.updateSpecialistStatus.mockResolvedValue(null);
    mockedRepo.findSpecialistStatusById.mockResolvedValue(null);

    await expect(
      adminService.updateSpecialistStatus('inexistente', { licenseStatus: 'verified' })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Solicitud de especialista no encontrada.'
    });
  });

  it('solicitud ya procesada devuelve 409', async () => {
    mockedRepo.updateSpecialistStatus.mockResolvedValue(null);
    mockedRepo.findSpecialistStatusById.mockResolvedValue({
      id: 'specialist-profile-1',
      license_status: 'verified'
    });

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
      dniPhotoUrl: 'https://signed.example/user-1/dni/documento.jpg',
      titlePhotoUrl: 'https://signed.example/user-1/titulo/titulo.jpg',
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
      dniPhotoUrl: 'https://signed.example/user-1/dni/documento.jpg',
      titlePhotoUrl: 'https://signed.example/user-1/titulo/titulo.jpg',
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
      dniPhotoUrl: 'https://signed.example/user-1/dni/documento.jpg',
      titlePhotoUrl: 'https://signed.example/user-1/titulo/titulo.jpg',
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
      dniPhotoUrl: 'https://signed.example/user-1/dni/documento.jpg',
      titlePhotoUrl: 'https://signed.example/user-1/titulo/titulo.jpg',
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

  it('falla claro si falta dni_photo_url', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: null,
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });

    await expect(adminService.getSpecialistDocuments('specialist-profile-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'El documento no esta disponible.'
    });
  });

  it('falla claro si falta title_photo_url', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: null
    });

    await expect(adminService.getSpecialistDocuments('specialist-profile-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'El documento no esta disponible.'
    });
  });

  it('archivo inexistente en storage devuelve 404 claro', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Object not found' }
      })
    });

    await expect(adminService.getSpecialistDocuments('specialist-profile-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'No encontramos el archivo subido para este documento.'
    });
  });

  it('error de storage devuelve mensaje claro', async () => {
    mockedRepo.findSpecialistDocumentsById.mockResolvedValue({
      id: 'specialist-profile-1',
      dni_photo_url: 'user-1/dni/documento.jpg',
      title_photo_url: 'user-1/titulo/titulo.jpg'
    });
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'storage unavailable' }
      })
    });

    await expect(adminService.getSpecialistDocuments('specialist-profile-1')).rejects.toMatchObject({
      statusCode: 500,
      message: 'No pudimos generar el enlace seguro del documento.'
    });
  });
});
