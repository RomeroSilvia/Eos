import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { CalendarDayProgress, CalendarDayStatus } from '@/types/progress';
import { addMonths, buildCalendarGrid, formatMonthTitle, getInitialVisibleMonth } from '@/utils/month-calendar.utils';
import { getCalendarStatusLabel } from '@/utils/progress';
type MonthCalendarCardProps = {
  days: CalendarDayProgress[];
  onDayPress?: (day: CalendarDayProgress) => void;
};

const statusStyle: Record<CalendarDayStatus, { backgroundColor: string; borderColor: string; color: string }> = {
  completed: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.surface
  },
  partial: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
    color: colors.primaryDark
  },
  pending: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.textMuted
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.textMuted
  }
};

export function MonthCalendarCard({ days, onDayPress }: MonthCalendarCardProps) {
  const initialMonth = useMemo(() => getInitialVisibleMonth(days), [days]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const calendarCells = useMemo(() => buildCalendarGrid(visibleMonth, days), [days, visibleMonth]);
  const title = formatMonthTitle(visibleMonth);

  function handlePreviousMonth() {
    setVisibleMonth((current) => addMonths(current, -1));
  }

  function handleNextMonth() {
    setVisibleMonth((current) => addMonths(current, 1));
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Ver mes anterior" onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons color={colors.primaryDark} name="chevron-back" size={20} />
        </Pressable>

        <Text style={styles.title}>{title}</Text>

        <Pressable accessibilityLabel="Ver mes siguiente" onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons color={colors.primaryDark} name="chevron-forward" size={20} />
        </Pressable>
      </View>

      <View style={styles.weekDays}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
          <View key={`${day}-${index}`} style={styles.weekDayWrapper}>
            <Text style={styles.weekDay}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {calendarCells.map((cell) => {
          if (cell.type === 'spacer') {
            return (
              <View key={cell.id} style={styles.dayWrapper}>
                <View style={styles.spacerDay} />
              </View>
            );
          }

          const variant = statusStyle[cell.status];
          const dayProgress = days.find((day) => day.date === cell.date);
          const isInteractive = Boolean(dayProgress && (cell.status === 'completed' || cell.status === 'partial'));

          return (
            <View key={cell.id} style={styles.dayWrapper}>
              <Pressable
                accessibilityRole={isInteractive ? 'button' : undefined}
                accessibilityLabel={`${cell.day}, ${getCalendarStatusLabel(cell.status)}`}
                disabled={!isInteractive}
                onPress={() => {
                  if (dayProgress) {
                    onDayPress?.(dayProgress);
                  }
                }}
                style={({ pressed }) => [
                  styles.day,
                  isInteractive ? styles.dayInteractive : null,
                  pressed ? styles.dayPressed : null,
                  {
                    backgroundColor: variant.backgroundColor,
                    borderColor: variant.borderColor
                  }
                ]}
              >
                <Text style={[styles.dayText, { color: variant.color }]}>{cell.day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem label="Completado" status="completed" />
        <LegendItem label="Parcial" status="partial" />
        <LegendItem label="Pendiente" status="pending" />
      </View>
    </View>
  );
}

function LegendItem({ label, status }: { label: string; status: CalendarDayStatus }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          {
            backgroundColor: statusStyle[status].backgroundColor,
            borderColor: statusStyle[status].borderColor
          }
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    gap: 16,
    padding: 18
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  weekDays: {
    flexDirection: 'row',
    width: '100%'
  },
  weekDayWrapper: {
    alignItems: 'center',
    width: `${100 / 7}%`
  },
  weekDay: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    width: '100%'
  },
  dayWrapper: {
    alignItems: 'center',
    width: `${100 / 7}%`
  },
  day: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  dayInteractive: {
    shadowColor: colors.primaryDark,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4
  },
  dayPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }]
  },
  spacerDay: {
    height: 34,
    width: 34
  },
  dayText: {
    fontSize: 13,
    fontWeight: '900'
  },
  legend: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  legendDot: {
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    width: 10
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  }
});
