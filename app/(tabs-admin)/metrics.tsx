import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

export default function AdminMetricsScreen() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<CenterDashboard | null>(null);
  const [isLoadingCenters, setIsLoadingCenters] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCenter = useMemo(
    () => centers.find((center) => center.id === selectedCenterId) ?? null,
    [centers, selectedCenterId]
  );

  const loadCenters = useCallback(async () => {
    setIsLoadingCenters(true);
    setError(null);

    try {
      const nextCenters = await getCenters();
      setCenters(nextCenters);
      setSelectedCenterId((current) => current ?? nextCenters[0]?.id ?? null);
    } catch (loadError) {
      setError(getCentersErrorMessage(loadError));
    } finally {
      setIsLoadingCenters(false);
    }
  }, []);

  const loadDashboard = useCallback(async (centerId: string) => {
    setIsLoadingDashboard(true);
    setError(null);

    try {
      setDashboard(await getCenterDashboard(centerId));
    } catch (loadError) {
      setDashboard(null);
      setError(getCentersErrorMessage(loadError));
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  useEffect(() => {
    if (!selectedCenterId) {
      setDashboard(null);
      return;
    }

    void loadDashboard(selectedCenterId);
  }, [loadDashboard, selectedCenterId]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons color={colors.primaryDark} name="stats-chart-outline" size={26} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Metricas por centro</Text>
            <Text style={styles.subtitle}>Resumen operativo basico</Text>
          </View>
        </View>

        {isLoadingCenters ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Cargando centros...</Text>
          </View>
        ) : null}

        {!isLoadingCenters && error ? (
          <View style={styles.stateBox}>
            <Ionicons color={colors.error} name="alert-circle-outline" size={28} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadCenters}>
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoadingCenters && !error && centers.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons color={colors.primaryDark} name="business-outline" size={30} />
            <Text style={styles.stateText}>Todavia no hay centros activos para medir</Text>
          </View>
        ) : null}

        {!isLoadingCenters && centers.length > 0 ? (
          <>
            <Card variant="soft" style={styles.selectorCard}>
              <Text style={styles.summaryLabel}>Centro seleccionado</Text>
              <Text style={styles.selectedCenterName}>{selectedCenter?.name ?? 'Sin centro'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.centerOptions}>
                {centers.map((center) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedCenterId === center.id }}
                    key={center.id}
                    onPress={() => setSelectedCenterId(center.id)}
                    style={[
                      styles.centerOption,
                      selectedCenterId === center.id && styles.centerOptionActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.centerOptionText,
                        selectedCenterId === center.id && styles.centerOptionTextActive
                      ]}
                    >
                      {center.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Card>

            {isLoadingDashboard ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Cargando metricas...</Text>
              </View>
            ) : null}

            {!isLoadingDashboard && dashboard ? (
              <View style={styles.metricsGrid}>
                <MetricCard icon="people-outline" label="Especialistas totales" value={dashboard.specialistsTotal} />
                <MetricCard icon="checkmark-circle-outline" label="Verificados" value={dashboard.specialistsVerified} />
                <MetricCard icon="time-outline" label="Pendientes" value={dashboard.specialistsPending} />
                <MetricCard icon="person-add-outline" label="Clientes vinculados" value={dashboard.clientsTotal} />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
    gap: 18,
    padding: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  headerCopy: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3
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
  selectorCard: {
    borderRadius: 14,
    gap: 12
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800'
  },
  selectedCenterName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  centerOptions: {
    gap: 10,
    paddingRight: 4
  },
  centerOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14
  },
  centerOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  centerOptionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  centerOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: '900'
  },
  metricsGrid: {
    gap: 14
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
    fontSize: 36,
    fontWeight: '900'
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800'
  }
});
