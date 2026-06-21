import type { Request, Response } from 'express';
import { getSpecialistStatus, registerSpecialist } from '../specialists.registration.controller';
import { specialistsRegistrationService } from '../specialists.registration.service';

jest.mock('../specialists.registration.service', () => ({
  specialistsRegistrationService: {
    getHealth: jest.fn(),
    register: jest.fn(),
    getStatus: jest.fn()
  }
}));

const mockedService = jest.mocked(specialistsRegistrationService);

describe('specialistController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerSpecialist', () => {
    it('responde solo campos seguros del perfil creado', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const next = jest.fn();

      mockedService.register.mockResolvedValue({
        id: 'specialist-1',
        user_id: 'user-1',
        specialty: 'dermatologo',
        license_number: 'MN-12345',
        dni_photo_url: 'user-1/dni/documento.jpg',
        title_photo_url: 'user-1/titulo/titulo.jpg',
        license_status: 'pending',
        rejection_reason: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z'
      });

      await registerSpecialist(
        {
          user: { id: 'user-1', role: 'specialist', accessToken: 'token-1' },
          body: { user_id: 'otro-user' },
          files: {}
        } as Request,
        { status, json } as unknown as Response,
        next
      );

      expect(status).toHaveBeenCalledWith(201);
      expect(mockedService.register).toHaveBeenCalledWith('user-1', 'token-1', { user_id: 'otro-user' }, {});
      expect(json).toHaveBeenCalledWith({
        license_status: 'pending',
        rejection_reason: null,
        specialty: 'dermatologo',
        license_number: 'MN-12345'
      });
      expect(json.mock.calls[0][0]).not.toHaveProperty('dni_photo_url');
      expect(json.mock.calls[0][0]).not.toHaveProperty('title_photo_url');
    });
  });

  describe('getSpecialistStatus', () => {
    it('responde el estado dentro de specialistProfile sin documentos sensibles', async () => {
      const json = jest.fn();
      const next = jest.fn();

      mockedService.getStatus.mockResolvedValue({
        license_status: 'rejected',
        rejection_reason: 'Documento ilegible',
        specialty: 'dermatologo',
        license_number: 'MN-12345',
        full_name: 'Marta Lopez'
      });

      await getSpecialistStatus(
        { user: { id: 'user-1', role: 'specialist', accessToken: 'token-1' } } as Request,
        { json } as unknown as Response,
        next
      );

      expect(mockedService.getStatus).toHaveBeenCalledWith('user-1');
      expect(json).toHaveBeenCalledWith({
        specialistProfile: {
          license_status: 'rejected',
          rejection_reason: 'Documento ilegible',
          specialty: 'dermatologo',
          license_number: 'MN-12345',
          full_name: 'Marta Lopez'
        }
      });
      expect(json.mock.calls[0][0].specialistProfile).not.toHaveProperty('dni_photo_url');
      expect(json.mock.calls[0][0].specialistProfile).not.toHaveProperty('title_photo_url');
    });
  });
});
