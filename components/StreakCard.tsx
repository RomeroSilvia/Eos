import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { StreakProgress } from '@/types/progress';
import { Card } from './Card';

type StreakCardProps = {
  streak: StreakProgress;
};

export function StreakCard({ streak }: StreakCardProps) {
  const streakLabel = streak.currentDays === 1 ? '1 dia' : `${streak.currentDays} dias`;

  return (
    <Card style={styles.card}>
      <View style={styles.icon}>
        <Ionicons color={colors.secondary} name="flame-outline" size={24} />
      </View>
      <View>
        <Text style={styles.value}>{streakLabel}</Text>
        <Text style={styles.label}>Racha actual</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.secondaryLight,
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  value: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14
  }
});
