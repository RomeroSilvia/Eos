import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { ProgressMetric } from '@/types/progress';

type ProgressMetricCardProps = {
  metric: ProgressMetric;
};

export function ProgressMetricCard({ metric }: ProgressMetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{metric.value}</Text>
      <Text style={styles.label}>{metric.label}</Text>
      <Text style={styles.detail}>{metric.detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 118,
    padding: 18
  },
  value: {
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4
  }
});
