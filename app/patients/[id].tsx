import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/constants/colors';
import {
  getMyPatientDetail,
  type PatientRoutine,
  type PatientRoutineHistoryItem,
  type SpecialistPatientDetail
} from '@/services/specialist';

export default function PatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [patient, setPatient] = useState<SpecialistPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadPatient = useCallback(async () => {
    if (!id) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);

    try {
      const response = await getMyPatientDetail(id);
      setPatient(response);
    } catch {
      setPatient(null);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Pacientes" fallbackRoute="/(tabs-specialist)" title="Detalle del paciente" />

      {loading ? (
        <StateMessage icon="hourglass-outline" message="Cargando paciente..." showSpinner />
      ) : hasError || !patient ? (
        <StateMessage icon="alert-circle-outline" message="No pudimos cargar este paciente." />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrap}>
                {patient.profileImageUrl ? (
                  <Image source={{ uri: patient.profileImageUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{getInitials(patient.fullName)}</Text>
                )}
              </View>

              <View style={styles.profileCopy}>
                <Text style={styles.patientName}>{patient.fullName}</Text>
                <Text style={styles.patientMeta}>{patient.email ?? 'Sin email registrado'}</Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryItem icon="pulse-outline" label="Estado" value={formatRelationStatus(patient.status)} />
              <SummaryItem icon="water-outline" label="Tipo de piel" value={formatSkinType(patient.skinType)} />
              <SummaryItem icon="calendar-outline" label="Ultima actividad" value={formatDate(patient.lastActivityAt)} />
              <SummaryItem icon="sparkles-outline" label="Objetivo" value={patient.skinProfile?.mainGoal ?? 'No registrado'} />
            </View>
          </Card>

          <Pressable
            accessibilityRole="button"
            style={styles.assignButton}
            onPress={() =>
              router.push({
                pathname: '/routine/Create',
                params: { assignClientId: patient.id }
              })
            }
          >
            <Ionicons color={colors.surface} name="add-circle-outline" size={20} />
            <Text style={styles.assignButtonText}>Asignar rutina</Text>
          </Pressable>

          <SectionTitle title="Perfil de piel" />
          <Card style={styles.compactCard}>
            <InfoLine label="Tipo de piel" value={formatSkinType(patient.skinType)} />
            <InfoLine label="Rango de edad" value={patient.skinProfile?.ageRange ?? 'No registrado'} />
            <InfoLine label="Imperfecciones" value={patient.skinProfile?.imperfections ?? 'No registrado'} />
            <InfoLine label="Rutina sugerida" value={patient.skinProfile?.routineSteps ?? 'No registrada'} />
          </Card>

          <SectionTitle title="Rutinas asociadas" />
          {patient.routines.length === 0 ? (
            <EmptyBlock message="Este paciente no tiene rutinas asociadas." />
          ) : (
            <View style={styles.stack}>
              {patient.routines.map((routine) => (
                <RoutineCard key={routine.id} routine={routine} />
              ))}
            </View>
          )}

          <SectionTitle title="Historial de skincare" />
          {patient.history.length === 0 ? (
            <EmptyBlock message="Todavia no hay registros de rutina." />
          ) : (
            <View style={styles.stack}>
              {patient.history.map((item) => (
                <HistoryCard key={item.id} item={item} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons color={colors.primaryDark} name={icon} size={18} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function RoutineCard({ routine }: { routine: PatientRoutine }) {
  return (
    <Card style={styles.compactCard}>
      <View style={styles.routineHeader}>
        <View style={styles.routineTitleWrap}>
          <Text style={styles.cardTitle}>{routine.name}</Text>
          {routine.description ? <Text style={styles.cardSubtitle}>{routine.description}</Text> : null}
        </View>
        <View style={[styles.smallBadge, routine.isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.smallBadgeText}>{routine.isActive ? 'Activa' : 'Inactiva'}</Text>
        </View>
      </View>

      {routine.steps.length === 0 ? (
        <Text style={styles.mutedText}>Sin pasos registrados.</Text>
      ) : (
        <View style={styles.stepsList}>
          {routine.steps.map((step) => (
            <View key={step.id} style={styles.stepRow}>
              <Ionicons color={colors.primaryDark} name="checkmark-circle-outline" size={18} />
              <View style={styles.stepCopy}>
                <Text style={styles.stepName}>{step.name}</Text>
                <ProductsText products={step.products} />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function HistoryCard({ item }: { item: PatientRoutineHistoryItem }) {
  const completedSteps = item.steps.filter((step) => step.isCompleted);
  const products = uniqueProducts(item.steps.flatMap((step) => step.products));

  return (
    <Card style={styles.compactCard}>
      <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
      <Text style={styles.cardTitle}>Rutina: {item.routine?.name ?? 'Rutina no disponible'}</Text>
      <Text style={styles.cardSubtitle}>{Math.round(item.completionPercentage)}% completado</Text>

      <View style={styles.historyBlock}>
        <Text style={styles.blockLabel}>Pasos realizados</Text>
        {completedSteps.length === 0 ? (
          <Text style={styles.mutedText}>Sin pasos marcados como realizados.</Text>
        ) : (
          completedSteps.map((step) => (
            <Text key={step.id} style={styles.bulletText}>
              - {step.name}
            </Text>
          ))
        )}
      </View>

      <View style={styles.historyBlock}>
        <Text style={styles.blockLabel}>Productos utilizados</Text>
        {products.length === 0 ? (
          <Text style={styles.mutedText}>Sin productos registrados.</Text>
        ) : (
          products.map((product) => (
            <Text key={product.id} style={styles.bulletText}>
              - {product.brand ? `${product.brand} ` : ''}{product.name}
            </Text>
          ))
        )}
      </View>
    </Card>
  );
}

function ProductsText({ products }: { products: PatientRoutine['steps'][number]['products'] }) {
  if (products.length === 0) {
    return <Text style={styles.mutedText}>Sin productos asociados.</Text>;
  }

  return (
    <Text style={styles.mutedText} numberOfLines={2}>
      {products.map((product) => product.brand ? `${product.brand} ${product.name}` : product.name).join(', ')}
    </Text>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <View style={styles.emptyBlock}>
      <Ionicons color={colors.textMuted} name="document-text-outline" size={24} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function StateMessage({
  icon,
  message,
  showSpinner = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  showSpinner?: boolean;
}) {
  return (
    <View style={styles.centeredState}>
      {showSpinner ? <ActivityIndicator color={colors.primary} /> : <Ionicons color={colors.primaryDark} name={icon} size={32} />}
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function uniqueProducts(products: PatientRoutine['steps'][number]['products']) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return [...byId.values()];
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function formatSkinType(skinType: string | null): string {
  if (!skinType || skinType === 'not_defined' || skinType === 'undefined' || skinType === 'unknown') {
    return 'No registrado';
  }

  const labels: Record<string, string> = {
    normal: 'Normal',
    dry: 'Seca',
    oily: 'Grasa',
    mixed: 'Mixta',
    sensitive: 'Sensible'
  };

  return labels[skinType] ?? skinType;
}

function formatRelationStatus(status: string): string {
  if (status === 'active') {
    return 'Activo';
  }

  if (status === 'pending') {
    return 'Pendiente';
  }

  if (status === 'inactive') {
    return 'Inactivo';
  }

  return status;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Sin actividad';
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 12,
    paddingBottom: 28,
    paddingHorizontal: 16
  },
  profileCard: {
    gap: 16
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56
  },
  avatarImage: {
    height: '100%',
    width: '100%'
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900'
  },
  profileCopy: {
    flex: 1,
    gap: 3
  },
  patientName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  patientMeta: {
    color: colors.textSecondary,
    fontSize: 13
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  summaryItem: {
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 4,
    minHeight: 92,
    padding: 10
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8
  },
  compactCard: {
    gap: 10
  },
  infoLine: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 10
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21
  },
  stack: {
    gap: 10
  },
  routineHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  routineTitleWrap: {
    flex: 1,
    gap: 4
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  smallBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  activeBadge: {
    backgroundColor: colors.primaryLight
  },
  inactiveBadge: {
    backgroundColor: colors.pending
  },
  smallBadgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900'
  },
  stepsList: {
    gap: 9
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  stepCopy: {
    flex: 1,
    gap: 2
  },
  stepName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  historyDate: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900'
  },
  historyBlock: {
    gap: 5,
    marginTop: 4
  },
  blockLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900'
  },
  bulletText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  emptyBlock: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 20
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  assignButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 14
  },
  assignButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900'
  }
});
