import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { Card } from './Card';

type HomeMetricCardProps = {
  label: string;
  value: number;
};

export function HomeMetricCard({ label, value }: HomeMetricCardProps) {
  return (
    <Card style={styles.card}>
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
