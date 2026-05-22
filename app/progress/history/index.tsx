import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressStateCard } from '@/components/progress/ProgressStateCard';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useProgressHistory } from '@/hooks/useProgressHistory';
import type { ProgressHistoryDay } from '@/types/progress';
import {
  formatDateTitle,
  formatRoutineCount,
  formatStepCount,
  getHistoryDayStatusLabel,
  getRoutineStatusLabel,
  getRoutineTimeLabel
} from '@/utils/progress';

export default function ProgressHistoryScreen() {
  const router = useRouter();
  const { error, history, isLoading, refetch } = useProgressHistory();

  function openDayDetail(date: string) {
    router.push({
      pathname: routes.progressDayDetail,
      params: { date }
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons color={colors.primaryDark} name="chevron-back" size={22} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Historial</Text>
            <Text style={styles.subtitle}>Tus rutinas completadas y parciales</Text>
          </View>
        </View>

        {isLoading ? (
          <ProgressStateCard icon="hourglass-outline" title="Cargando historial..." text="Estamos buscando tus rutinas." />
        ) : error ? (
          <View style={styles.stateWrapper}>
            <ProgressStateCard icon="alert-circle-outline" title="No pudimos cargar tu historial." text={error.message} />
            <Pressable accessibilityRole="button" onPress={refetch} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : history.length === 0 ? (
          <ProgressStateCard
            icon="calendar-outline"
            title="Todavía no tenés rutinas registradas en tu historial."
            text="Completá una rutina para empezar a ver tu progreso."
          />
        ) : (
          <View style={styles.list}>
            {history.map((day) => (
              <HistoryDayCard day={day} key={day.date} onPress={() => openDayDetail(day.date)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryDayCard({ day, onPress }: { day: ProgressHistoryDay; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.date}>{formatDateTitle(day.date)}</Text>
          <Text style={styles.statusLine}>
            {getHistoryDayStatusLabel(day.status)} · {day.completionPercentage}%
          </Text>
        </View>
        <Ionicons color={colors.primaryDark} name="chevron-forward" size={20} />
      </View>

      <Text style={styles.summary}>{formatRoutineCount(day.completedRoutines, day.totalExpectedRoutines)}</Text>

      <View style={styles.routinesList}>
        {day.routines.map((routine) => (
          <View key={routine.routineId} style={styles.routineRow}>
            <View style={styles.routineText}>
              <Text style={styles.routineName}>{routine.routineName || 'Rutina sin nombre'}</Text>
              <Text style={styles.routineMeta}>{getRoutineTimeLabel(routine.timeOfDay, { includePrefix: true })}</Text>
            </View>
            <Text style={styles.routineStatus}>
              {getRoutineStatusLabel(routine.status)} · {formatStepCount(routine.completedSteps, routine.totalSteps)}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
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
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 3
  },
  list: {
    gap: 12
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0
  },
  date: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'capitalize'
  },
  statusLine: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  routinesList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12
  },
  routineRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  routineText: {
    flex: 1,
    minWidth: 0
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900'
  },
  routineMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  routineStatus: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 132,
    textAlign: 'right'
  },
  stateWrapper: {
    gap: 12
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.secondaryDark,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  retryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900'
  }
});
