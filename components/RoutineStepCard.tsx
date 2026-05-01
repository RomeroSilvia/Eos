import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { RoutineStep } from '@/types/routine';
import { Card } from './Card';

type RoutineStepCardProps = {
  step: RoutineStep;
};

export function RoutineStepCard({ step }: RoutineStepCardProps) {
  const completed = step.status === 'completed';

  return (
    <Card style={styles.card}>
      <View style={[styles.check, completed ? styles.checkDone : styles.checkPending]}>
        <Ionicons
          color={completed ? colors.surface : colors.textMuted}
          name={completed ? 'checkmark' : 'ellipse-outline'}
          size={18}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.products}>{step.products.map((product) => product.name).join(', ')}</Text>
      </View>
      <Text style={[styles.status, completed ? styles.doneText : styles.pendingText]}>
        {completed ? 'Completado' : 'Pendiente'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  check: {
    alignItems: 'center',
    borderRadius: 16,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  checkDone: {
    backgroundColor: colors.primary
  },
  checkPending: {
    backgroundColor: colors.pending
  },
  content: {
    flex: 1,
    gap: 4
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  products: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  status: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  doneText: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark
  },
  pendingText: {
    backgroundColor: colors.pending,
    color: colors.textSecondary
  }
});
