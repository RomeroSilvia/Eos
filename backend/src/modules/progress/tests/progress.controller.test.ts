import type { Request, Response } from 'express';
import { getFullHistoryByUserId, getHistoryByDate, getSummaryByUserId } from '../progress.controller';
import * as progressService from '../progress.service';
import type { ProgressSummary, RoutineLog } from '../progress.types';

jest.mock('../progress.service', () => ({
  getProgressHealth: jest.fn(() => ({ module: 'progress', status: 'ready' })),
  getSummaryByUserId: jest.fn(),
  getStatsByUserId: jest.fn(),
  getFullHistoryByUserId: jest.fn(),
  getHistoryByDate: jest.fn(),
  getDayDetailByDate: jest.fn(),
  isIsoDate: jest.fn((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date))
}));

const mockedProgressService = jest.mocked(progressService);

type MockResponse = Pick<Response, 'status' | 'json'>;

function createMockResponse(): MockResponse {
  const response: Partial<MockResponse> = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response as MockResponse;
}

function createSummary(): ProgressSummary {
  return {
    weeklyProgress: {
      percent: 80,
      completedRoutines: 4,
      totalRoutines: 5
    },
    monthlyProgress: {
      percent: 60,
      completedRoutines: 12,
      totalRoutines: 20
    },
    streakProgress: {
      currentStreak: 3,
      longestStreak: 7
    },
    calendarProgress: [
      {
        date: '2026-05-01',
        status: 'completed',
        dayStatus: 'complete',
        completedRoutines: 1,
        totalRoutines: 1,
        completionPercentage: 100,
        isToday: false,
        isDayFinished: true
      }
    ]
  };
}

function createRoutineLog(): RoutineLog {
  return {
    id: 'log-1',
    user_id: 'user-1',
    routine_id: 'routine-1',
    log_date: '2026-05-04',
    completed_at: '2026-05-04T12:00:00.000Z',
    completion_percentage: 100,
    created_at: '2026-05-04T12:00:00.000Z',
    updated_at: '2026-05-04T12:00:00.000Z'
  };
}

describe('progress.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSummaryByUserId responds 200 when service returns summary', async () => {
    const summary = createSummary();
    mockedProgressService.getSummaryByUserId.mockResolvedValue(summary);
    const req = { user: { id: 'user-1' } } as unknown as Request;
    const res = createMockResponse();

    await getSummaryByUserId(req, res as Response, jest.fn());

    expect(mockedProgressService.getSummaryByUserId).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith(summary);
  });

  it('getSummaryByUserId responds 500 when service throws', async () => {
    mockedProgressService.getSummaryByUserId.mockRejectedValue(new Error('Service failed'));
    const req = { user: { id: 'user-1' } } as unknown as Request;
    const res = createMockResponse();

    await getSummaryByUserId(req, res as Response, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to get progress summary',
      error: 'Service failed'
    });
  });

  it('getHistoryByDate responds 400 when date is missing', async () => {
    const req = { user: { id: 'user-1' }, query: {} } as unknown as Request;
    const res = createMockResponse();

    await getHistoryByDate(req, res as Response, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'date query param is required' });
  });

  it('getHistoryByDate responds 200 when service returns history', async () => {
    const history = [createRoutineLog()];
    mockedProgressService.getHistoryByDate.mockResolvedValue(history);
    mockedProgressService.isIsoDate.mockReturnValue(true);
    const req = { user: { id: 'user-1' }, query: { date: '2026-05-04' } } as unknown as Request;
    const res = createMockResponse();

    await getHistoryByDate(req, res as Response, jest.fn());

    expect(mockedProgressService.getHistoryByDate).toHaveBeenCalledWith('user-1', '2026-05-04');
    expect(res.json).toHaveBeenCalledWith(history);
  });

  it('getFullHistoryByUserId responds 200 when service returns history days', async () => {
    const history = [
      {
        date: '2026-05-04',
        status: 'complete',
        completionPercentage: 100,
        completedRoutines: 1,
        totalExpectedRoutines: 1,
        routines: [
          {
            routineId: 'routine-1',
            routineName: 'Rutina de mañana',
            status: 'complete',
            completedSteps: 2,
            totalSteps: 2
          }
        ]
      }
    ] as Awaited<ReturnType<typeof progressService.getFullHistoryByUserId>>;
    mockedProgressService.getFullHistoryByUserId.mockResolvedValue(history);
    const req = { user: { id: 'user-1' } } as unknown as Request;
    const res = createMockResponse();

    await getFullHistoryByUserId(req, res as Response, jest.fn());

    expect(mockedProgressService.getFullHistoryByUserId).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith(history);
  });
});
