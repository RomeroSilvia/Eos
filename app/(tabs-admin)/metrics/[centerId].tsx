import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import {
  getCenterDashboard,
  getCenters,
  getCentersErrorMessage,
  type Center,
  type CenterDashboard
} from '@/services/centers';

export default function CenterMetricsDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ centerId?: string | string[] }>();
  const centerId = useMemo(() => {
    const value = params.centerId;
    return Array.isArray(value) ? value[0] : value;
  }, [params.centerId]);
  const [center, setCenter] = useState<Center | null>(null);
  const [dashboard, setDashboard] = useState<CenterDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    if (!centerId) {
      setError('No encontramos el centro solicitado.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [centers, nextDashboard] = await Promise.all([
        getCenters(),
        getCenterDashboard(centerId)
      ]);
      setCenter(centers.find((item) => item.id === centerId) ?? null);
      setDashboard(nextDashboard);
    } catch (loadError) {
      setCenter(null);
      setDashboard(null);
      setError(getCentersErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  function goToMetricsList() {
    router.replace('/(tabs-admin)/metrics' as never);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver a métricas"
            accessibilityRole="button"
            onPress={goToMetricsList}
            style={styles.backButton}
          >
            <Ionicons color={colors.primaryDark} name="chevron-back" size={22} />
          </Pressable>
          <View style={styles.headerIcon}>
            <Ionicons color={colors.primaryDark} name="stats-chart-outline" size={24} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{center?.name ?? 'Métricas del centro'}</Text>
            <Text style={styles.subtitle}>Resumen operativo básico</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Cargando métricas...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.stateBox}>
            <Ionicons color={colors.error} name="alert-circle-outline" size={28} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadMetrics}>
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && dashboard ? (
          <>
            <CenterHeaderCard center={center} />
            <View style={styles.metricsGrid}>
              <MetricCard icon="people-outline" label="Especialistas totales" value={dashboard.specialistsTotal} />
              <MetricCard icon="checkmark-circle-outline" label="Verificados" value={dashboard.specialistsVerified} />
              <MetricCard icon="time-outline" label="Pendientes" value={dashboard.specialistsPending} />
              <MetricCard icon="person-add-outline" label="Clientes vinculados" value={dashboard.clientsTotal} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CenterHeaderCard({ center }: { center: Center | null }) {
  const location = [center?.city, center?.province].filter(Boolean).join(', ');

  return (
    <Card style={styles.centerHeroCard}>
      {center?.imageUrl ? (
        <Image resizeMode="cover" source={{ uri: center.imageUrl }} style={styles.centerImage} />
      ) : (
        <View style={styles.centerImagePlaceholder}>
          <View style={styles.centerImagePlaceholderIcon}>
            <Ionicons color={colors.primaryDark} name="sparkles-outline" size={24} />
          </View>
          <Text style={styles.centerImagePlaceholderText}>EOS</Text>
        </View>
      )}

      <View style={styles.centerInfoRow}>
        <View style={styles.centerIcon}>
          <Ionicons color={colors.primaryDark} name="business-outline" size={22} />
        </View>
        <View style={styles.centerCopy}>
          <Text style={styles.centerName}>{center?.name ?? 'Centro seleccionado'}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Activo</Text>
          </View>
        </View>
      </View>

      <View style={styles.centerMetaRow}>
        <Ionicons color={colors.textSecondary} name="location-outline" size={17} />
        <Text style={styles.centerMetaText}>{location || 'Ubicación no cargada'}</Text>
      </View>
      <Text style={styles.centerSubtitle}>Resumen operativo básico</Text>
    </Card>
  );
}

function MetricCard({
  icon,
  label,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={styles.metricIcon}>
          <Ionicons color={colors.primaryDark} name={icon} size={22} />
        </View>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
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
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 22
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  },
  centerHeroCard: {
    borderRadius: 14,
    gap: 12
  },
  centerImage: {
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 104,
    width: '100%'
  },
  centerImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    height: 104,
    justifyContent: 'center',
    width: '100%'
  },
  centerImagePlaceholderIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  centerImagePlaceholderText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  centerInfoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  centerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  centerCopy: {
    flex: 1,
    minWidth: 0
  },
  centerName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  centerMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  centerMetaText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    fontWeight: '700'
  },
  centerSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800'
  },
  metricsGrid: {
    gap: 12
  },
  metricCard: {
    borderRadius: 14,
    gap: 12
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '900'
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800'
  }
});
