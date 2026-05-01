import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { WeeklyProgress } from '@/types/progress';
import { Card } from './Card';

type ProgressSummaryCardProps = {
  progress: WeeklyProgress;
};

export function ProgressSummaryCard({ progress }: ProgressSummaryCardProps) {
  return (
    <Card variant="soft" style={styles.card}>
      <Text style={styles.label}>Cumplimiento semanal</Text>
      <View style={styles.row}>
        <Text style={styles.value}>{progress.percent}%</Text>
        <Text style={styles.description}>{progress.label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress.percent}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 14
  },
  value: {
    color: colors.primaryDark,
    fontSize: 44,
    fontWeight: '900'
  },
  description: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    paddingBottom: 8
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%'
  }
});
