import { progressRepository } from '../progress.repository';
import { ApiError } from '../../../utils/ApiError';
import {
  getDayDetailByDate,
  getFullHistoryByUserId,
  getStatsByUserId,
  getSummaryByUserId,
  setRoutineStepCompletion
} from '../progress.service';
import type {
  ProductForProgress,
  RoutineForProgress,
  RoutineLog,
  RoutineStepForProgress,
  RoutineStepLog,
  RoutineStepProductForProgress
} from '../progress.types';

jest.mock('../progress.repository', () => ({
  progressRepository: {
    findActiveRoutinesByUserId: jest.fn(),
    findRoutineByIdAndUserId: jest.fn(),
    findRoutineLogsByUserId: jest.fn(),
    findRoutineLogsByUserIdBetweenDates: jest.fn(),
    findRoutineLogsByUserIdAndDate: jest.fn(),
    findRoutineLogByRoutineIdAndDate: jest.fn(),
    findRoutinesByIds: jest.fn(),
    findRoutineStepsByRoutineIds: jest.fn(),
    findRoutineStepByIdAndRoutineId: jest.fn(),
    findProductsByUserId: jest.fn(),
    findRoutineStepProductsByStepIds: jest.fn(),
    findStepLogsByRoutineLogId: jest.fn(),
    findStepLogsByRoutineLogIds: jest.fn(),
    findStepLogByRoutineLogIdAndStepId: jest.fn(),
    createRoutineLog: jest.fn(),
    createStepLog: jest.fn(),
    updateStepLog: jest.fn(),
    updateRoutineLog: jest.fn(),
    countRoutineSteps: jest.fn()
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

function product(id: string, name = id, category: string | null = 'cleanser'): ProductForProgress {
  return {
    id,
    name,
    category,
    created_at: '2026-05-01T00:00:00.000Z'
  };
}

function routineStepProduct(stepId: string, productId: string): RoutineStepProductForProgress {
  return {
    step_id: stepId,
    product_id: productId
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

describe('progress.service getFullHistoryByUserId', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    mockedProgressRepository.findActiveRoutinesByUserId.mockReset();
    mockedProgressRepository.findRoutineLogsByUserId.mockReset();
    mockedProgressRepository.findRoutinesByIds.mockReset();
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockReset();
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockReset();
    mockedProgressRepository.findRoutinesByIds.mockResolvedValue([]);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue([]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns history days sorted from newest to oldest with real routine names', async () => {
    const routines = [
      { ...activeRoutine('morning', '2026-05-01T00:00:00.000Z'), name: 'Rutina de mañana', time_of_day: 'morning' },
      { ...activeRoutine('night', '2026-05-01T00:00:00.000Z'), name: 'Rutina de noche', time_of_day: 'night' }
    ];
    const may4Morning = createRoutineLog({
      id: 'may-4-morning',
      routine_id: 'morning',
      log_date: '2026-05-04',
      completed_at: '2026-05-04T12:00:00.000Z',
      completion_percentage: 100
    });
    const may4Night = createRoutineLog({
      id: 'may-4-night',
      routine_id: 'night',
      log_date: '2026-05-04',
      completed_at: '2026-05-04T12:00:00.000Z',
      completion_percentage: 100
    });
    const may5Morning = createRoutineLog({
      id: 'may-5-morning',
      routine_id: 'morning',
      log_date: '2026-05-05',
      completed_at: '2026-05-05T12:00:00.000Z',
      completion_percentage: 100
    });
    const logs = [may4Morning, may4Night, may5Morning];
    const steps = [
      routineStep('morning', 'cleanser', 'Limpieza'),
      routineStep('morning', 'moisturizer', 'Hidratante'),
      routineStep('night', 'night-cleanser', 'Limpieza')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue(steps);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([
      stepLog(may4Morning.id, 'cleanser', true),
      stepLog(may4Morning.id, 'moisturizer', true),
      stepLog(may4Night.id, 'night-cleanser', true),
      stepLog(may5Morning.id, 'cleanser', true),
      stepLog(may5Morning.id, 'moisturizer', true)
    ]);

    const history = await getFullHistoryByUserId('user-1');

    expect(history.map((day) => day.date)).toEqual(['2026-05-05', '2026-05-04']);
    expect(history[0]).toMatchObject({
      status: 'partial',
      completionPercentage: 50,
      completedRoutines: 1,
      totalExpectedRoutines: 2
    });
    expect(history[0].routines.map((routine) => routine.routineName)).toEqual(['Rutina de mañana', 'Rutina de noche']);
    expect(JSON.stringify(history)).not.toContain('Rutina morning');
    expect(JSON.stringify(history)).not.toContain('Rutina night');
  });

  it('uses a friendly fallback when a logged routine name is missing', async () => {
    const log = completedLog('2026-05-04', 'deleted-routine');

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue([log]);
    mockedProgressRepository.findRoutinesByIds.mockResolvedValue([]);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue([]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([]);

    const history = await getFullHistoryByUserId('user-1');

    expect(history[0].routines[0].routineName).toBe('Rutina sin nombre');
    expect(history[0].routines[0].routineName).not.toContain('deleted-routine');
  });
});

describe('progress.service getStatsByUserId', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    mockedProgressRepository.findActiveRoutinesByUserId.mockReset();
    mockedProgressRepository.findRoutineLogsByUserId.mockReset();
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockReset();
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockReset();
    mockedProgressRepository.findProductsByUserId.mockReset();
    mockedProgressRepository.findRoutineStepProductsByStepIds.mockReset();
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockReset();
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue([]);
    mockedProgressRepository.findProductsByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineStepProductsByStepIds.mockResolvedValue([]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates weekly and monthly routine stats from expected routines', async () => {
    const routines = [
      { ...activeRoutine('morning', '2026-05-01T00:00:00.000Z'), name: 'Rutina de mañana', time_of_day: 'morning' },
      { ...activeRoutine('night', '2026-05-01T00:00:00.000Z'), name: 'Rutina de noche', time_of_day: 'night' }
    ];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-04', 'night'),
      completedLog('2026-05-05', 'morning')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const stats = await getStatsByUserId('user-1');

    expect(stats.weekly).toMatchObject({
      completionPercentage: 21,
      completedRoutines: 3,
      totalExpectedRoutines: 14
    });
    expect(stats.monthly).toMatchObject({
      completionPercentage: 25,
      completedRoutines: 3,
      totalExpectedRoutines: 12,
      completeDays: 1,
      partialDays: 1
    });
    expect(stats.weekDays).toHaveLength(7);
    expect(stats.weekDays[0]).toMatchObject({
      dayLabel: 'Lunes',
      status: 'complete',
      completedRoutines: 2,
      totalExpectedRoutines: 2,
      completionPercentage: 100
    });
  });

  it('sorts routine ranking by completion percentage', async () => {
    const routines = [
      { ...activeRoutine('morning', '2026-05-01T00:00:00.000Z'), name: 'Rutina de mañana', time_of_day: 'morning' },
      { ...activeRoutine('night', '2026-05-01T00:00:00.000Z'), name: 'Rutina de noche', time_of_day: 'night' }
    ];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-05', 'morning'),
      completedLog('2026-05-04', 'night')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);

    const stats = await getStatsByUserId('user-1');

    expect(stats.routinesRanking.map((routine) => routine.routineId)).toEqual(['morning', 'night']);
    expect(stats.routinesRanking[0]).toMatchObject({
      routineName: 'Rutina de mañana',
      completedCount: 2,
      expectedCount: 6,
      completionPercentage: 33
    });
  });

  it('does not count routine steps as expected weekly routines', async () => {
    const routines = [{ ...activeRoutine('morning', '2026-05-01T00:00:00.000Z'), name: 'Rutina de mañana' }];
    const logs = [completedLog('2026-05-04', 'morning')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue([
      routineStep('morning', 'step-1'),
      routineStep('morning', 'step-2'),
      routineStep('morning', 'step-3'),
      routineStep('morning', 'step-4'),
      routineStep('morning', 'step-5')
    ]);

    const stats = await getStatsByUserId('user-1');

    expect(stats.weekly.totalExpectedRoutines).toBe(7);
    expect(stats.weekly.completedRoutines).toBe(1);
  });

  it('does not count completed routines outside the current week in weekly stats', async () => {
    const routines = [{ ...activeRoutine('morning', '2026-04-01T00:00:00.000Z'), name: 'Rutina de mañana' }];
    const allLogs = [completedLog('2026-04-28', 'morning'), completedLog('2026-05-04', 'morning')];
    const weeklyLogs = [completedLog('2026-05-04', 'morning')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(allLogs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(weeklyLogs).mockResolvedValueOnce(allLogs);

    const stats = await getStatsByUserId('user-1');

    expect(stats.weekly.completedRoutines).toBe(1);
    expect(stats.weekly.totalExpectedRoutines).toBe(7);
  });

  it('counts product uses only from completed steps linked to user products', async () => {
    const routines = [{ ...activeRoutine('morning', '2026-05-01T00:00:00.000Z'), name: 'Rutina de mañana' }];
    const logs = [completedLog('2026-05-04', 'morning')];
    const steps = [routineStep('morning', 'cleanser'), routineStep('morning', 'serum')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue(steps);
    mockedProgressRepository.findProductsByUserId.mockResolvedValue([
      product('product-cleanser', 'Limpiador facial', 'cleanser')
    ]);
    mockedProgressRepository.findRoutineStepProductsByStepIds.mockResolvedValue([
      routineStepProduct('cleanser', 'product-cleanser'),
      routineStepProduct('serum', 'foreign-product')
    ]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([
      stepLog(logs[0].id, 'cleanser', true),
      stepLog(logs[0].id, 'serum', false)
    ]);

    const stats = await getStatsByUserId('user-1');

    expect(stats.products.weekly).toMatchObject({
      totalProductUses: 1,
      distinctProductsUsed: 1,
      mostUsedProduct: {
        productId: 'product-cleanser',
        name: 'Limpiador facial',
        uses: 1
      }
    });
    expect(stats.products.productRanking).toEqual([
      {
        productId: 'product-cleanser',
        name: 'Limpiador facial',
        category: 'cleanser',
        weeklyUses: 1,
        monthlyUses: 1,
        totalUses: 1,
        usagePercentage: 100
      }
    ]);
  });

  it('sorts product ranking and groups product uses by category and routine', async () => {
    const routines = [
      { ...activeRoutine('morning', '2026-05-01T00:00:00.000Z'), name: 'Rutina de mañana' },
      { ...activeRoutine('night', '2026-05-01T00:00:00.000Z'), name: 'Rutina de noche' }
    ];
    const logs = [
      completedLog('2026-05-04', 'morning'),
      completedLog('2026-05-05', 'morning'),
      completedLog('2026-05-05', 'night')
    ];
    const steps = [
      routineStep('morning', 'morning-cleanser'),
      routineStep('morning', 'sunscreen'),
      routineStep('night', 'night-cleanser')
    ];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce(logs).mockResolvedValueOnce(logs);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue(steps);
    mockedProgressRepository.findProductsByUserId.mockResolvedValue([
      product('cleanser', 'Limpiador facial', 'cleanser'),
      product('sunscreen', 'Protector solar', 'sunscreen')
    ]);
    mockedProgressRepository.findRoutineStepProductsByStepIds.mockResolvedValue([
      routineStepProduct('morning-cleanser', 'cleanser'),
      routineStepProduct('night-cleanser', 'cleanser'),
      routineStepProduct('sunscreen', 'sunscreen')
    ]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([
      stepLog(logs[0].id, 'morning-cleanser', true),
      stepLog(logs[0].id, 'sunscreen', true),
      stepLog(logs[1].id, 'morning-cleanser', true),
      stepLog(logs[2].id, 'night-cleanser', true)
    ]);

    const stats = await getStatsByUserId('user-1');

    expect(stats.products.productRanking.map((item) => item.productId)).toEqual(['cleanser', 'sunscreen']);
    expect(stats.products.productRanking[0]).toMatchObject({
      monthlyUses: 3,
      usagePercentage: 75
    });
    expect(stats.products.categoryStats).toEqual([
      { category: 'cleanser', uses: 3, percentage: 75 },
      { category: 'sunscreen', uses: 1, percentage: 25 }
    ]);
    expect(stats.products.routineProductUsage).toEqual([
      {
        routineId: 'morning',
        routineName: 'Rutina de mañana',
        products: [
          { productId: 'cleanser', name: 'Limpiador facial', category: 'cleanser', uses: 2 },
          { productId: 'sunscreen', name: 'Protector solar', category: 'sunscreen', uses: 1 }
        ]
      },
      {
        routineId: 'night',
        routineName: 'Rutina de noche',
        products: [{ productId: 'cleanser', name: 'Limpiador facial', category: 'cleanser', uses: 1 }]
      }
    ]);
  });

  it('lists products without recent use and includes the latest use date when available', async () => {
    const routines = [{ ...activeRoutine('morning', '2026-04-01T00:00:00.000Z'), name: 'Rutina de mañana' }];
    const logs = [
      createRoutineLog({
        id: 'old-morning-log',
        routine_id: 'morning',
        log_date: '2026-04-01',
        completed_at: '2026-04-01T12:00:00.000Z',
        completion_percentage: 100
      }),
      createRoutineLog({
        id: 'recent-morning-log',
        routine_id: 'morning',
        log_date: '2026-05-04',
        completed_at: '2026-05-04T12:00:00.000Z',
        completion_percentage: 100
      })
    ];
    const steps = [routineStep('morning', 'old-mask'), routineStep('morning', 'cleanser')];

    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue(routines);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue(logs);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([logs[1]]).mockResolvedValueOnce([logs[1]]);
    mockedProgressRepository.findRoutineStepsByRoutineIds.mockResolvedValue(steps);
    mockedProgressRepository.findProductsByUserId.mockResolvedValue([
      product('mask', 'Mascarilla hidratante', 'mask'),
      product('cleanser', 'Limpiador facial', 'cleanser'),
      product('never-used', 'Aceite facial', 'other')
    ]);
    mockedProgressRepository.findRoutineStepProductsByStepIds.mockResolvedValue([
      routineStepProduct('old-mask', 'mask'),
      routineStepProduct('cleanser', 'cleanser')
    ]);
    mockedProgressRepository.findStepLogsByRoutineLogIds.mockResolvedValue([
      stepLog(logs[0].id, 'old-mask', true),
      stepLog(logs[1].id, 'cleanser', true)
    ]);

    const stats = await getStatsByUserId('user-1');

    expect(stats.products.unusedProducts).toEqual([
      {
        productId: 'never-used',
        name: 'Aceite facial',
        category: 'other'
      },
      {
        productId: 'mask',
        name: 'Mascarilla hidratante',
        category: 'mask',
        lastUsedAt: '2026-04-01'
      }
    ]);
  });

  it('returns empty stats when the user has no active routines', async () => {
    mockedProgressRepository.findActiveRoutinesByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineLogsByUserId.mockResolvedValue([]);
    mockedProgressRepository.findRoutineLogsByUserIdBetweenDates.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const stats = await getStatsByUserId('user-1');

    expect(stats.weekly.totalExpectedRoutines).toBe(0);
    expect(stats.monthly.totalExpectedRoutines).toBe(0);
    expect(stats.weekDays.every((day) => day.status === 'no_routine')).toBe(true);
    expect(stats.routinesRanking).toEqual([]);
    expect(stats.products).toEqual({
      weekly: {
        totalProductUses: 0,
        distinctProductsUsed: 0
      },
      monthly: {
        totalProductUses: 0,
        distinctProductsUsed: 0
      },
      productRanking: [],
      categoryStats: [],
      routineProductUsage: [],
      unusedProducts: []
    });
  });
});

describe('progress.service setRoutineStepCompletion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-04T12:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rechaza rutina ajena o inexistente antes de crear logs', async () => {
    mockedProgressRepository.findRoutineByIdAndUserId.mockResolvedValue(null);

    await expect(
      setRoutineStepCompletion('user-1', 'routine-other', 'step-1', true)
    ).rejects.toMatchObject({
      statusCode: 404
    } as Partial<ApiError>);

    expect(mockedProgressRepository.findRoutineByIdAndUserId).toHaveBeenCalledWith('routine-other', 'user-1');
    expect(mockedProgressRepository.createRoutineLog).not.toHaveBeenCalled();
  });

  it('rechaza step que no pertenece a la rutina antes de crear logs', async () => {
    mockedProgressRepository.findRoutineByIdAndUserId.mockResolvedValue(activeRoutine('routine-1'));
    mockedProgressRepository.findRoutineStepByIdAndRoutineId.mockResolvedValue(null);

    await expect(
      setRoutineStepCompletion('user-1', 'routine-1', 'step-other', true)
    ).rejects.toMatchObject({
      statusCode: 404
    } as Partial<ApiError>);

    expect(mockedProgressRepository.findRoutineStepByIdAndRoutineId).toHaveBeenCalledWith('step-other', 'routine-1');
    expect(mockedProgressRepository.createRoutineLog).not.toHaveBeenCalled();
  });

  it('permite marcar step propio valido', async () => {
    const routine = activeRoutine('routine-1');
    const step = routineStep('routine-1', 'step-1');
    const routineLog = createRoutineLog({
      id: 'routine-log-1',
      routine_id: 'routine-1',
      log_date: '2026-05-04',
      completion_percentage: 0
    });
    const completedStepLog = stepLog('routine-log-1', 'step-1', true);

    mockedProgressRepository.findRoutineByIdAndUserId.mockResolvedValue(routine);
    mockedProgressRepository.findRoutineStepByIdAndRoutineId.mockResolvedValue(step);
    mockedProgressRepository.findRoutineLogByRoutineIdAndDate.mockResolvedValue(routineLog);
    mockedProgressRepository.findStepLogByRoutineLogIdAndStepId.mockResolvedValue(null);
    mockedProgressRepository.createStepLog.mockResolvedValue(completedStepLog);
    mockedProgressRepository.findStepLogsByRoutineLogId.mockResolvedValue([completedStepLog]);
    mockedProgressRepository.countRoutineSteps.mockResolvedValue(1);
    mockedProgressRepository.updateRoutineLog.mockResolvedValue({
      ...routineLog,
      completion_percentage: 100,
      completed_at: '2026-05-04T12:00:00.000Z'
    });

    const result = await setRoutineStepCompletion('user-1', 'routine-1', 'step-1', true);

    expect(mockedProgressRepository.findRoutineByIdAndUserId).toHaveBeenCalledWith('routine-1', 'user-1');
    expect(mockedProgressRepository.findRoutineStepByIdAndRoutineId).toHaveBeenCalledWith('step-1', 'routine-1');
    expect(mockedProgressRepository.createStepLog).toHaveBeenCalledWith(
      expect.objectContaining({
        routine_log_id: 'routine-log-1',
        step_id: 'step-1',
        is_completed: true
      })
    );
    expect(result).toEqual({
      routine_id: 'routine-1',
      log_date: '2026-05-04',
      routine_log_id: 'routine-log-1',
      completed_step_ids: ['step-1'],
      completion_percentage: 100
    });
  });
});
