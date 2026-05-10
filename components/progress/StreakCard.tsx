import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { StreakProgress } from '@/types/progress';

type StreakCardProps = {
  streak: StreakProgress;
};

export function StreakCard({ streak }: StreakCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.leftBlock}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.primaryDark} name="flame-outline" size={22} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.label}>Racha actual</Text>
          <Text style={styles.value}>{streak.currentDays} días</Text>
          <Text style={styles.subtitle}>{streak.subtitle}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.weekBlock}>
        <View style={styles.weekRow}>
          {streak.weekProgress.map((item, index) => (
            <View key={`${item.day}-${index}`} style={styles.dayColumn}>
              <Text style={styles.dayLabel}>{item.day}</Text>
              <View style={[styles.dayDot, item.completed ? styles.dayDotCompleted : styles.dayDotEmpty]}>
                {item.completed ? <Ionicons color={colors.surface} name="checkmark" size={12} /> : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 128,
    paddingHorizontal: 16,
    paddingVertical: 18
  },
  leftBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1.08,
    gap: 12,
    minWidth: 0
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  textBlock: {
    flex: 1,
    minWidth: 0
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  value: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
    marginTop: 3
  },
  subtitle: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3
  },
  divider: {
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    width: 1
  },
  weekBlock: {
    flex: 1.2,
    minWidth: 0
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
    width: 22
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900'
  },
  dayDot: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20
  },
  dayDotCompleted: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondaryDark
  },
  dayDotEmpty: {
    backgroundColor: colors.secondarySoft,
    borderColor: colors.secondaryLight
  }
});
