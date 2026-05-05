import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { PeriodProgress } from '@/types/progress';

type ProgressSummaryCardProps = {
  progress: PeriodProgress;
};

export function ProgressSummaryCard({ progress }: ProgressSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Cumplimiento semanal</Text>
          <Text style={styles.title}>{progress.percent}%</Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.primaryDark} name="sparkles-outline" size={24} />
        </View>
      </View>

      <Text style={styles.description}>{progress.label}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 22
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  title: {
    color: colors.primaryDark,
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 60,
    marginTop: 4
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%'
  }
});
