import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { BellButton } from '@/components/BellButton';
import { RoutineStepCard } from '@/components/RoutineStepCard';
import { colors } from '@/constants/colors';
import { useRoutine } from '@/hooks/useRoutine';
import type { Routine } from '@/types/routine';

export default function RoutineScreen() {
  const {
    routine,
    routines,
    completedStepIds,
    isLoading,
    error,
    refreshSelectedRoutine,
    selectRoutine,
    removeRoutine,
    removeStep,
    toggleStep
  } = useRoutine();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      void refreshSelectedRoutine();
    }, [refreshSelectedRoutine])
  );

  const steps = routine?.routine_steps ?? [];
  const currentIndex = steps.findIndex((step) => !completedStepIds.has(step.id));
  const activeIndex = currentIndex === -1 ? steps.length : currentIndex;

  const editStep = (stepId: string, section: string | null) => {
    if (!routine) return;

    router.push({
      pathname: '/routine/Add-step',
      params: {
        routineId: routine.id,
        stepId,
        section: section ?? 'complementario'
      }
    });
  };

  const confirmDeleteRoutine = () => {
    if (!routine) return;

    Alert.alert(
      'Eliminar rutina',
      `Se eliminara "${routine.name}" con todos sus pasos. Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void removeRoutine(routine.id)
        }
      ]
    );
  };

  const confirmDeleteStep = (stepId: string, stepName: string) => {
    Alert.alert(
      'Eliminar paso',
      `Se eliminara "${stepName}". Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void removeStep(stepId)
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Cargando rutina...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || routines.length === 0) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Todavia no hay rutinas guardadas</Text>
          <Text style={styles.emptyText}>
            Crea una rutina para verla aca junto con sus pasos.
          </Text>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push('/routine/Create')}
          >
            <Text style={styles.createButtonText}>Crear rutina</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Rutina</Text>
          <BellButton />
        </View>

        <Text style={styles.subtitle}>
          Cuidar tu piel cada dia hace la diferencia
        </Text>

        {!!routine && (
          <View style={styles.selector}>
            <View style={routine.time_of_day === 'morning' ? styles.selectorItemActive : styles.selectorItem}>
              <Text style={routine.time_of_day === 'morning' ? styles.selectorTextActive : styles.selectorText}>
              Rutina matutina
              </Text>
            </View>
            <View style={routine.time_of_day === 'night' ? styles.selectorItemActive : styles.selectorItem}>
              <Text style={routine.time_of_day === 'night' ? styles.selectorTextActive : styles.selectorText}>
              Rutina nocturna
              </Text>
            </View>
          </View>
        )}

        {!!routine && (
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayTitle}>{routine.name}</Text>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/routine/routine-edit',
                      params: { routineId: routine.id }
                    })
                  }
                  accessibilityLabel="Editar rutina"
                  accessibilityRole="button"
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={24}
                    color={colors.textSecondary}
                  />
                </Pressable>

                <Pressable
                  onPress={confirmDeleteRoutine}
                  accessibilityLabel="Eliminar rutina"
                  accessibilityRole="button"
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={24}
                    color={colors.error}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.timeline}>
              {steps.map((step, index) => {
                const isDone = completedStepIds.has(step.id);
                const isCurrent = index === activeIndex;
                const isPending = !isDone && !isCurrent;

                return (
                  <View key={step.id} style={styles.col}>
                    <View style={styles.row}>
                      <View
                        style={[
                          styles.circle,
                          isDone && styles.done,
                          isCurrent && styles.current,
                          isPending && styles.pending
                        ]}
                      >
                        <Text
                          style={[
                            isDone && styles.textDone,
                            isCurrent && styles.textCurrent,
                            isPending && styles.textPending
                          ]}
                        >
                          {isDone ? '✓' : index + 1}
                        </Text>
                      </View>

                      {index < steps.length - 1 && (
                        <View style={styles.line} />
                      )}
                    </View>

                    <Text style={styles.label} numberOfLines={1}>
                      {step.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!!routine && (
          <>
            <Text style={styles.sectionTitle}>Pasos de tu rutina</Text>

            <View style={styles.steps}>
              {steps.map((step, index) => (
                <RoutineStepCard
                  key={step.id}
                  step={step}
                  index={index}
                  completed={completedStepIds.has(step.id)}
                  onToggle={toggleStep}
                  onEdit={(selectedStep) => editStep(selectedStep.id, selectedStep.category)}
                  onDelete={(selectedStep) => confirmDeleteStep(selectedStep.id, selectedStep.name)}
                />
              ))}
            </View>
          </>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Todas tus rutinas</Text>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/routine/Create')}
            accessibilityLabel="Crear rutina"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.surface} />
          </Pressable>
        </View>

        <View style={styles.routinesList}>
          {routines.map((item) => (
            <RoutineListItem
              key={item.id}
              routine={item}
              selected={item.id === routine?.id}
              onPress={() => void selectRoutine(item.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoutineListItem({
  routine,
  selected,
  onPress
}: {
  routine: Routine;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.routineItem, selected && styles.routineItemActive]}
    >
      <View style={styles.routineItemContent}>
        <Text style={styles.routineItemTitle}>{routine.name}</Text>
        <Text style={styles.routineItemMeta}>
          {getRoutineTypeLabel(routine.time_of_day)}
          {routine.description ? ` · ${routine.description}` : ''}
        </Text>
      </View>

      <View style={styles.routineItemRight}>
        {selected && (
          <MaterialCommunityIcons name="check-circle" size={18} color={colors.primaryDark} />
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

function getRoutineTypeLabel(timeOfDay: Routine['time_of_day']) {
  if (timeOfDay === 'morning') return 'Matutina';
  if (timeOfDay === 'night') return 'Nocturna';
  if (timeOfDay === 'custom') return 'Personalizada';

  return 'Sin tipo';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 120
  },
  center: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary
  },

  selector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    padding: 4
  },
  selectorItemActive: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  selectorItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center'
  },
  selectorTextActive: {
    fontWeight: '600',
    color: colors.textPrimary
  },
  selectorText: {
    color: colors.textSecondary
  },

  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  todayTitle: {
    flex: 1,
    fontWeight: '700',
    color: colors.textPrimary
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },

  timeline: {
    flexDirection: 'row'
  },

  col: {
    flex: 1,
    alignItems: 'center'
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },

  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },

  done: {
    backgroundColor: colors.secondaryLight
  },

  current: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.secondaryLight
  },

  pending: {
    backgroundColor: colors.pending
  },

  textDone: {
    color: colors.surface
  },

  textCurrent: {
    color: colors.secondary
  },

  textPending: {
    color: colors.textSecondary
  },

  line: {
    width: 16,
    height: 2,
    backgroundColor: colors.secondaryLight,
    marginHorizontal: 4
  },

  label: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textSecondary,
    marginHorizontal: 4
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },

  steps: {
    gap: 12
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center'
  },

  routinesList: {
    gap: 10
  },

  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },

  routineItemActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight
  },

  routineItemContent: {
    flex: 1,
    gap: 4
  },

  routineItemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },

  routineItemMeta: {
    color: colors.textSecondary,
    fontSize: 13
  },

  routineItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },

  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center'
  },

  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center'
  },

  createButton: {
    marginTop: 8,
    backgroundColor: colors.secondary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10
  },

  createButtonText: {
    color: colors.surface,
    fontWeight: '700'
  }
});
