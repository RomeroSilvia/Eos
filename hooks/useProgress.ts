import { useEffect, useState } from 'react';
import { getCalendarProgress, getStreakProgress, getWeeklyProgress } from '@/services/progress';
import type { CalendarDayProgress, StreakProgress, WeeklyProgress } from '@/types/progress';

export function useProgress() {
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [streakProgress, setStreakProgress] = useState<StreakProgress | null>(null);
  const [calendarProgress, setCalendarProgress] = useState<CalendarDayProgress[]>([]);

  useEffect(() => {
    void getWeeklyProgress().then(setWeeklyProgress);
    void getStreakProgress().then(setStreakProgress);
    void getCalendarProgress().then(setCalendarProgress);
  }, []);

  return { weeklyProgress, streakProgress, calendarProgress };
}
