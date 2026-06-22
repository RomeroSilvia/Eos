import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellButton } from '@/components/BellButton';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { logout } from '@/services/auth';
import { getFriendlyErrorMessage } from '@/services/api/client';
import { getSpecialistStatus, type SpecialistStatus } from '@/services/specialist';

export default function SpecialistProfileScreen() {
  const router = useRouter();
  const { isLoading: isProfileLoading, profile } = useProfile();
  const [status, setStatus] = useState<SpecialistStatus>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadSpecialistProfile = useCallback(async () => {
    setIsLoadingStatus(true);
    setHasError(false);

    try {
      setStatus(await getSpecialistStatus());
    } catch (error) {
      setStatus(null);
      setHasError(true);

      if (process.env.NODE_ENV !== 'production') {
        console.warn('[specialist/profile]', getFriendlyErrorMessage(error));
      }
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSpecialistProfile();
    }, [loadSpecialistProfile])
  );

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace('/landing');
    } catch {
      Alert.alert('Perfil', 'No pudimos cerrar sesion. Intenta nuevamente.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleRetryApplication() {
    router.push('/register?mode=specialist&requestOnly=1' as Href);
  }

  const isLoading = isProfileLoading || isLoadingStatus;
  const displayName = profile?.name ?? status?.full_name ?? 'Especialista';
  const email = profile?.email ?? 'Email no disponible';
  const statusContent = getStatusContent(status);
  const hasProfessionalProfile = Boolean(status && status.license_status !== 'not_submitted');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Perfil</Text>
            <Text style={styles.subtitle}>Tu información profesional en EOS.</Text>
          </View>
          <BellButton />
        </View>

        {isLoading ? (
          <StateCard icon="hourglass-outline" message="Cargando perfil profesional..." showSpinner />
        ) : hasError ? (
          <StateCard icon="alert-circle-outline" message="No pudimos cargar tu perfil profesional. Intentá nuevamente.">
            <Button onPress={loadSpecialistProfile} style={styles.fullButton} variant="ghost">
              Reintentar
            </Button>
          </StateCard>
        ) : !hasProfessionalProfile ? (
          <StateCard icon="document-text-outline" message="Todavía no completaste tu perfil profesional.">
            <Button onPress={handleRetryApplication} style={styles.fullButton}>
              Completar solicitud
            </Button>
          </StateCard>
        ) : (
          <>
            <Card style={styles.profileCard}>
              <View style={styles.avatar}>
                <Ionicons color={colors.primaryDark} name="medkit-outline" size={30} />
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.meta}>{email}</Text>
                <View style={styles.rolePill}>
                  <Ionicons color={colors.primaryDark} name="shield-checkmark-outline" size={14} />
                  <Text style={styles.rolePillText}>Especialista</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: statusContent.background }]}>
                <Ionicons color={statusContent.color} name={statusContent.icon} size={24} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.sectionTitle}>{statusContent.title}</Text>
                <Text style={styles.description}>{statusContent.description}</Text>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Datos profesionales</Text>
              <InfoRow label="Especialidad" value={getSpecialtyLabel(status?.specialty)} />
              <InfoRow label="Matrícula" value={status?.license_number ?? 'No registrada'} />
              <InfoRow label="Estado" value={getLicenseStatusLabel(status?.license_status)} />
              {status?.license_status === 'rejected' && status.rejection_reason ? (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionLabel}>Motivo de rechazo</Text>
                  <Text style={styles.rejectionText}>{status.rejection_reason}</Text>
                </View>
              ) : null}
              {status?.license_status === 'rejected' ? (
                <Button onPress={handleRetryApplication} style={styles.fullButton}>
                  Reenviar solicitud
                </Button>
              ) : null}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Accesos rápidos</Text>
              <View style={styles.actionsGrid}>
                <ActionTile
                  icon="people-outline"
                  label="Mis clientes"
                  onPress={() => router.push('/(tabs-specialist)/pacientes' as Href)}
                />
                <ActionTile
                  icon="chatbubbles-outline"
                  label="Consultas"
                  onPress={() => router.push('/(tabs-specialist)/consultas' as Href)}
                />
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Configuración</Text>
              <Text style={styles.description}>
                Podés gestionar contraseña y notificaciones. Los datos profesionales se administran desde tu solicitud.
              </Text>
              <Button onPress={() => router.push('/settings' as Href)} style={styles.fullButton} variant="ghost">
                Abrir configuración
              </Button>
            </Card>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={isLoggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, isLoggingOut && styles.disabled]}
        >
          <Text style={styles.logoutText}>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StateCard({
  children,
  icon,
  message,
  showSpinner = false
}: {
  children?: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  showSpinner?: boolean;
}) {
  return (
    <Card style={styles.stateCard}>
      {showSpinner ? <ActivityIndicator color={colors.primary} /> : <Ionicons color={colors.primaryDark} name={icon} size={30} />}
      <Text style={styles.stateText}>{message}</Text>
      {children}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ActionTile({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}>
      <Ionicons color={colors.primaryDark} name={icon} size={24} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function getSpecialtyLabel(specialty?: string | null): string {
  if (specialty === 'dermatologo') return 'Dermatólogo/a';
  if (specialty === 'cosmetologo') return 'Cosmetólogo/a';
  return 'No registrada';
}

function getLicenseStatusLabel(status?: string | null): string {
  if (status === 'verified') return 'Verificado';
  if (status === 'pending') return 'Pendiente';
  if (status === 'rejected') return 'Rechazado';
  return 'No enviado';
}

function getStatusContent(status: SpecialistStatus): {
  background: string;
  color: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
} {
  if (status?.license_status === 'verified') {
    return {
      background: colors.primaryLight,
      color: colors.primaryDark,
      description: 'Tu perfil está verificado y podés atender consultas de tus pacientes.',
      icon: 'checkmark-circle-outline',
      title: 'Especialista verificado'
    };
  }

  if (status?.license_status === 'pending') {
    return {
      background: '#FFF7E6',
      color: '#B7791F',
      description: 'Tu matrícula está en revisión. Te avisaremos cuando sea aprobada.',
      icon: 'time-outline',
      title: 'Solicitud pendiente'
    };
  }

  if (status?.license_status === 'rejected') {
    return {
      background: '#FDECEC',
      color: colors.error,
      description: 'Tu solicitud fue rechazada.',
      icon: 'alert-circle-outline',
      title: 'Solicitud rechazada'
    };
  }

  return {
    background: colors.surfaceSoft,
    color: colors.textSecondary,
    description: 'Todavía no completaste tu perfil profesional.',
    icon: 'document-text-outline',
    title: 'Perfil profesional pendiente'
  };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 116
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  profileCopy: {
    flex: 1,
    gap: 4
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14
  },
  rolePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  rolePillText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800'
  },
  card: {
    gap: 12
  },
  statusCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  statusIcon: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  cardCopy: {
    flex: 1,
    gap: 4
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  infoRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 10
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800'
  },
  rejectionBox: {
    backgroundColor: '#FDECEC',
    borderRadius: 14,
    gap: 4,
    padding: 12
  },
  rejectionLabel: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '900'
  },
  rejectionText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10
  },
  actionTile: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 82,
    justifyContent: 'center'
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },
  stateCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 26
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center'
  },
  fullButton: {
    width: '100%'
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.secondarySoft,
    borderColor: colors.secondaryLight,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46
  },
  logoutText: {
    color: colors.secondaryDark,
    fontSize: 15,
    fontWeight: '900'
  },
  pressed: {
    opacity: 0.78
  },
  disabled: {
    opacity: 0.5
  }
});
