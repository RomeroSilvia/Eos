import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HomeMetricCard } from '@/components/HomeMetricCard';
import { HomeReminderItem } from '@/components/HomeReminderItem';
import { colors } from '@/constants/colors';
import { useHome } from '@/hooks/useHome';
import { formatStepCount } from '@/utils/format';

export default function HomeScreen() {
  const { summary, refreshSummary } = useHome();

  useFocusEffect(
    useCallback(() => {
      void refreshSummary();
    }, [refreshSummary])
  );

  if (!summary) {
    return <SafeAreaView style={styles.screen} />;
  }

  const progress = summary.totalSteps > 0
    ? Math.max(0, Math.min(1, summary.completedSteps / summary.totalSteps))
    : 0;
  const routineTimeOfDay = summary.activeRoutine?.time_of_day;
  const isMorningRoutine = routineTimeOfDay === 'morning';
  const isNightRoutine = routineTimeOfDay === 'night';

  const routineMomentLabel = isMorningRoutine ? 'Mañana' : isNightRoutine ? 'Noche' : 'Personalizada';
  const routineMomentEmoji = isMorningRoutine ? '☀️' : isNightRoutine ? '🌙' : '✨';
  const routineCardBackground = isMorningRoutine ? colors.surfaceSoft : isNightRoutine ? '#EAF0F6' : '#F3F0EA';
  const routineCircleBackground = isMorningRoutine ? '#DFEADF' : isNightRoutine ? '#D8E3F0' : '#EDE5DA';
  const routineProgressTrack = isMorningRoutine ? colors.border : isNightRoutine ? '#C4D4E7' : '#DCCFBE';
  const routineProgressFill = isMorningRoutine ? colors.primary : isNightRoutine ? '#5B7693' : '#A7865D';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Hola, {summary.user.name}!🌱</Text>
          <Text style={styles.subtitle}>Sentite bien con tu propia piel</Text>
        </View>

        <Card
          variant="soft"
          style={{
            ...styles.routineCard,
            backgroundColor: routineCardBackground
          }}
        >
          <View style={styles.routineTopRow}>
            <View style={styles.routineTopTextBlock}>
              <Text style={styles.sectionLabel}>Tu rutina hoy</Text>
              <Text style={styles.routineTitle}>
                {routineMomentLabel} {routineMomentEmoji}
              </Text>
            </View>

            <View style={[styles.routineEmojiCircle, { backgroundColor: routineCircleBackground }]}>
              <Image
                source={require('../../assets/images/home-image.png')}
                style={styles.routineCircleImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.description}>{formatStepCount(summary.completedSteps, summary.totalSteps)}</Text>
          <View style={[styles.progressTrack, { backgroundColor: routineProgressTrack }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: routineProgressFill }]} />
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
    gap: 12,
    padding: 14
  },
  routineTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  routineTopTextBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700'
  },
  routineTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900'
  },
  routineEmojiCircle: {
    alignItems: 'center',
    borderRadius: 54,
    height: 108,
    justifyContent: 'center',
    width: 108
  },
  routineCircleImage: {
    height: 90,
    width: 90
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
    borderRadius: 999,
    height: '100%'
  },
  routineButton: {
    alignSelf: 'stretch',
    marginTop: 4,
    minHeight: 52
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
