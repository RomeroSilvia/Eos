import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoutineProgressCard } from '@/components/RoutineProgressCard';
import { RoutineStepCard } from '@/components/RoutineStepCard';
import { colors } from '@/constants/colors';
import { useRoutine } from '@/hooks/useRoutine';

export default function RoutineScreen() {
  const { routine, completedSteps, totalSteps } = useRoutine();

  if (!routine) {
    return <SafeAreaView style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Rutina</Text>
          <Text style={styles.chip}>Rutina matutina</Text>
        </View>

        <RoutineProgressCard title={routine.name} completedSteps={completedSteps} totalSteps={totalSteps} />

        <View style={styles.steps}>
          {routine.steps.map((step) => (
            <RoutineStepCard key={step.id} step={step} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 116
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900'
  },
  chip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  steps: {
    gap: 12
  }
});
