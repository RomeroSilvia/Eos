import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';

type ProgressBarProps = {
  percentage: number;
};

export function ProgressBar({ percentage }: ProgressBarProps) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${percentage}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
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
