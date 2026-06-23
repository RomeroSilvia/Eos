import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { formatSkinType } from '@/utils/skinType';
import {
  getMyPatients,
  getSpecialistStatus,
  type SpecialistPatient,
  type SpecialistStatus
} from '@/services/specialist';

const quickActions = [
  { icon: 'sparkles' as const, label: 'Consultas', route: '/(tabs-specialist)/consultas' as Href },
  { icon: 'people' as const, label: 'Pacientes', route: '/(tabs-specialist)/pacientes' as Href },
  { icon: 'list' as const, label: 'Rutinas', route: '/(tabs-specialist)/rutinas' as Href }
];

type HomeState = {
  patients: SpecialistPatient[];
  status: SpecialistStatus;
};

export default function SpecialistHomeScreen() {
  const router = useRouter();
  const [homeState, setHomeState] = useState<HomeState>({ patients: [], status: null });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadHome = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const [status, patients] = await Promise.all([
        getSpecialistStatus(),
        getMyPatients()
      ]);

      setHomeState({
        status,
        patients: patients.filter((patient) => patient.status === 'active')
      });
    } catch {
      setHomeState({ patients: [], status: null });
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome])
  );

  const activePatients = homeState.patients;
  const recentConsultations = useMemo(() => {
    return [...activePatients]
      .sort((a, b) => getDateTime(b.lastActivityAt) - getDateTime(a.lastActivityAt))
      .slice(0, 3);
  }, [activePatients]);
  const unreadConsultationsCount = useMemo(
    () => activePatients.reduce((total, patient) => total + (patient.unreadCount ?? 0), 0),
    [activePatients]
  );
  const specialistName = getDisplayName(homeState.status?.full_name);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola{specialistName ? `, ${specialistName}` : ''}</Text>
            <Text style={styles.subtitle}>Lista para cuidar la piel de tus pacientes</Text>
          </View>
        </View>

        {isLoading ? (
          <StateCard icon="hourglass-outline" message="Cargando tu información..." showSpinner />
        ) : hasError ? (
          <StateCard icon="alert-circle-outline" message="No pudimos cargar tu información. Intentá nuevamente." />
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Panel de especialista</Text>
                <Text style={styles.heroTitle}>Consultas</Text>
                <Text style={styles.heroDescription}>
                  {activePatients.length === 0
                    ? 'Todavía no tenés consultas activas.'
                    : 'Accedé a tus consultas activas con pacientes vinculados.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/(tabs-specialist)/consultas')}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Ver consultas</Text>
                </Pressable>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons color={colors.primaryDark} name="medkit-outline" size={58} />
              </View>
            </View>

            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <Pressable key={action.label} onPress={() => router.push(action.route)} style={styles.quickAction}>
                  <Ionicons color={colors.primaryDark} name={action.icon} size={28} />
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label="Pacientes activos" value={String(activePatients.length)} />
              <MetricCard label="Consultas activas" value={String(activePatients.length)} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consultas activas</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs-specialist)/consultas')}>
                <Text style={styles.viewAll}>Ver todas</Text>
              </Pressable>
            </View>

            {recentConsultations.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons color={colors.textMuted} name="chatbubbles-outline" size={26} />
                <Text style={styles.emptyText}>Todavía no tenés consultas activas.</Text>
              </View>
            ) : (
              <View style={styles.consultationList}>
                {recentConsultations.map((consultation, index) => (
                  <Pressable
                    key={consultation.relationId}
                    onPress={() =>
                      router.push({
                        pathname: '/chat',
                        params: { relationId: consultation.relationId }
                      })
                    }
                    style={[styles.consultationItem, index === recentConsultations.length - 1 && styles.lastItem]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(consultation.fullName)}</Text>
                    </View>
                    <View style={styles.consultationCopy}>
                      <Text style={styles.consultationName}>{consultation.fullName}</Text>
                      <Text style={styles.consultationReason}>{formatSkinType(consultation.skinType)}</Text>
                    </View>
                    <UnreadBadge count={consultation.unreadCount ?? 0} />
                    <View style={styles.timePill}>
                      <Text style={styles.timeText}>{formatLastActivity(consultation.lastActivityAt)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StateCard({
  icon,
  message,
  showSpinner = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  showSpinner?: boolean;
}) {
  return (
    <View style={styles.stateCard}>
      {showSpinner ? <ActivityIndicator color={colors.primary} /> : <Ionicons color={colors.primaryDark} name={icon} size={30} />}
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function UnreadBadge({
  count,
  variant = 'inline'
}: {
  count: number;
  variant?: 'inline' | 'corner' | 'floating';
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <View style={[
      styles.unreadBadge,
      variant === 'corner' && styles.unreadBadgeCorner,
      variant === 'floating' && styles.unreadBadgeFloating
    ]}>
      <Text style={styles.unreadBadgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

function getDisplayName(fullName?: string | null): string {
  if (!fullName?.trim()) {
    return '';
  }

  return fullName.trim().split(/\s+/).slice(0, 2).join(' ');
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function formatLastActivity(value: string | null): string {
  if (!value) {
    return 'Sin actividad';
  }

  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin actividad';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

function getDateTime(value: string | null): number {
  if (!value) {
    return 0;
  }

  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function parseDate(value: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnlyMatch) {
    return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
  }

  return new Date(value);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    paddingBottom: 118,
    paddingHorizontal: 14,
    paddingTop: 12
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 14,
    minHeight: 204,
    padding: 10
  },
  heroCopy: {
    flex: 1,
    gap: 7
  },
  heroEyebrow: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700'
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 31,
    fontWeight: '900'
  },
  heroDescription: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 7,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 40,
    position: 'relative',
    width: 147
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800'
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 56,
    height: 108,
    justifyContent: 'center',
    width: 108
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 84,
    position: 'relative'
  },
  quickLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center'
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 14
  },
  metricValue: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: '900'
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  viewAll: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800'
  },
  consultationList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    overflow: 'hidden'
  },
  consultationItem: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  lastItem: {
    borderBottomWidth: 0
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  consultationCopy: {
    flex: 1
  },
  consultationName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  consultationReason: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  },
  timePill: {
    alignItems: 'center',
    backgroundColor: colors.pending,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 13
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 5
  },
  unreadBadgeCorner: {
    position: 'absolute',
    right: 12,
    top: 10
  },
  unreadBadgeFloating: {
    position: 'absolute',
    right: -6,
    top: -6
  },
  unreadBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '900'
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
    padding: 18
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    padding: 24
  }
});
