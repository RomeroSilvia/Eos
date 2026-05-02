import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RoutineStepCard } from '@/components/RoutineStepCard';
import { colors } from '@/constants/colors';
import { useRoutine } from '@/hooks/useRoutine';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function RoutineScreen() {
  const { routine } = useRoutine();
  const router = useRouter();

  if (!routine) {
    return <SafeAreaView style={styles.screen} />;
  }

  const currentIndex = routine.steps.findIndex(s => s.status !== 'completed');

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Rutina</Text>
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
        </View>

        <Text style={styles.subtitle}>
          Cuidar tu piel cada día hace la diferencia
        </Text>

        <View style={styles.selector}>
          <View style={styles.selectorItemActive}>
            <Text style={styles.selectorTextActive}>🌤 Rutina matutina</Text>
          </View>
          <View style={styles.selectorItem}>
            <Text style={styles.selectorText}>🌙 Rutina nocturna</Text>
          </View>
        </View>

        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>Rutina de hoy</Text>
            <Pressable
              onPress={() => router.push('/routine/edit')}
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
          </View>

          <View style={styles.timeline}>
            {routine.steps.map((step, index) => {
              const isDone = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isPending = index > currentIndex;

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

                    {index < routine.steps.length - 1 && (
                      <View style={styles.line} />
                    )}
                  </View>

                  <Text style={styles.label} numberOfLines={1}>
                    {step.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pasos de tu rutina</Text>

        <View style={styles.steps}>
          {routine.steps.map((step, index) => (
            <RoutineStepCard key={step.id} step={step} index={index} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    marginBottom: 12
  },
  todayTitle: {
    fontWeight: '700',
    color: colors.textPrimary
  },
  editBtn: {
    fontSize: 13,
    color: colors.textSecondary
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
    marginHorizontal: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },

  steps: {
    gap: 12
  }
});