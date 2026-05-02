import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { RoutineStep } from '@/types/routine';
import { Card } from './Card';

type RoutineStepCardProps = {
  step: RoutineStep;
  index: number;
};
const getIcon = (title: string) => {
  const t = title.toLowerCase();

  if (t.includes('limpieza')) return 'lotion';
  if (t.includes('serum') || t.includes('tonificación')) return 'eyedropper';
  if (t.includes('hidrat')) return 'water-outline';
  if (t.includes('proteccion') || t.includes('protector')) return 'sun-thermometer';

  return 'bottle-tonic-outline';
};

export function RoutineStepCard({ step, index }: RoutineStepCardProps) {
  const completed = step.status === 'completed';

  return (
    <Card style={styles.card}>

      {/* Check */}
      <View style={[styles.check, completed ? styles.checkDone : styles.checkPending]}>
        <MaterialCommunityIcons
          name={completed ? 'check' : 'circle-outline'}
          size={18}
          color={completed ? colors.surface : colors.textSecondary}
        />
      </View>

      {/* Icon */}
      <View style={styles.icon}>
        <MaterialCommunityIcons
          name={getIcon(step.title)}
          size={20}
          color={colors.background}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>
          {index + 1}. {step.title}
        </Text>

        {step.products.map((product) => (
          <Text key={product.id} style={styles.product}>
            • {product.name}
          </Text>
        ))}

        <Text style={completed ? styles.badgeDone : styles.badgePending}>
          {completed ? 'completado' : 'Pendiente'}
        </Text>
      </View>

      {/* Menu */}
      <MaterialCommunityIcons
        name="dots-vertical"
        size={24}
        color={colors.textSecondary}
      />

    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  checkDone: {
    backgroundColor: colors.primaryDark,
  },
  checkPending: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    flex: 1,
    gap: 4
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  product: {
    color: colors.textSecondary,
    fontSize: 13
  },
  badgeDone: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600'
  },
  badgePending: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.pending,
    color: colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600'
  }
});