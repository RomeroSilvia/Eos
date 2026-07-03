/// <reference types="jest" />

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../../utils/ApiError';
import { reportsRepository } from '../reports.repository';
import { reportsService } from '../reports.service';

jest.mock('../reports.repository', () => ({
  reportsRepository: {
    getSummary: jest.fn(),
    getCenterBreakdown: jest.fn()
  }
}));

const mockedRepository = jest.mocked(reportsRepository);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('reportsService', () => {
  it('deberia devolver resumen y desglose por centro', async () => {
    mockedRepository.getSummary.mockResolvedValue({
      summary: {
        clients: 30,
        specialists: 4,
        consultations: 120,
        assignedRoutines: 17,
        averageCompliance: 81.5
      },
      scopeWarning: null
    });

    mockedRepository.getCenterBreakdown.mockResolvedValue([
      {
        centerId: 'center-1',
        centerName: 'Centro Norte',
        clients: 20,
        specialists: 3,
        consultations: 80,
        assignedRoutines: 10,
        averageCompliance: 84
      }
    ]);

    const result = await reportsService.getAdminReports({
      centerId: 'center-1'
    });

    expect(result.summary.activeSpecialists).toBe(4);
    expect(result.byCenter[0]?.centerName).toBe('Centro Norte');
  });

  it('deberia rechazar fecha from invalida', async () => {
    await expect(reportsService.getAdminReports({ from: 'fecha-invalida' })).rejects.toMatchObject({
      statusCode: 400
    } as Partial<ApiError>);
  });

  it('deberia rechazar rango cuando from es mayor que to', async () => {
    await expect(
      reportsService.getAdminReports({
        from: '2026-07-30T00:00:00.000Z',
        to: '2026-07-01T00:00:00.000Z'
      })
    ).rejects.toMatchObject({
      statusCode: 400
    } as Partial<ApiError>);
  });
});
