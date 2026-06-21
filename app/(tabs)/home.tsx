import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HomeMetricCard } from '@/components/HomeMetricCard';
import { HomeReminderItem } from '@/components/HomeReminderItem';
import { colors } from '@/constants/colors';
import { useHome } from '@/hooks/useHome';
import { formatStepCount } from '@/utils/format';

export default function HomeScreen() {
  const { summary, refreshSummary, toggleReminder } = useHome();

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
  const hasActiveRoutine = Boolean(summary.activeRoutine);
  const routineTimeOfDay = summary.activeRoutine?.time_of_day;
  const isNightRoutine = routineTimeOfDay === 'night';
  const isCustomRoutine = routineTimeOfDay === 'custom';

  const routineMomentLabel = hasActiveRoutine
    ? isNightRoutine
      ? 'Noche'
      : isCustomRoutine
        ? 'Personalizada'
        : 'Mañana'
    : 'Sin rutina';
  const routineMomentEmoji = hasActiveRoutine
    ? isNightRoutine
      ? '🌑'
      : isCustomRoutine
        ? '✨'
        : '☀️'
    : '🧴';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/notifications')} style={styles.bellButton}>
            <Ionicons color={colors.textPrimary} name="notifications-outline" size={26} />
            <View style={styles.bellDot} />
          </Pressable>
          <Text style={styles.greeting}>¡Hola, {summary.user.name}! 🌱</Text>
          <Text style={styles.subtitle}>Sentite bien con tu propia piel</Text>
        </View>

        <Card
          variant="soft"
          style={{
            ...styles.routineCard,
            backgroundColor: colors.surfaceSoft
          }}
        >
          <View style={styles.routineTopRow}>
            <View style={styles.routineTopTextBlock}>
              <Text style={styles.sectionLabel}>Tu rutina hoy</Text>
              <Text style={styles.routineTitle}>
                {routineMomentLabel} {routineMomentEmoji}
              </Text>
            </View>

            <View style={[styles.routineEmojiCircle, { backgroundColor: colors.routineCircleSoft }]}>
              <Image
                source={require('../../assets/images/home-image.png')}
                style={styles.routineCircleImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.description}>
            {hasActiveRoutine
              ? formatStepCount(summary.completedSteps, summary.totalSteps)
              : 'Crea tu rutina para empezar tu seguimiento diario.'}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          <Button variant="secondary" onPress={() => router.push('/routine')} style={styles.routineButton}>
            {hasActiveRoutine ? 'Ver rutina' : 'Crear rutina'}
          </Button>
        </Card>

        <View style={styles.metricsRow}>
          {summary.metrics.map((metric) => (
            <HomeMetricCard metricId={metric.id} key={metric.id} label={metric.label} value={metric.value} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recordatorios</Text>
        </View>
        <Card>
          {summary.reminders.map((reminder) => (
            <HomeReminderItem key={reminder.id} reminder={reminder} onToggle={toggleReminder} />
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
  bellButton: {
    alignSelf: 'flex-end',
    padding: 4,
    position: 'relative'
  },
  bellDot: {
    backgroundColor: colors.secondaryDark,
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 2,
    top: 2,
    width: 10
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
