import { progressRepository } from '../progress.repository';
import { getDayDetailByDate, getSummaryByUserId } from '../progress.service';
import type { RoutineForProgress, RoutineLog, RoutineStepForProgress, RoutineStepLog } from '../progress.types';

jest.mock('../progress.repository', () => ({
  progressRepository: {
    findActiveRoutinesByUserId: jest.fn(),
    findRoutineLogsByUserId: jest.fn(),
    findRoutineLogsByUserIdBetweenDates: jest.fn(),
    findRoutineLogsByUserIdAndDate: jest.fn(),
    findRoutinesByIds: jest.fn(),
    findRoutineStepsByRoutineIds: jest.fn(),
    findStepLogsByRoutineLogId: jest.fn(),
    findStepLogsByRoutineLogIds: jest.fn()
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

function activeRoutine(id: string, createdAt = '2026-05-01T00:00:00.000Z'): RoutineForProgress {
  return {
    id,
    name: `Routine ${id}`,
    time_of_day: null,
    created_at: createdAt
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

function routineStep(routineId: string, id: string, name = id): RoutineStepForProgress {
  return {
    id,
    routine_id: routineId,
    name,
    step_order: 1
  };
}

function stepLog(routineLogId: string, stepId: string, isCompleted: boolean): RoutineStepLog {
  return {
    id: `${routineLogId}-${stepId}`,
    routine_log_id: routineLogId,
    step_id: stepId,
    is_completed: isCompleted,
    completed_at: isCompleted ? '2026-05-04T12:00:00.000Z' : null,
    created_at: '2026-05-04T10:00:00.000Z',
    updated_at: '2026-05-04T10:00:00.000Z'
  };
}

describe('progress.service getSummaryByUserId', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-04T12:00:00.000Z'));
    mockedProgressRepository.findActiveRoutinesByUserId.mockReset();
    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineLogsByUserId.mockReset();
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockReset();
    mockedProgressRepository.findRoutineLogsByUserIdAndDate.mockReset();
    mockedProgressRepository.findRoutinesByIds.mockReset();
    mockedProgressRepository.findRoutinesByIds.mockResolvedValue([]);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockReset();
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue([]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockReset();
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([]);
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

  it('uses one active daily routine as seven expected weekly routines', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const routines = [activeRoutine('morning', '2026-05-01T00:00:00.000Z')];
    const logs = [completedLog('2026-05-04', 'morning'), completedLog('2026-05-05', 'morning')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.weeklyProgress).toEqual({
      totalRoutines: 7,
      completedRoutines: 2,
      percent: 29
    });
  });

  it('uses two active daily routines as fourteen expected weekly routines', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const routines = [
      activeRoutine('morning', '2026-05-01T00:00:00.000Z'),
      activeRoutine('night', '2026-05-01T00:00:00.000Z')
    ];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-04', 'night'),
      completedLog('2026-05-05', 'morning')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.weeklyProgress).toEqual({
      totalRoutines: 14,
      completedRoutines: 3,
      percent: 21
    });
  });

  it('counts a routine only on days after it exists in the current week', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const routines = [activeRoutine('midweek', '2026-05-06T00:00:00.000Z')];
    const logs = [completedLog('2026-05-06', 'midweek')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.weeklyProgress).toEqual({
      totalRoutines: 5,
      completedRoutines: 1,
      percent: 20
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
      totalRoutines: 4,
      completedRoutines: 4,
      percent: 100
    });
  });

  it('marks a calendar day as partial when only one of two expected routines is completed', async () => {
    const monthlyLogs = [completedLog('2026-05-01', 'completed-1'), pendingLog('2026-05-01', 'completed-2')];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(monthlyLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce(monthlyLogs);

    const summary = await getSummaryByUserId('user-1');

    const day = summary.calendarProgress.find((item) => item.date === '2026-05-01');
    expect(day?.status).toBe('partial');
    expect(day?.completedRoutines).toBe(1);
    expect(day?.totalRoutines).toBe(2);
    expect(day?.completionPercentage).toBe(50);
  });

  it('marks a calendar day as partial when no routines are completed but some have progress', async () => {
    const monthlyLogs = [progressLog('2026-05-02', 'partial-1', 25), pendingLog('2026-05-02', 'partial-2')];

    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(monthlyLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce(monthlyLogs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.calendarProgress.find((day) => day.date === '2026-05-02')?.status).toBe('partial');
  });

  it('marks a day with one expected routine completed as completed', async () => {
    jest.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
    const routines = [activeRoutine('morning')];
    const logs = [completedLog('2026-05-01', 'morning')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');
    const day = summary.calendarProgress.find((item) => item.date === '2026-05-01');

    expect(day?.status).toBe('completed');
    expect(day?.completedRoutines).toBe(1);
    expect(day?.totalRoutines).toBe(1);
    expect(summary.streakProgress.currentStreak).toBe(1);
  });

  it('marks a day with two expected routines completed as completed', async () => {
    jest.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
    const routines = [activeRoutine('morning'), activeRoutine('night')];
    const logs = [completedLog('2026-05-01', 'morning'), completedLog('2026-05-01', 'night')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');
    const day = summary.calendarProgress.find((item) => item.date === '2026-05-01');

    expect(day?.status).toBe('completed');
    expect(day?.completedRoutines).toBe(2);
    expect(day?.totalRoutines).toBe(2);
    expect(day?.completionPercentage).toBe(100);
  });

  it('keeps the previous streak when today is partial and still in progress', async () => {
    jest.setSystemTime(new Date('2026-05-05T12:00:00.000Z'));
    const routines = [activeRoutine('morning'), activeRoutine('night')];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-04', 'night'),
      completedLog('2026-05-05', 'morning')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');
    const today = summary.calendarProgress.find((item) => item.date === '2026-05-05');

    expect(today?.status).toBe('partial');
    expect(today?.isToday).toBe(true);
    expect(today?.isDayFinished).toBe(false);
    expect(summary.streakProgress.currentStreak).toBe(1);
  });

  it('cuts the streak when an ended day is partial', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const routines = [activeRoutine('morning'), activeRoutine('night')];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-04', 'night'),
      completedLog('2026-05-05', 'morning')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');
    const endedPartialDay = summary.calendarProgress.find((item) => item.date === '2026-05-05');

    expect(endedPartialDay?.status).toBe('partial');
    expect(endedPartialDay?.isDayFinished).toBe(true);
    expect(summary.streakProgress.currentStreak).toBe(0);
    expect(summary.streakProgress.longestStreak).toBe(1);
  });

  it('cuts the streak when an ended expected day has no completed routines', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const routines = [activeRoutine('morning')];
    const logs = [completedLog('2026-05-04', 'morning')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');
    const missedDay = summary.calendarProgress.find((item) => item.date === '2026-05-05');

    expect(missedDay?.status).toBe('pending');
    expect(missedDay?.completedRoutines).toBe(0);
    expect(summary.streakProgress.currentStreak).toBe(0);
  });

  it('counts several complete days as a consecutive streak', async () => {
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const routines = [activeRoutine('morning')];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-05', 'morning'),
      completedLog('2026-05-06', 'morning')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.streakProgress.currentStreak).toBe(3);
    expect(summary.streakProgress.longestStreak).toBe(3);
  });

  it('starts a new streak after a partial day in the middle', async () => {
    jest.setSystemTime(new Date('2026-05-07T12:00:00.000Z'));
    const routines = [activeRoutine('morning'), activeRoutine('night')];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-04', 'night'),
      completedLog('2026-05-05', 'morning'),
      completedLog('2026-05-06', 'morning'),
      completedLog('2026-05-06', 'night'),
      completedLog('2026-05-07', 'morning'),
      completedLog('2026-05-07', 'night')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const summary = await getSummaryByUserId('user-1');

    expect(summary.calendarProgress.find((item) => item.date === '2026-05-05')?.status).toBe('partial');
    expect(summary.streakProgress.currentStreak).toBe(2);
    expect(summary.streakProgress.longestStreak).toBe(2);
  });

  it('keeps routine completion rate by routine and counts only fully completed days', async () => {
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
    expect(summary.completedDays).toBe(0);
    expect(summary.bestStreak).toBe(0);
    expect(summary.currentStreak).toBe(0);
    expect(summary.monthlyProgress).toEqual({
      totalRoutines: 11,
      completedRoutines: 3,
      percent: 27
    });
    expect(summary.calendarProgress.find((day) => day.date === '2026-05-04')?.status).toBe('partial');
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

describe('progress.service getDayDetailByDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-04T12:00:00.000Z'));
    mockedProgressRepository.findActiveRoutinesByUserId.mockReset();
    mockedProgressRepository.findRoutineLogsByUserIdAndDate.mockReset();
    mockedProgressRepository.findRoutinesByIds.mockReset();
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockReset();
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockReset();
    mockedProgressRepository.findRoutinesByIds.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns completed and pending routines with completed and pending steps', async () => {
    const routines = [
      { ...activeRoutine('morning'), name: 'Rutina de mañana', time_of_day: 'morning' },
      { ...activeRoutine('night'), name: 'Rutina de noche', time_of_day: 'night' }
    ];
    const morningLog = completedLog('2026-05-04', 'morning');
    const logs = [morningLog];
    const steps = [
      routineStep('morning', 'cleanser', 'Limpieza'),
      routineStep('morning', 'moisturizer', 'Hidratante'),
      routineStep('night', 'night-cleanser', 'Limpieza'),
      routineStep('night', 'serum', 'Sérum')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserIdAndDate.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue(steps);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([
      stepLog(morningLog.id, 'cleanser', true),
      stepLog(morningLog.id, 'moisturizer', true)
    ]);

    const detail = await getDayDetailByDate('user-1', '2026-05-04');

    expect(detail.status).toBe('partial');
    expect(detail.completedRoutines).toBe(1);
    expect(detail.totalRoutines).toBe(2);
    expect(detail.routines[0]).toMatchObject({
      name: 'Rutina de mañana',
      timeOfDay: 'morning',
      status: 'complete',
      completedSteps: 2,
      totalSteps: 2
    });
    expect(detail.routines[1]).toMatchObject({
      name: 'Rutina de noche',
      timeOfDay: 'night',
      status: 'pending',
      completedSteps: 0,
      totalSteps: 2
    });
    expect(detail.routines[1].steps.every((step) => !step.completed)).toBe(true);
  });

  it('returns a partially completed routine with mixed step states', async () => {
    const routines = [{ ...activeRoutine('night'), name: 'Rutina de noche', time_of_day: 'night' }];
    const nightLog = progressLog('2026-05-04', 'night', 50);
    const steps = [
      routineStep('night', 'cleanser', 'Limpieza'),
      routineStep('night', 'serum', 'Sérum')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserIdAndDate.mockResolvedValue([nightLog]);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue(steps);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([
      stepLog(nightLog.id, 'cleanser', true),
      stepLog(nightLog.id, 'serum', false)
    ]);

    const detail = await getDayDetailByDate('user-1', '2026-05-04');

    expect(detail.status).toBe('partial');
    expect(detail.routines[0].status).toBe('partial');
    expect(detail.routines[0].steps).toEqual([
      { id: 'cleanser', name: 'Limpieza', completed: true },
      { id: 'serum', name: 'Sérum', completed: false }
    ]);
  });

  it('returns empty detail when the day has no expected routines or logs', async () => {
    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineLogsByUserIdAndDate.mockResolvedValue([]);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue([]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([]);

    const detail = await getDayDetailByDate('user-1', '2026-05-04');

    expect(detail).toMatchObject({
      status: 'incomplete',
      completionPercentage: 0,
      completedRoutines: 0,
      totalRoutines: 0,
      routines: []
    });
  });
});
