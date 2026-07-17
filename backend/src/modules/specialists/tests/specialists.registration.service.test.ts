import { supabase } from '../../../config/supabase';
import { ApiError } from '../../../utils/ApiError';
import type { SpecialistProfileRow } from '../../../database/schema.types';
import { recordAuditLog } from '../../audit/audit.service';
import { specialistsRegistrationRepository } from '../specialists.registration.repository';
import { specialistsRegistrationService } from '../specialists.registration.service';
import { specialistsSharedRepository } from '../specialists.shared.repository';

type SpecialistProfileWithCenterId = SpecialistProfileRow & { center_id: string | null };

jest.mock('../specialists.registration.repository', () => ({
  specialistsRegistrationRepository: {
    findByLicenseNumber: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('../specialists.shared.repository', () => ({
  specialistsSharedRepository: {
    findSpecialistProfileByUserId: jest.fn(),
    findProfileById: jest.fn(),
    findActiveCenterById: jest.fn()
  }
}));

jest.mock('../../../config/supabase', () => {
  const mockedSupabase = {
    storage: {
      from: jest.fn()
    }
  };

  return {
    createSupabaseUserClient: jest.fn(() => mockedSupabase),
    supabase: mockedSupabase
  };
});

jest.mock('../../audit/audit.service', () => ({
  recordAuditLog: jest.fn(async () => undefined)
}));

const mockedRepo = jest.mocked(specialistsRegistrationRepository);
const mockedSharedRepo = jest.mocked(specialistsSharedRepository);
const mockedStorageFrom = supabase.storage.from as jest.Mock;
const mockedRecordAuditLog = jest.mocked(recordAuditLog);

const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const validWebpBuffer = Buffer.from('RIFFxxxxWEBPVP8 ', 'ascii');

function makeSpecialistProfile(overrides: Partial<SpecialistProfileWithCenterId> = {}): SpecialistProfileWithCenterId {
  return {
    id: overrides.id ?? 'specialist-1',
    user_id: overrides.user_id ?? 'user-1',
    specialty: overrides.specialty ?? 'dermatologo',
    license_number: overrides.license_number ?? 'MN-12345',
    dni_photo_url: overrides.dni_photo_url ?? 'user-1/dni/documento.jpg',
    title_photo_url: overrides.title_photo_url ?? 'user-1/titulo/titulo.jpg',
    license_status: overrides.license_status ?? 'pending',
    rejection_reason: overrides.rejection_reason ?? null,
    center_id: overrides.center_id ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z'
  };
}

function makeFile(
  fieldname: 'dniPhoto' | 'titlePhoto',
  originalname = 'photo.jpg',
  overrides: Partial<Express.Multer.File> = {}
): Express.Multer.File {
  return {
    fieldname,
    originalname: overrides.originalname ?? originalname,
    encoding: overrides.encoding ?? '7bit',
    mimetype: overrides.mimetype ?? 'image/jpeg',
    size: overrides.size ?? 1024,
    buffer: overrides.buffer ?? validJpegBuffer,
    destination: overrides.destination ?? '',
    filename: overrides.filename ?? '',
    path: overrides.path ?? '',
    stream: overrides.stream ?? null as any
  };
}

describe('specialistsRegistrationService', () => {
  let mockUpload: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpload = jest.fn().mockResolvedValue({ error: null });
    mockedStorageFrom.mockReturnValue({ upload: mockUpload });
    mockedSharedRepo.findProfileById.mockResolvedValue({
      id: 'user-1',
      full_name: 'Marta Lopez',
      email: 'marta@example.com'
    });
    mockedSharedRepo.findActiveCenterById.mockResolvedValue(null);
    mockedSharedRepo.findSpecialistProfileByUserId.mockResolvedValue(null);
  });

  describe('register', () => {
    it('lanza 409 cuando la matricula ya existe', async () => {
      mockedRepo.findByLicenseNumber.mockResolvedValue(makeSpecialistProfile());

      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ese número de matrícula ya está registrado.'
      });
    });

    it('lanza 409 cuando el usuario ya tiene solicitud', async () => {
      mockedSharedRepo.findSpecialistProfileByUserId.mockResolvedValue(makeSpecialistProfile());

      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-99999' },
          { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ya existe una solicitud de especialista para este usuario.'
      });
    });

    it('crea el perfil con estado pendiente cuando la solicitud es valida', async () => {
      const created = makeSpecialistProfile();
      mockedRepo.findByLicenseNumber.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue(created);

      const result = await specialistsRegistrationService.register(
        'user-1',
        'token-1',
        { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
        { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
      );

      expect(mockedRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          specialty: 'dermatologo',
          license_number: 'MN-12345',
          license_status: 'pending',
          rejection_reason: null
        }),
        expect.any(Object)
      );
      expect(result).toEqual(created);
      expect(mockedRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'specialist',
          action: 'create',
          entity: 'specialist_profile',
          entityId: created.id,
          after: created
        })
      );
    });

    it('usa el userId autenticado y no el user_id enviado en el body', async () => {
      mockedRepo.findByLicenseNumber.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue(makeSpecialistProfile());

      await specialistsRegistrationService.register(
        'user-autenticado',
        'token-1',
        { specialty: 'dermatologo', licenseNumber: 'MN-12345', user_id: 'otro-user' } as any,
        { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
      );

      expect(mockedRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-autenticado'
        }),
        expect.any(Object)
      );
      expect(mockedRepo.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'otro-user'
        }),
        expect.any(Object)
      );
    });

    it('sube los documentos al bucket privado specialist-docs', async () => {
      mockedRepo.findByLicenseNumber.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue(makeSpecialistProfile());

      await specialistsRegistrationService.register(
        'user-1',
        'token-1',
        { specialty: 'cosmetologo', licenseNumber: 'COS-678' },
        { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto', 'titulo.png')] }
      );

      expect(mockedStorageFrom).toHaveBeenCalledWith('specialist-docs');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/dni\/.+\.jpg$/),
        expect.any(Buffer),
        { contentType: 'image/jpeg', upsert: false }
      );
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/titulo\/.+\.png$/),
        expect.any(Buffer),
        { contentType: 'image/jpeg', upsert: false }
      );
    });

    it('acepta documentos JPEG, PNG y WEBP', async () => {
      const allowedFiles: Express.Multer.File[] = [
        makeFile('dniPhoto', 'dni.jpg', { mimetype: 'image/jpeg', buffer: validJpegBuffer }),
        makeFile('dniPhoto', 'dni.png', { mimetype: 'image/png', buffer: validPngBuffer }),
        makeFile('dniPhoto', 'dni.webp', { mimetype: 'image/webp', buffer: validWebpBuffer })
      ];

      for (const file of allowedFiles) {
        jest.clearAllMocks();
        mockedStorageFrom.mockReturnValue({ upload: mockUpload });
        mockedRepo.findByLicenseNumber.mockResolvedValue(null);
        mockedRepo.create.mockResolvedValue(makeSpecialistProfile());

        await specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: `MN-${file.originalname}` },
          { dniPhoto: [file], titlePhoto: [makeFile('titlePhoto')] }
        );

        expect(mockedRepo.create).toHaveBeenCalled();
      }
    });

    it('rechaza MIME invalido con 400', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto', 'dni.pdf', { mimetype: 'application/pdf' })], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Formato no permitido. Usá JPG, PNG o WEBP.'
      });
    });

    it('rechaza archivo con MIME valido pero contenido invalido', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          {
            dniPhoto: [
              makeFile('dniPhoto', 'dni.jpg', {
                mimetype: 'image/jpeg',
                buffer: Buffer.from('contenido-no-jpeg')
              })
            ],
            titlePhoto: [makeFile('titlePhoto')]
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'El archivo no tiene un formato válido.'
      });
    });

    it('rechaza archivo demasiado grande con 413', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto', 'dni.jpg', { size: 5 * 1024 * 1024 + 1 })], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 413,
        message: 'La imagen es demasiado grande. Subí una imagen de hasta 5 MB.'
      });
    });

    it('rechaza cuando falta la foto del DNI', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          { titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'La foto del DNI es obligatoria.'
      });
    });

    it('rechaza cuando falta la foto del titulo profesional', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'La foto del título profesional es obligatoria.'
      });
    });

    it('rechaza cuando falta specialty con mensaje claro', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'La especialidad es obligatoria.'
      });
    });

    it('rechaza specialty invalida con mensaje claro', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'cirujano', licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Especialidad inválida.'
      });
    });

    it('rechaza cuando falta licenseNumber con mensaje claro', async () => {
      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo' },
          { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'La matrícula es obligatoria.'
      });
    });

    it('transforma errores de storage en ApiError claro', async () => {
      mockedRepo.findByLicenseNumber.mockResolvedValue(null);
      mockUpload.mockResolvedValueOnce({ error: { message: 'new row violates row-level security policy' } });

      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'No pudimos subir los documentos por permisos de almacenamiento. Revisá la configuración del bucket specialist-docs.'
      });
    });

    it('transforma duplicado de base de datos por user_id en 409 claro', async () => {
      mockedRepo.findByLicenseNumber.mockResolvedValue(null);
      mockedRepo.create.mockRejectedValue({
        code: '23505',
        message: 'duplicate key value violates unique constraint "specialist_profiles_user_id_key"'
      });

      await expect(
        specialistsRegistrationService.register(
          'user-1',
          'token-1',
          { specialty: 'dermatologo', licenseNumber: 'MN-12345' },
          { dniPhoto: [makeFile('dniPhoto')], titlePhoto: [makeFile('titlePhoto')] }
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ya existe una solicitud de especialista para este usuario.'
      });
    });
  });

  describe('getStatus', () => {
    it('devuelve pending con nombre, especialidad y matricula cuando la solicitud esta pendiente', async () => {
      mockedSharedRepo.findSpecialistProfileByUserId.mockResolvedValue(makeSpecialistProfile({ license_status: 'pending' }));

      const result = await specialistsRegistrationService.getStatus('user-1');

      expect(result).toEqual({
        license_status: 'pending',
        rejection_reason: null,
        specialty: 'dermatologo',
        license_number: 'MN-12345',
        full_name: 'Marta Lopez',
        center_id: null,
        centerId: null,
        center: null
      });
    });

    it('devuelve rejected con motivo de rechazo', async () => {
      mockedSharedRepo.findSpecialistProfileByUserId.mockResolvedValue(makeSpecialistProfile({ license_status: 'rejected', rejection_reason: 'Documento ilegible' }));

      await expect(specialistsRegistrationService.getStatus('user-1')).resolves.toEqual({
        license_status: 'rejected',
        rejection_reason: 'Documento ilegible',
        specialty: 'dermatologo',
        license_number: 'MN-12345',
        full_name: 'Marta Lopez',
        center_id: null,
        centerId: null,
        center: null
      });
    });

    it('devuelve verified cuando la matricula esta aprobada', async () => {
      mockedSharedRepo.findSpecialistProfileByUserId.mockResolvedValue(makeSpecialistProfile({ license_status: 'verified' }));

      await expect(specialistsRegistrationService.getStatus('user-1')).resolves.toEqual({
        license_status: 'verified',
        rejection_reason: null,
        specialty: 'dermatologo',
        license_number: 'MN-12345',
        full_name: 'Marta Lopez',
        center_id: null,
        centerId: null,
        center: null
      });
    });

    it('devuelve estado not_submitted cuando no existe perfil de especialista', async () => {
      mockedSharedRepo.findSpecialistProfileByUserId.mockResolvedValue(null);

      await expect(specialistsRegistrationService.getStatus('user-1')).resolves.toEqual({
        license_status: 'not_submitted',
        rejection_reason: null,
        specialty: null,
        license_number: null,
        full_name: 'Marta Lopez',
        center_id: null,
        centerId: null,
        center: null
      });
    });

    it('no devuelve rutas internas de DNI ni titulo profesional', async () => {
      mockedSharedRepo.findSpecialistProfileByUserId.mockResolvedValue(makeSpecialistProfile());

      const result = await specialistsRegistrationService.getStatus('user-1');

      expect(result).not.toHaveProperty('dni_photo_url');
      expect(result).not.toHaveProperty('title_photo_url');
    });
  });
});


