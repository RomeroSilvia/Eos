import type { Request, Response } from 'express';
import { getAdminReports } from '../reports.controller';
import { reportsService } from '../reports.service';

jest.mock('../reports.service', () => ({
  reportsService: {
    getAdminReports: jest.fn()
  }
}));

const mockedService = jest.mocked(reportsService);

function makeResponse(): Response & { json: jest.Mock } {
  return {
    json: jest.fn()
  } as unknown as Response & { json: jest.Mock };
}

describe('reportsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deberia responder reportes admin', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.getAdminReports.mockResolvedValue({
      filters: { centerId: null, from: null, to: null },
      summary: {
        clients: 10,
        activeSpecialists: 2,
        consultations: 20,
        assignedRoutines: 4,
        averageCompliance: 88
      },
      byCenter: [],
      scopeWarning: null
    });

    getAdminReports(
      {
        query: {
          centerId: 'center-1',
          from: '2026-07-01T00:00:00.000Z',
          to: '2026-07-30T23:59:59.999Z'
        }
      } as unknown as Request,
      res,
      next
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedService.getAdminReports).toHaveBeenCalledWith({
      centerId: 'center-1',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-30T23:59:59.999Z'
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({
          clients: 10
        })
      })
    );
  });
});
