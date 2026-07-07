import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/progress/stats/StatCard';
import { colors } from '@/constants/colors';
import {
  getAdminReports,
  getSubscriptionsErrorMessage,
  type AdminReportsResponse,
  type CenterReportSummary
} from '@/services/subscriptions';

export default function AdminReportsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 370;

  const [centerId, setCenterId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminReportsResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ from?: string; to?: string }>({});

  const loadReports = useCallback(async () => {
    const nextErrors: { from?: string; to?: string } = {};
    const normalizedFrom = from.trim();
    const normalizedTo = to.trim();

    if (normalizedFrom && Number.isNaN(Date.parse(normalizedFrom))) {
      nextErrors.from = 'La fecha desde debe estar en formato ISO valido.';
    }

    if (normalizedTo && Number.isNaN(Date.parse(normalizedTo))) {
      nextErrors.to = 'La fecha hasta debe estar en formato ISO valido.';
    }

    if (!nextErrors.from && !nextErrors.to && normalizedFrom && normalizedTo) {
      if (Date.parse(normalizedFrom) > Date.parse(normalizedTo)) {
        nextErrors.to = 'La fecha hasta debe ser mayor o igual a desde.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAdminReports({
        centerId: centerId.trim() || undefined,
        from: normalizedFrom || undefined,
        to: normalizedTo || undefined
      });

      setData(response);
    } catch (loadError) {
      setError(getSubscriptionsErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [centerId, from, to]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  function handleResetFilters() {
    setCenterId('');
    setFrom('');
    setTo('');
    setFieldErrors({});
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}
        data={data?.byCenter ?? []}
        keyExtractor={(item) => item.centerId}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Reportes por centro</Text>
            <Text style={styles.subtitle}>Indicadores globales de clientes, especialistas, consultas y cumplimiento.</Text>

            <Card style={styles.filtersCard}>
              <Text style={styles.filterTitle}>Filtros</Text>
              <Text style={styles.filterHint}>Filtra por centro o por rango de fechas (ISO).</Text>
              <View style={styles.filterFieldBlock}>
                <Text style={styles.filterFieldLabel}>Centro</Text>
                <TextInput
                  accessibilityLabel="Filtrar por ID de centro"
                  onChangeText={setCenterId}
                  placeholder="Ej: 9c04c...8a0c"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={centerId}
                />
              </View>

              <View style={[styles.dateRangeRow, isCompact && styles.dateRangeRowCompact]}>
                <View style={styles.filterFieldBlockGrow}>
                  <Text style={styles.filterFieldLabel}>Desde</Text>
                  <TextInput
                    accessibilityLabel="Fecha desde"
                    onChangeText={(value) => {
                      setFrom(value);
                      if (fieldErrors.from) {
                        setFieldErrors((prev) => ({ ...prev, from: undefined }));
                      }
                    }}
                    placeholder="2026-07-01T00:00:00Z"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, fieldErrors.from && styles.inputError]}
                    value={from}
                  />
                  {fieldErrors.from ? <Text style={styles.fieldErrorText}>{fieldErrors.from}</Text> : null}
                </View>

                <View style={styles.filterFieldBlockGrow}>
                  <Text style={styles.filterFieldLabel}>Hasta</Text>
                  <TextInput
                    accessibilityLabel="Fecha hasta"
                    onChangeText={(value) => {
                      setTo(value);
                      if (fieldErrors.to) {
                        setFieldErrors((prev) => ({ ...prev, to: undefined }));
                      }
                    }}
                    placeholder="2026-07-31T23:59:59Z"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, fieldErrors.to && styles.inputError]}
                    value={to}
                  />
                  {fieldErrors.to ? <Text style={styles.fieldErrorText}>{fieldErrors.to}</Text> : null}
                </View>
              </View>

              <View style={styles.filterActionsRow}>
                <Pressable accessibilityLabel="Limpiar filtros" onPress={handleResetFilters} style={styles.secondaryButtonInline}>
                  <Text style={styles.secondaryButtonText}>Limpiar</Text>
                </Pressable>
                <Pressable accessibilityLabel="Aplicar filtros" onPress={loadReports} style={[styles.button, styles.buttonGrow]}>
                  <Text style={styles.buttonText}>Actualizar reporte</Text>
                </Pressable>
              </View>
            </Card>

            {isLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Cargando reportes...</Text>
              </View>
            ) : null}

            {!isLoading && error ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={loadReports} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}

            {!isLoading && !error && data ? (
              <>
                {data.scopeWarning ? (
                  <Card style={styles.warningCard}>
                    <Text style={styles.warningText}>{data.scopeWarning}</Text>
                  </Card>
                ) : null}

                <View style={styles.statsGrid}>
                  <StatCard
                    detail="usuarios"
                    label="Clientes"
                    style={styles.summaryStatCard}
                    value={String(data.summary.clients)}
                  />
                  <StatCard
                    detail="verificados"
                    label="Especialistas"
                    style={styles.summaryStatCard}
                    value={String(data.summary.activeSpecialists)}
                  />
                  <StatCard
                    detail="mensajes"
                    label="Consultas"
                    style={styles.summaryStatCard}
                    value={String(data.summary.consultations)}
                  />
                  <StatCard
                    detail="asignadas"
                    label="Rutinas"
                    style={styles.summaryStatCard}
                    value={String(data.summary.assignedRoutines)}
                  />
                </View>

                <Card style={styles.complianceCard}>
                  <Text style={styles.complianceLabel}>Cumplimiento promedio</Text>
                  <Text style={styles.complianceValue}>{data.summary.averageCompliance.toFixed(2)}%</Text>
                  <Text style={styles.complianceDetail}>
                    Valor calculado sobre logs de rutina en el rango filtrado.
                  </Text>
                </Card>

                <Text style={styles.sectionTitle}>Desglose por centro</Text>
              </>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No hay centros para mostrar con los filtros actuales.</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.centerCardSeparator} />}
        renderItem={({ item }) => <CenterBreakdownCard item={item} />}
      />
    </SafeAreaView>
  );
}

function CenterBreakdownCard({ item }: { item: CenterReportSummary }) {
  const compliance = item.averageCompliance;
  const complianceFill = `${Math.max(0, Math.min(compliance, 100))}%`;
  const complianceTone = getComplianceTone(compliance);

  return (
    <Card style={styles.centerCard}>
      <View style={styles.centerHeaderRow}>
        <View style={styles.centerHeaderMain}>
          <Text style={styles.centerName}>{item.centerName}</Text>
          <Text style={styles.centerId}>Centro {shortCenterId(item.centerId)}</Text>
        </View>
        <View style={[styles.centerComplianceBadge, getComplianceBadgeStyle(compliance)]}>
          <Text style={[styles.centerComplianceBadgeText, { color: complianceTone }]}>{compliance.toFixed(1)}%</Text>
        </View>
      </View>

      <View style={styles.centerMetricsGrid}>
        <CenterMetricPill label="Clientes" value={item.clients} />
        <CenterMetricPill label="Especialistas" value={item.specialists} />
        <CenterMetricPill label="Consultas" value={item.consultations} />
        <CenterMetricPill label="Rutinas" value={item.assignedRoutines} />
      </View>

      <Text style={styles.centerComplianceLabel}>Cumplimiento promedio</Text>
      <View style={styles.centerComplianceTrack}>
        <View style={[styles.centerComplianceFill, getComplianceFillStyle(compliance), { width: complianceFill }]} />
      </View>
    </Card>
  );
}

function CenterMetricPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.centerMetricPill}>
      <Text style={styles.centerMetricLabel}>{label}</Text>
      <Text style={styles.centerMetricValue}>{value}</Text>
    </View>
  );
}

function shortCenterId(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getComplianceBadgeStyle(compliance: number): { backgroundColor: string } {
  if (compliance >= 75) {
    return { backgroundColor: '#E8F4EA' };
  }

  if (compliance >= 50) {
    return { backgroundColor: '#FFF5E6' };
  }

  return { backgroundColor: '#FDECEC' };
}

function getComplianceFillStyle(compliance: number): { backgroundColor: string } {
  if (compliance >= 75) {
    return { backgroundColor: '#2E6B3E' };
  }

  if (compliance >= 50) {
    return { backgroundColor: '#C27B00' };
  }

  return { backgroundColor: colors.error };
}

function getComplianceTone(compliance: number): string {
  if (compliance >= 75) {
    return '#1F5C30';
  }

  if (compliance >= 50) {
    return '#9B6200';
  }

  return '#B42318';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 14
  },
  contentCompact: {
    paddingHorizontal: 14
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8
  },
  filtersCard: {
    gap: 12,
    marginTop: 4
  },
  filterTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  filterHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: -2
  },
  filterFieldBlock: {
    gap: 6
  },
  filterFieldBlockGrow: {
    flex: 1,
    gap: 6
  },
  filterFieldLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 10
  },
  dateRangeRowCompact: {
    flexDirection: 'column',
    gap: 8
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2
  },
  secondaryButtonInline: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14
  },
  buttonGrow: {
    flex: 1
  },
  input: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inputError: {
    borderColor: colors.error
  },
  fieldErrorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -4
  },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700'
  },
  stateBox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  stateText: {
    color: colors.textSecondary,
    textAlign: 'center'
  },
  errorText: {
    color: colors.error,
    textAlign: 'center'
  },
  secondaryButton: {
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontWeight: '600'
  },
  warningCard: {
    backgroundColor: colors.secondarySoft,
    borderColor: colors.secondaryLight
  },
  warningText: {
    color: colors.secondaryDark,
    fontSize: 13,
    fontWeight: '600'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6
  },
  summaryStatCard: {
    marginBottom: 16,
    width: '48.5%'
  },
  complianceCard: {
    gap: 4
  },
  complianceLabel: {
    color: colors.textSecondary,
    fontSize: 13
  },
  complianceValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700'
  },
  complianceDetail: {
    color: colors.textSecondary,
    fontSize: 12
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8
  },
  centerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  centerCardSeparator: {
    height: 18
  },
  centerHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  centerHeaderMain: {
    flex: 1,
    gap: 4,
    paddingRight: 8
  },
  centerName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  centerId: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  centerComplianceBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  centerComplianceBadgeText: {
    fontSize: 12,
    fontWeight: '800'
  },
  centerMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10
  },
  centerMetricPill: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48.5%'
  },
  centerMetricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  centerMetricValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4
  },
  centerComplianceLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  centerComplianceTrack: {
    backgroundColor: '#E4E9E5',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  centerComplianceFill: {
    borderRadius: 999,
    height: '100%'
  },
  centerDetail: {
    color: colors.textSecondary,
    fontSize: 13
  }
});
