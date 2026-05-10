import { progressRepository } from '../progress.repository';
import { getSummaryByUserId } from '../progress.service';
import type { RoutineLog } from '../progress.types';

jest.mock('../progress.repository', () => ({
  progressRepository: {
    findRoutineLogsByUserId: jest.fn(),
    findRoutineLogsByUserIdBetweenDates: jest.fn(),
    findRoutineLogsByUserIdAndDate: jest.fn(),
    findStepLogsByRoutineLogId: jest.fn()
  }
}));

const mockedProgressRepository = jest.mocked(progressRepository);

function createRoutineLog(overrides: Partial<RoutineLog>): RoutineLog {
  return {
    id: overrides.id ?? `log-${overrides.log_date ?? 'unknown'}-${overrides.routine_id ?? 'routine'}`,
    user_id: overrides.user_id ?? 'user-1',
    routine_id: overrides.routine_id ?? 'routine-1',
    log_date: overrides.log_date ?? '2026-05-04',
    completed_at: overrides.completed_at ?? null,
    completion_percentage: overrides.completion_percentage ?? 0,
    created_at: overrides.created_at ?? `${overrides.log_date ?? '2026-05-04'}T10:00:00.000Z`,
    updated_at: overrides.updated_at ?? `${overrides.log_date ?? '2026-05-04'}T10:00:00.000Z`
  };
}

function completedLog(date: string, id: string): RoutineLog {
  return createRoutineLog({
    id,
    log_date: date,
    routine_id: id,
    completed_at: `${date}T12:00:00.000Z`,
    completion_percentage: 100
  });
}

function pendingLog(date: string, id: string): RoutineLog {
  return createRoutineLog({
    id,
    log_date: date,
    routine_id: id,
    completed_at: null,
    completion_percentage: 0
  });
}

function progressLog(date: string, id: string, completionPercentage: number): RoutineLog {
  return createRoutineLog({
    id,
    log_date: date,
    routine_id: id,
    completed_at: completionPercentage >= 100 ? `${date}T12:00:00.000Z` : null,
    completion_percentage: completionPercentage
  });
}

describe('progress.service getSummaryByUserId', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-04T12:00:00.000Z'));
    mockedProgressRepository.findRoutineLogsByUserId.mockReset();
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns zero progress for a user without logs', async () => {
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.weeklyProgress).toEqual({
      percent: 0,
      completedRoutines: 0,
      totalRoutines: 0
    });
    expect(summary.monthlyProgress).toEqual({
      percent: 0,
      completedRoutines: 0,
      totalRoutines: 0
    });
    expect(summary.streakProgress.currentStreak).toBe(0);
    expect(summary.streakProgress.longestStreak).toBe(0);
    expect(summary.calendarProgress.length).toBe(31);
  });

  it('calculates weekly progress', async () => {
    const weeklyLogs = [
      completedLog('2026-05-04', 'weekly-1'),
      completedLog('2026-05-04', 'weekly-2'),
      completedLog('2026-05-04', 'weekly-3'),
      pendingLog('2026-05-04', 'weekly-4'),
      pendingLog('2026-05-04', 'weekly-5')
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(weeklyLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(weeklyLogs).mockResolvedValueOnce([]);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.weeklyProgress).toEqual({
      totalRoutines: 5,
      completedRoutines: 3,
      percent: 60
    });
  });

  it('calculates monthly progress', async () => {
    const monthlyLogs = [
      completedLog('2026-05-01', 'monthly-1'),
      completedLog('2026-05-02', 'monthly-2'),
      completedLog('2026-05-03', 'monthly-3'),
      completedLog('2026-05-04', 'monthly-4'),
      completedLog('2026-05-05', 'monthly-5'),
      completedLog('2026-05-06', 'monthly-6'),
      completedLog('2026-05-07', 'monthly-7'),
      pendingLog('2026-05-08', 'monthly-8'),
      pendingLog('2026-05-09', 'monthly-9'),
      pendingLog('2026-05-10', 'monthly-10')
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(monthlyLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce(monthlyLogs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.monthlyProgress).toEqual({
      totalRoutines: 10,
      completedRoutines: 7,
      percent: 70
    });
  });

  it('marks a calendar day as completed when at least one routine is completed', async () => {
    const monthlyLogs = [completedLog('2026-05-01', 'completed-1'), pendingLog('2026-05-01', 'completed-2')];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(monthlyLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce(monthlyLogs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.calendarProgress.find((day) => day.date === '2026-05-01')?.status).toBe('completed');
  });

  it('marks a calendar day as partial when no routines are completed but some have progress', async () => {
    const monthlyLogs = [progressLog('2026-05-02', 'partial-1', 25), pendingLog('2026-05-02', 'partial-2')];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(monthlyLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce(monthlyLogs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.calendarProgress.find((day) => day.date === '2026-05-02')?.status).toBe('partial');
  });

  it('keeps routine completion rate by routine but counts completed days by at least one completed routine', async () => {
    jest.setSystemTime(new Date('2026-05-05T12:00:00.000Z'));

    const logs = [
      progressLog('2026-05-04', 'may-04-1', 100),
      progressLog('2026-05-04', 'may-04-2', 0),
      progressLog('2026-05-04', 'may-04-3', 100),
      progressLog('2026-05-04', 'may-04-4', 0),
      progressLog('2026-05-04', 'may-04-5', 100),
      progressLog('2026-05-05', 'may-05-1', 0),
      progressLog('2026-05-05', 'may-05-2', 0),
      progressLog('2026-05-05', 'may-05-3', 0),
      progressLog('2026-05-05', 'may-05-4', 25),
      progressLog('2026-05-05', 'may-05-5', 50),
      progressLog('2026-05-05', 'may-05-6', 0)
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.completedRoutines).toBe(3);
    expect(summary.totalRoutines).toBe(11);
    expect(summary.completionRate).toBe(27);
    expect(summary.completedDays).toBe(1);
    expect(summary.bestStreak).toBe(1);
    expect(summary.currentStreak).toBe(1);
    expect(summary.monthlyProgress).toEqual({
      totalRoutines: 11,
      completedRoutines: 3,
      percent: 27
    });
    expect(summary.calendarProgress.find((day) => day.date === '2026-05-04')?.status).toBe('completed');
    expect(summary.calendarProgress.find((day) => day.date === '2026-05-05')?.status).toBe('partial');
  });

  it('marks a calendar day as pending when no logs are completed', async () => {
    const monthlyLogs = [pendingLog('2026-05-03', 'pending-1'), pendingLog('2026-05-03', 'pending-2')];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(monthlyLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce(monthlyLogs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.calendarProgress.find((day) => day.date === '2026-05-03')?.status).toBe('pending');
  });

  it('marks a calendar day as empty when there are no logs', async () => {
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.calendarProgress.find((day) => day.date === '2026-05-04')?.status).toBe('empty');
  });

  it('calculates current streak as the latest completed-day sequence in history', async () => {
    const allLogs = [
      completedLog('2026-05-02', 'current-1'),
      completedLog('2026-05-03', 'current-2'),
      completedLog('2026-05-04', 'current-3'),
      completedLog('2026-04-28', 'old-1')
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(allLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(allLogs).mockResolvedValueOnce(allLogs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.streakProgress.currentStreak).toBe(3);
  });

  it('returns current streak 1 when Monday is completed and Tuesday is partial', async () => {
    jest.setSystemTime(new Date('2026-05-05T12:00:00.000Z'));
    const logs = [progressLog('2026-05-04', 'monday-completed', 100), progressLog('2026-05-05', 'tuesday-partial', 25)];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.streakProgress.currentStreak).toBe(1);
    expect(summary.streakProgress.longestStreak).toBe(1);
  });

  it('returns current streak 2 when Monday and Tuesday are completed and Wednesday is partial', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const logs = [
      progressLog('2026-05-04', 'monday-completed', 100),
      progressLog('2026-05-05', 'tuesday-completed', 100),
      progressLog('2026-05-06', 'wednesday-partial', 50)
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.streakProgress.currentStreak).toBe(2);
    expect(summary.streakProgress.longestStreak).toBe(2);
  });

  it('returns current streak 1 when the latest completed sequence is Wednesday only', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const logs = [
      progressLog('2026-05-04', 'monday-completed', 100),
      progressLog('2026-05-05', 'tuesday-partial', 25),
      progressLog('2026-05-06', 'wednesday-completed', 100)
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.streakProgress.currentStreak).toBe(1);
    expect(summary.streakProgress.longestStreak).toBe(1);
  });

  it('returns latest streak 1 and best streak 2 when Thursday is completed after an earlier two-day streak', async () => {
    jest.setSystemTime(new Date('2026-05-07T12:00:00.000Z'));
    const logs = [
      progressLog('2026-05-04', 'monday-completed', 100),
      progressLog('2026-05-05', 'tuesday-completed', 100),
      progressLog('2026-05-06', 'wednesday-partial', 25),
      progressLog('2026-05-07', 'thursday-completed', 100)
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.streakProgress.currentStreak).toBe(1);
    expect(summary.streakProgress.longestStreak).toBe(2);
  });

  it('calculates the longest historical streak', async () => {
    const allLogs = [
      completedLog('2026-04-20', 'longest-1'),
      completedLog('2026-04-21', 'longest-2'),
      completedLog('2026-04-22', 'longest-3'),
      completedLog('2026-04-23', 'longest-4'),
      completedLog('2026-04-25', 'short-1'),
      completedLog('2026-05-03', 'current-1'),
      completedLog('2026-05-04', 'current-2')
    ];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(allLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(allLogs).mockResolvedValueOnce(allLogs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.streakProgress.longestStreak).toBe(4);
  });

  it('propagates repository errors', async () => {
    const error = new Error('Supabase failed');

    mockedProgressRepository.findRoutineLogsByUserId.mockRejectedValue(error);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValue([]);

    await expect(getSummaryByUserId('user-1')).rejects.toThrow('Supabase failed');
  });
});
