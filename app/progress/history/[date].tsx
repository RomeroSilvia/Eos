import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressStateCard } from '@/components/progress/ProgressStateCard';
import { colors } from '@/constants/colors';
import { getProgressDayDetail } from '@/services/progress';
import type { RoutineDayDetail } from '@/types/progress';
import {
  formatDateTitle,
  getDayDetailStatusLabel,
  getDaySummaryText,
  getRoutineStatusLabel,
  getRoutineTimeLabel
} from '@/utils/progress';

export default function ProgressDayDetailScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = Array.isArray(date) ? date[0] : date;
  const [detail, setDetail] = useState<RoutineDayDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const formattedDate = useMemo(() => formatDateTitle(selectedDate), [selectedDate]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedDate) {
      setError(new Error('No se pudo identificar la fecha seleccionada'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    void getProgressDayDetail(selectedDate)
      .then((dayDetail: RoutineDayDetail) => {
        if (isMounted) {
          setDetail(dayDetail);
        }
      })
      .catch((unknownError: unknown) => {
        if (isMounted) {
          setError(unknownError instanceof Error ? unknownError : new Error('No se pudo cargar el detalle'));
          setDetail(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons color={colors.primaryDark} name="chevron-back" size={22} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Detalle del día</Text>
            <Text style={styles.title}>{formattedDate}</Text>
          </View>
        </View>

        {isLoading ? (
          <ProgressStateCard icon="hourglass-outline" title="Cargando detalle" text="Estamos buscando tus rutinas de ese día." />
        ) : error ? (
          <ProgressStateCard icon="alert-circle-outline" title="No pudimos cargar el detalle" text={error.message} />
        ) : !detail || detail.totalRoutines === 0 ? (
          <ProgressStateCard
            icon="calendar-outline"
            title="No hay progreso registrado"
            text="Todavía no registraste rutinas para esta fecha."
          />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.statusLabel}>{getDayDetailStatusLabel(detail.status)}</Text>
                <Text style={styles.percent}>{detail.completionPercentage}%</Text>
              </View>
              <Text style={styles.summaryText}>{getDaySummaryText(detail)}</Text>
            </View>

            <View style={styles.routinesList}>
              {detail.routines.map((routine) => (
                <View key={routine.id} style={styles.routineCard}>
                  <View style={styles.routineHeader}>
                    <View style={styles.routineTitleBlock}>
                      <Text style={styles.routineName}>{routine.name}</Text>
                      <Text style={styles.routineMeta}>{getRoutineTimeLabel(routine.timeOfDay, { includePrefix: true })}</Text>
                    </View>
                    <View style={[styles.statusBadge, getRoutineStatusStyle(routine.status)]}>
                      <Text style={styles.statusBadgeText}>{getRoutineStatusLabel(routine.status)}</Text>
                    </View>
                  </View>

                  <Text style={styles.stepsMeta}>
                    {routine.completedSteps} de {routine.totalSteps} pasos completados
                  </Text>

                  <View style={styles.stepsList}>
                    {routine.steps.length === 0 ? (
                      <Text style={styles.emptySteps}>Esta rutina no tiene pasos configurados.</Text>
                    ) : (
                      routine.steps.map((step) => (
                        <View key={step.id} style={styles.stepRow}>
                          <Ionicons
                            color={step.completed ? colors.primaryDark : colors.textMuted}
                            name={step.completed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                          />
                          <View style={styles.stepTextBlock}>
                            <Text style={[styles.stepName, step.completed ? styles.stepCompleted : null]}>
                              {step.name}
                            </Text>
                            {step.productName ? <Text style={styles.productName}>{step.productName}</Text> : null}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getRoutineStatusStyle(status: RoutineDayDetail['routines'][number]['status']) {
  if (status === 'complete') return styles.statusComplete;
  if (status === 'partial') return styles.statusPartial;
  return styles.statusPending;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 116
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800'
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: 2,
    textTransform: 'capitalize'
  },
  summaryCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statusLabel: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: '900'
  },
  percent: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: '900'
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  routinesList: {
    gap: 12
  },
  routineCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  routineHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  routineTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  routineMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusComplete: {
    backgroundColor: colors.primary
  },
  statusPartial: {
    backgroundColor: colors.primaryLight
  },
  statusPending: {
    backgroundColor: colors.pending
  },
  statusBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900'
  },
  stepsMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  stepsList: {
    gap: 9
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9
  },
  stepTextBlock: {
    flex: 1,
    minWidth: 0
  },
  stepName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  stepCompleted: {
    color: colors.textPrimary
  },
  productName: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1
  },
  emptySteps: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18
  }
});
