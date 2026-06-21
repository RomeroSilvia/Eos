import fs from 'node:fs';
import path from 'node:path';
import { apiRequest } from '@/services/api/client';
import {
  getProgressDayDetail,
  getProgressHistory,
  getProgressStats,
  getProgressSummary
} from '@/services/progress';

jest.mock('@/services/api/client', () => ({
  apiRequest: jest.fn()
}));

const mockedApiRequest = jest.mocked(apiRequest);

describe('progress frontend service', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('getProgressSummary llama al endpoint real', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      weeklyProgress: { percent: 50, completedRoutines: 1, totalRoutines: 2 },
      monthlyProgress: { percent: 25, completedRoutines: 3, totalRoutines: 12 },
      streakProgress: { currentStreak: 1, longestStreak: 4 },
      completedDays: 3,
      calendarProgress: []
    }).mockResolvedValueOnce([]);

    await getProgressSummary();

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/progress/summary',
      method: 'GET'
    });
    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/progress/history/all',
      method: 'GET'
    });
  });

  it('historyPreview usa datos reales del historial si existen', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      weeklyProgress: { percent: 50, completedRoutines: 1, totalRoutines: 2 },
      monthlyProgress: { percent: 25, completedRoutines: 3, totalRoutines: 12 },
      streakProgress: { currentStreak: 1, longestStreak: 4 },
      completedDays: 3,
      calendarProgress: []
    }).mockResolvedValueOnce([
      {
        date: '2026-06-21',
        status: 'partial',
        completionPercentage: 50,
        completedRoutines: 1,
        totalExpectedRoutines: 2,
        routines: [
          {
            routineId: 'routine-1',
            routineName: 'Rutina mañana',
            status: 'complete',
            completedSteps: 3,
            totalSteps: 3
          },
          {
            routineId: 'routine-2',
            routineName: 'Rutina noche',
            status: 'partial',
            completedSteps: 1,
            totalSteps: 3
          }
        ]
      }
    ]);

    const summary = await getProgressSummary();

    expect(summary.historyPreview).toEqual([
      {
        id: '2026-06-21-routine-1',
        date: '2026-06-21',
        routineName: 'Rutina mañana',
        completedSteps: 3,
        totalSteps: 3,
        status: 'completed'
      },
      {
        id: '2026-06-21-routine-2',
        date: '2026-06-21',
        routineName: 'Rutina noche',
        completedSteps: 1,
        totalSteps: 3,
        status: 'partial'
      }
    ]);
  });

  it('getProgressHistory llama al endpoint real', async () => {
    mockedApiRequest.mockResolvedValue([]);

    await getProgressHistory();

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/progress/history/all',
      method: 'GET'
    });
  });

  it('getProgressDayDetail llama al endpoint real', async () => {
    mockedApiRequest.mockResolvedValue({
      date: '2026-06-21',
      status: 'incomplete',
      completionPercentage: 0,
      completedRoutines: 0,
      totalRoutines: 0,
      routines: []
    });

    await getProgressDayDetail('2026-06-21');

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/progress/day/2026-06-21',
      method: 'GET'
    });
  });

  it('getProgressStats llama al endpoint real', async () => {
    mockedApiRequest.mockResolvedValue({
      weekly: { completionPercentage: 0, completedRoutines: 0, totalExpectedRoutines: 0, currentStreak: 0, bestStreak: 0 },
      monthly: { completionPercentage: 0, completedRoutines: 0, totalExpectedRoutines: 0, completeDays: 0, partialDays: 0, incompleteDays: 0, noRoutineDays: 0 },
      weekDays: [],
      routinesRanking: [],
      products: {
        weekly: { totalProductUses: 0, distinctProductsUsed: 0 },
        monthly: { totalProductUses: 0, distinctProductsUsed: 0 },
        productRanking: [],
        categoryStats: [],
        routineProductUsage: [],
        unusedProducts: []
      }
    });

    await getProgressStats();

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/progress/stats',
      method: 'GET'
    });
  });

  it('no usa mocks ni apiConfig.useMocks en services/progress.ts', () => {
    const source = fs.readFileSync(path.join(process.cwd(), '..', 'services', 'progress.ts'), 'utf8');

    expect(source).not.toContain('mockProgress');
    expect(source).not.toContain('apiConfig.useMocks');
  });
});
