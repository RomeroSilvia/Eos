import { Text, View } from 'react-native';
import { ProgressBar } from '@/components/progress/ProgressBar';
import { statsStyles as styles } from './stats.styles';

type StatsProgressBlockProps = {
  percentage: number;
  title: string;
  detail: string;
  message: string;
};

export function StatsProgressBlock({ percentage, title, detail, message }: StatsProgressBlockProps) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.progressTitle}>{title}</Text>
          <Text style={styles.progressDetail}>{detail}</Text>
        </View>
        <Text style={styles.progressPercent}>{percentage}%</Text>
      </View>
      <ProgressBar percentage={percentage} />
      <Text style={styles.progressMessage}>{message}</Text>
    </View>
  );
}
