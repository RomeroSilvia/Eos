import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellButton } from '@/components/BellButton';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HomeMetricCard } from '@/components/HomeMetricCard';

import { RemindersSection } from '@/components/RemindersSection';
import { colors } from '@/constants/colors';
import { useHome } from '@/hooks/useHome';
import { getMySpecialist, type MySpecialist, type SpecialistSpecialty } from '@/services/specialist';
import { formatStepCount } from '@/utils/format';

export default function HomeScreen() {
  const { summary, refreshSummary } = useHome();
  const [mySpecialist, setMySpecialist] = useState<MySpecialist | null>(null);
  const [isLoadingSpecialist, setIsLoadingSpecialist] = useState(true);
  const [specialistError, setSpecialistError] = useState(false);

  const loadMySpecialist = useCallback(async () => {
    setIsLoadingSpecialist(true);
    setSpecialistError(false);

    try {
      setMySpecialist(await getMySpecialist());
    } catch {
      setMySpecialist(null);
      setSpecialistError(true);
    } finally {
      setIsLoadingSpecialist(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSummary(true);
      void loadMySpecialist();
    }, [loadMySpecialist, refreshSummary])
  );

  if (!summary) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <View style={styles.emptyState}>
          <Ionicons color={colors.primary} name="hourglass-outline" size={34} />
          <Text style={styles.emptyTitle}>Cargando tu información</Text>
          <Text style={styles.emptyText}>En breve estarás actualizado</Text>
        </View>
      </SafeAreaView>
    );
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BellButton style={styles.bell} />
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
        <Card style={styles.specialistCard}>
          <View style={styles.specialistTopRow}>
            <View style={styles.specialistIconCircle}>
              <Ionicons color={colors.primaryDark} name="medkit-outline" size={24} />
            </View>

            <View style={styles.specialistCopy}>
              <Text style={styles.specialistEyebrow}>
                {mySpecialist ? 'Mi especialista' : 'Especialista asignado'}
              </Text>

              {isLoadingSpecialist ? (
                <View style={styles.specialistLoadingRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.specialistDescription}>Buscando tu especialista...</Text>
                </View>
              ) : specialistError ? (
                <>
                  <Text style={styles.specialistTitle}>No pudimos cargar tu especialista</Text>
                  <Text style={styles.specialistDescription}>Intentá nuevamente en unos minutos.</Text>
                </>
              ) : mySpecialist ? (
                <>
                  <Text style={styles.specialistTitle}>{mySpecialist.fullName}</Text>
                  <Text style={styles.specialistDescription}>{getSpecialtyLabel(mySpecialist.specialty)}</Text>
                  <Text style={styles.specialistCenter}>{getCenterLabel(mySpecialist.center)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.specialistTitle}>Todavía no tenés especialista asignado</Text>
                  <Text style={styles.specialistDescription}>
                    Buscá un especialista para recibir seguimiento personalizado.
                  </Text>
                </>
              )}
            </View>
          </View>

          {!isLoadingSpecialist && !specialistError && mySpecialist ? (
            <View style={styles.specialistActions}>
              <Button
               onPress={() => router.push('/chat')}
                style={styles.specialistButton}
              >
                Enviar Consulta
              </Button>
             
            </View>
          ) : null}

          {!isLoadingSpecialist && !specialistError && !mySpecialist ? (
            <Button onPress={() => router.push('/specialists')} style={styles.specialistButton} variant="secondary">
              Buscar especialista
            </Button>
          ) : null}
        </Card>
        <RemindersSection />

       

      </ScrollView>
    </SafeAreaView>
  );
}

function getSpecialtyLabel(specialty: SpecialistSpecialty | null): string {
  if (specialty === 'dermatologo') return 'Dermatologo/a';
  if (specialty === 'cosmetologo') return 'Cosmetologo/a';
  return 'Especialidad no informada';
}

function getCenterLabel(center?: { name: string } | null): string {
  return center?.name ? `Centro: ${center.name}` : 'Centro: Sin centro asignado';
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
  bell: {
    alignSelf: 'flex-end'
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
  specialistCard: {
    gap: 14,
    padding: 16
  },
  specialistTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12
  },
  specialistIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  specialistCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  specialistEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  specialistTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23
  },
  specialistDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  specialistCenter: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800'
  },
  specialistLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  specialistActions: {
    gap: 10
  },
  specialistButton: {
    alignSelf: 'stretch',
    minHeight: 48
  },
  sectionHeader: {
    marginTop: 4
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 14
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center'
  }
});
