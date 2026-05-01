import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HomeMetricCard } from '@/components/HomeMetricCard';
import { HomeReminderItem } from '@/components/HomeReminderItem';
import { colors } from '@/constants/colors';
import { useHome } from '@/hooks/useHome';
import { formatStepCount } from '@/utils/format';

export default function HomeScreen() {
  const { summary } = useHome();

  if (!summary) {
    return <SafeAreaView style={styles.screen} />;
  }

  const progress = summary.completedSteps / summary.totalSteps;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Hola, {summary.user.name}!🌱</Text>
          <Text style={styles.subtitle}>Sentite bien con tu propia piel</Text>
        </View>

        <Card variant="soft" style={styles.routineCard}>
          <Text style={styles.sectionLabel}>Tu rutina hoy</Text>
          <Text style={styles.routineTitle}>Mañana ☀️</Text>
          <Text style={styles.description}>{formatStepCount(summary.completedSteps, summary.totalSteps)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Button variant="secondary" onPress={() => router.push('/routine')} style={styles.routineButton}>
            Ver rutina
          </Button>
        </Card>

        <View style={styles.metricsRow}>
          {summary.metrics.map((metric) => (
            <HomeMetricCard key={metric.id} label={metric.label} value={metric.value} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recordatorios</Text>
        </View>
        <Card>
          {summary.reminders.map((reminder) => (
            <HomeReminderItem key={reminder.id} reminder={reminder} />
          ))}
        </Card>
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
    gap: 6,
    paddingTop: 8
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16
  },
  routineCard: {
    gap: 12
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  routineTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%'
  },
  routineButton: {
    alignSelf: 'flex-start',
    marginTop: 4
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12
  },
  sectionHeader: {
    marginTop: 4
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  }
});
