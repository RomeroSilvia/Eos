import { Text, View } from 'react-native';
import { ProgressStateCard } from '@/components/progress/ProgressStateCard';
import type { RoutineStats } from '@/types/progress';
import {
  formatDayCount,
  formatRoutineCount,
  getMonthlyStatsMessage,
  getRoutineMotivationalMessage,
  getRoutineTimeLabel,
  getStatsWeekDayStatusLabel,
  getWeeklyStatsMessage,
  pluralize
} from '@/utils/progress';
import { RankingItem } from './RankingItem';
import { SectionTitle } from './StatsSection';
import { SmallStat } from './SmallStat';
import { StatCard } from './StatCard';
import { StatsProgressBlock } from './StatsProgressBlock';
import { StatsRecommendation } from './StatsRecommendation';
import { statsStyles as styles } from './stats.styles';

type RoutineStatsSectionProps = {
  stats: RoutineStats;
};

export function RoutineStatsSection({ stats }: RoutineStatsSectionProps) {
  return (
    <>
      <RoutineSummary stats={stats} />
      <WeeklyProgressSection stats={stats} />
      <MonthlyProgressSection stats={stats} />
      <RoutineRankingSection routines={stats.routinesRanking} />
      <StatsRecommendation icon="leaf-outline" text={getRoutineMotivationalMessage(stats)} />
    </>
  );
}

function RoutineSummary({ stats }: RoutineStatsSectionProps) {
  return (
    <>
      <SectionTitle title="Resumen" />
      <View style={styles.metricsGrid}>
        <StatCard
          label="Cumplimiento semanal"
          value={`${stats.weekly.completionPercentage}%`}
          detail={formatRoutineCount(stats.weekly.completedRoutines, stats.weekly.totalExpectedRoutines)}
        />
        <StatCard
          label="Cumplimiento mensual"
          value={`${stats.monthly.completionPercentage}%`}
          detail={formatRoutineCount(stats.monthly.completedRoutines, stats.monthly.totalExpectedRoutines)}
        />
        <StatCard label="Racha actual" value={formatDayCount(stats.weekly.currentStreak)} detail="en curso" />
        <StatCard label="Mejor racha" value={formatDayCount(stats.weekly.bestStreak)} detail="histórica" />
        <StatCard
          label="Esta semana"
          value={String(stats.weekly.completedRoutines)}
          detail={pluralize(stats.weekly.completedRoutines, 'rutina completada', 'rutinas completadas')}
        />
        <StatCard
          label="Este mes"
          value={String(stats.monthly.completedRoutines)}
          detail={pluralize(stats.monthly.completedRoutines, 'rutina completada', 'rutinas completadas')}
        />
        <StatCard label="Días completos" value={String(stats.monthly.completeDays)} detail="este mes" />
        <StatCard label="Días parciales" value={String(stats.monthly.partialDays)} detail="este mes" />
      </View>
    </>
  );
}

function WeeklyProgressSection({ stats }: RoutineStatsSectionProps) {
  return (
    <>
      <SectionTitle title="Semana" />
      <StatsProgressBlock
        percentage={stats.weekly.completionPercentage}
        title="Cumplimiento semanal"
        detail={formatRoutineCount(stats.weekly.completedRoutines, stats.weekly.totalExpectedRoutines)}
        message={getWeeklyStatsMessage(stats.weekly)}
      />

      <View style={styles.weekList}>
        {stats.weekDays.map((day) => (
          <View key={day.date} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              <Text style={styles.dayStatus}>{getStatsWeekDayStatusLabel(day.status)}</Text>
            </View>
            <View style={styles.dayNumbers}>
              <Text style={styles.dayCount}>
                {day.totalExpectedRoutines === 0
                  ? 'Sin rutina asignada'
                  : `${day.completedRoutines} de ${day.totalExpectedRoutines}`}
              </Text>
              <Text style={styles.dayPercent}>{day.completionPercentage}%</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function MonthlyProgressSection({ stats }: RoutineStatsSectionProps) {
  return (
    <>
      <SectionTitle title="Mes" />
      <StatsProgressBlock
        percentage={stats.monthly.completionPercentage}
        title="Comparación mensual"
        detail={formatRoutineCount(stats.monthly.completedRoutines, stats.monthly.totalExpectedRoutines)}
        message={getMonthlyStatsMessage(stats.monthly)}
      />
      <View style={styles.monthGrid}>
        <SmallStat label="Completos" value={stats.monthly.completeDays} />
        <SmallStat label="Parciales" value={stats.monthly.partialDays} />
        <SmallStat label="Incompletos" value={stats.monthly.incompleteDays} />
        <SmallStat label="Sin rutina" value={stats.monthly.noRoutineDays} />
      </View>
    </>
  );
}

function RoutineRankingSection({ routines }: { routines: RoutineStats['routinesRanking'] }) {
  return (
    <>
      <SectionTitle title="Rutinas más cumplidas" />
      {routines.length === 0 ? (
        <ProgressStateCard
          icon="sparkles-outline"
          title="Todavía no tenés rutinas configuradas."
          text="Creá una rutina simple para empezar a registrar tu progreso."
        />
      ) : (
        <View style={styles.rankingList}>
          {routines.map((routine) => (
            <RankingItem
              key={routine.routineId}
              title={routine.routineName}
              meta={getRoutineTimeLabel(routine.timeOfDay)}
              detail={`${routine.completedCount} de ${routine.expectedCount} veces completada`}
              value={`${routine.completionPercentage}%`}
            />
          ))}
        </View>
      )}
    </>
  );
}
