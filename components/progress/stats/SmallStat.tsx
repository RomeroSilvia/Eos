import { Text, View } from 'react-native';
import { statsStyles as styles } from './stats.styles';

type SmallStatProps = {
  label: string;
  value: number;
};

export function SmallStat({ label, value }: SmallStatProps) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatValue}>{value}</Text>
      <Text style={styles.smallStatLabel}>{label}</Text>
    </View>
  );
}
