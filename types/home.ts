import type { Reminder } from './reminder';
import type { Routine } from './routine';
import type { UserProfile } from './user';

export type HomeMetric = {
  id: string;
  label: string;
  value: number;
  suffix: '%';
};

export type DailyHomeSummary = {
  user: UserProfile;
  activeRoutine: Routine;
  completedSteps: number;
  totalSteps: number;
  metrics: HomeMetric[];
  reminders: Reminder[];
};
