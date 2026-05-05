import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { Card } from './Card';

type HomeMetricCardProps = {
  metricId?: string;
  label: string;
  value: number;
};

export function HomeMetricCard({ metricId, label, value }: HomeMetricCardProps) {
  const isHydration = metricId === 'hydration';
  const isGlow = metricId === 'glow';

  return (
    <Card style={styles.card}>
      {(isHydration || isGlow) && (
        <View style={styles.metricIconCircle}>
          {isHydration ? (
            <Ionicons name="water-outline" size={30} color={colors.primaryDark} />
          ) : (
            <Ionicons name="sparkles-outline" size={32} color={colors.primaryDark} />
          )}
        </View>
      )}
      <Text style={styles.value}>{value}%</Text>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 8
  },
  metricIconCircle: {
    alignItems: 'center',
    borderColor: colors.primaryDark,
    borderRadius: 36,
    borderWidth: 2,
    height: 72,
    justifyContent: 'center',
    marginBottom: 4,
    width: 72
  },
  value: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: '800'
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 7,
    overflow: 'hidden'
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%'
  }
});
