import type { RoutineTimeOfDay } from './routine';

export type Reminder = {
  id: string;
  title: string;
  time: string;
  enabled: boolean;
  timeOfDay?: RoutineTimeOfDay;
};
