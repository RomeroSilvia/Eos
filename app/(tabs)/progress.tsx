import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonthCalendarCard } from '@/components/MonthCalendarCard';
import { ProgressSummaryCard } from '@/components/ProgressSummaryCard';
import { StreakCard } from '@/components/StreakCard';
import { colors } from '@/constants/colors';
import { useProgress } from '@/hooks/useProgress';

export default function ProgressScreen() {
  const { weeklyProgress, streakProgress, calendarProgress } = useProgress();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Progreso</Text>
        {weeklyProgress ? <ProgressSummaryCard progress={weeklyProgress} /> : null}
        {streakProgress ? <StreakCard streak={streakProgress} /> : null}
        <MonthCalendarCard days={calendarProgress} />
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
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    paddingTop: 8
  }
});
