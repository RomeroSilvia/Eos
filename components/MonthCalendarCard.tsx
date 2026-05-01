import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { CalendarDayProgress, CalendarDayStatus } from '@/types/progress';
import { Card } from './Card';

type MonthCalendarCardProps = {
  days: CalendarDayProgress[];
};

const statusStyles: Record<CalendarDayStatus, { backgroundColor: string; color: string }> = {
  completed: { backgroundColor: colors.primary, color: colors.surface },
  partial: { backgroundColor: colors.warning, color: colors.textPrimary },
  pending: { backgroundColor: colors.pending, color: colors.textSecondary },
  empty: { backgroundColor: colors.surface, color: colors.textMuted }
};

export function MonthCalendarCard({ days }: MonthCalendarCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Calendario mensual</Text>
      <View style={styles.grid}>
        {days.map((day) => (
          <View key={day.date} style={[styles.day, { backgroundColor: statusStyles[day.status].backgroundColor }]}>
            <Text style={[styles.dayText, { color: statusStyles[day.status].color }]}>{day.day}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  day: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  dayText: {
    fontSize: 13,
    fontWeight: '800'
  }
});
