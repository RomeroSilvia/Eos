import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { RoutineStepItem } from './RoutineStepItem';

type Step = {
  id: string;
  nombre: string;
  producto?: string;
  category: string;
};

type Props = {
  title: string;
  description: string;
  icon: string;
  steps: Step[];
  onAddStep: () => void;
  onEditStep?: (stepId: string, category: string) => void;
  onDeleteStep?: (stepId: string) => void;
};

export function RoutineSectionCard({
  title,
  description,
  icon,
  steps,
  onAddStep,
  onEditStep,
  onDeleteStep
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.left}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name={icon as any} size={22} color={colors.surface} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.desc}>{description}</Text>
          </View>
        </View>

        <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.textSecondary} />
      </View>

      {steps.length > 0 && (
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <RoutineStepItem
              key={step.id}
              index={index + 1}
              title={step.nombre}
              product={step.producto}
              onPress={onEditStep ? () => onEditStep(step.id, step.category) : undefined}
              onDelete={onDeleteStep ? () => onDeleteStep(step.id) : undefined}
            />
          ))}
        </View>
      )}

      <Pressable style={styles.add} onPress={onAddStep}>
        <Text style={styles.addText}>+ Añadir paso</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  left: {
    flexDirection: 'row',
    gap: 12,
    flex: 1
  },

  icon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },

  textContainer: {
    flex: 1,
    minWidth: 0
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },

  desc: {
    fontSize: 13,
    color: colors.textSecondary,
    flexShrink: 1
  },

  steps: {
    gap: 8
  },

  add: {
    marginTop: 6,
    alignItems: 'center'
  },

  addText: {
    color: colors.primaryDark,
    fontWeight: '600'
  }
});