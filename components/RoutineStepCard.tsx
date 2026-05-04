import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import type { RoutineStep } from '@/types/routine';
import { Card } from './Card';

type RoutineStepCardProps = {
  step: RoutineStep;
  index: number;
  completed: boolean;
  onToggle: (id: string) => void;
  onEdit: (step: RoutineStep) => void;
  onDelete: (step: RoutineStep) => void;
};

const getIcon = (step: RoutineStep) => {
  const text = `${step.category ?? ''} ${step.name}`.toLowerCase();

  if (text.includes('limpieza')) return 'lotion';
  if (text.includes('serum') || text.includes('tratamiento')) return 'eyedropper';
  if (text.includes('hidrat')) return 'water-outline';
  if (text.includes('proteccion') || text.includes('protector')) return 'sun-thermometer';

  return 'bottle-tonic-outline';
};

export function RoutineStepCard({
  step,
  index,
  completed,
  onToggle,
  onEdit,
  onDelete
}: RoutineStepCardProps) {
  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => onToggle(step.id)}
        style={[styles.check, completed ? styles.checkDone : styles.checkPending]}
      >
        <MaterialCommunityIcons
          name={completed ? 'check' : 'circle-outline'}
          size={18}
          color={completed ? colors.surface : colors.textSecondary}
        />
      </Pressable>

      <View style={styles.icon}>
        <MaterialCommunityIcons
          name={getIcon(step)}
          size={20}
          color={colors.background}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {index + 1}. {step.name}
        </Text>

        {!!step.description && (
          <Text style={styles.description}>{step.description}</Text>
        )}

        <Text style={completed ? styles.badgeDone : styles.badgePending}>
          {completed ? 'Completado' : 'Pendiente'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => onEdit(step)}
          accessibilityLabel="Editar paso"
          accessibilityRole="button"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => onDelete(step)}
          accessibilityLabel="Eliminar paso"
          accessibilityRole="button"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
        </Pressable>
      </View>
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
    backgroundColor: colors.primaryDark
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

  description: {
    color: colors.textSecondary,
    fontSize: 13
  },

  actions: {
    alignItems: 'center',
    gap: 12
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
