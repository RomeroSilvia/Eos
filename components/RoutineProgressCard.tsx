import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { formatStepCount } from '@/utils/format';
import { Card } from './Card';

type RoutineProgressCardProps = {
  title: string;
  completedSteps: number;
  totalSteps: number;
};

export function RoutineProgressCard({ title, completedSteps, totalSteps }: RoutineProgressCardProps) {
  const progress = totalSteps === 0 ? 0 : completedSteps / totalSteps;

  return (
    <Card variant="soft" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Rutina de hoy</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.meta}>{formatStepCount(completedSteps, totalSteps)}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12
  },
  header: {
    gap: 4
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800'
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 9,
    overflow: 'hidden'
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%'
  }
});
