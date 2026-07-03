import { Text, View, type ViewStyle } from 'react-native';
import { statsStyles as styles } from './stats.styles';

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  style?: ViewStyle;
};

export function StatCard({ label, value, detail, style }: StatCardProps) {
  return (
    <View style={[styles.metricCard, style]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}
