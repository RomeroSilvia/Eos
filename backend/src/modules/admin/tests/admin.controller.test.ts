import type { Request, Response } from 'express';
import {
  getSpecialistDocuments,
  listPendingSpecialists,
  updateSpecialistCenter,
  updateSpecialistStatus
} from '../admin.controller';
import { adminService } from '../admin.service';

jest.mock('../admin.service', () => ({
  adminService: {
    getSpecialistDocuments: jest.fn(),
    listPendingSpecialists: jest.fn(),
    updateSpecialistCenter: jest.fn(),
    updateSpecialistStatus: jest.fn()
  }
}));

const mockedService = jest.mocked(adminService);

function makeResponse(): Response & { json: jest.Mock } {
  return { json: jest.fn() } as unknown as Response & { json: jest.Mock };
}

describe('adminController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('responde listado de pendientes sin documentos sensibles', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.listPendingSpecialists.mockResolvedValue([
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
        createdAt: '2026-06-19T12:00:00.000Z'
      }
    ]);

    listPendingSpecialists({} as Request, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.json).toHaveBeenCalledWith({
      specialists: [
        expect.objectContaining({
          specialistProfileId: 'specialist-profile-1',
          licenseStatus: 'pending'
        })
      ]
    });
    expect(res.json.mock.calls[0][0].specialists[0]).not.toHaveProperty('dni_photo_url');
    expect(res.json.mock.calls[0][0].specialists[0]).not.toHaveProperty('title_photo_url');
  });

  it('responde el especialista actualizado', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.updateSpecialistStatus.mockResolvedValue({
      specialistProfileId: 'specialist-profile-1',
      userId: 'user-1',
      fullName: 'Marta Lopez',
      email: 'marta@example.com',
      specialty: 'dermatologo',
      licenseNumber: 'MN-12345',
      licenseStatus: 'verified',
      rejectionReason: null,
      centerId: null,
      createdAt: '2026-06-19T12:00:00.000Z'
    });

    updateSpecialistStatus(
      {
        params: { specialistProfileId: 'specialist-profile-1' },
        body: { licenseStatus: 'verified' },
        user: { id: 'admin-1', role: 'center_admin', accessToken: 'token-1' }
      } as unknown as Request,
      res,
      next
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedService.updateSpecialistStatus).toHaveBeenCalledWith(
      'specialist-profile-1',
      { licenseStatus: 'verified' },
      'admin-1'
    );
    expect(res.json).toHaveBeenCalledWith({
      specialist: expect.objectContaining({
        specialistProfileId: 'specialist-profile-1',
        licenseStatus: 'verified'
      })
    });
    expect(res.json.mock.calls[0][0].specialist).not.toHaveProperty('dni_photo_url');
    expect(res.json.mock.calls[0][0].specialist).not.toHaveProperty('title_photo_url');
  });

  it('responde especialista con centro actualizado', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.updateSpecialistCenter.mockResolvedValue({
      specialistProfileId: 'specialist-profile-1',
      userId: 'user-1',
      fullName: 'Marta Lopez',
      email: 'marta@example.com',
      specialty: 'dermatologo',
      licenseNumber: 'MN-12345',
      licenseStatus: 'verified',
      rejectionReason: null,
      centerId: 'center-1',
      createdAt: '2026-06-19T12:00:00.000Z'
    });

    updateSpecialistCenter(
      {
        params: { specialistId: 'specialist-profile-1' },
        body: { centerId: 'center-1' },
        user: { id: 'admin-1', role: 'center_admin', accessToken: 'token-1' }
      } as unknown as Request,
      res,
      next
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedService.updateSpecialistCenter).toHaveBeenCalledWith(
      'admin-1',
      'specialist-profile-1',
      { centerId: 'center-1' }
    );
    expect(res.json).toHaveBeenCalledWith({
      specialist: expect.objectContaining({
        specialistProfileId: 'specialist-profile-1',
        centerId: 'center-1'
      })
    });
  });

  it('responde documentos firmados sin rutas internas', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.getSpecialistDocuments.mockResolvedValue({
      dniPhoto: {
        available: true,
        url: 'https://signed.example/dni',
        errorMessage: null
      },
      titlePhoto: {
        available: true,
        url: 'https://signed.example/titulo',
        errorMessage: null
      },
      expiresIn: 300
    });

    getSpecialistDocuments(
      { params: { specialistProfileId: 'specialist-profile-1' } } as unknown as Request,
      res,
      next
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedService.getSpecialistDocuments).toHaveBeenCalledWith('specialist-profile-1');
    expect(res.json).toHaveBeenCalledWith({
      documents: {
        dniPhoto: {
          available: true,
          url: 'https://signed.example/dni',
          errorMessage: null
        },
        titlePhoto: {
          available: true,
          url: 'https://signed.example/titulo',
          errorMessage: null
        },
        expiresIn: 300
      }
    });
    expect(res.json.mock.calls[0][0].documents).not.toHaveProperty('dni_photo_url');
    expect(res.json.mock.calls[0][0].documents).not.toHaveProperty('title_photo_url');
  });
});
