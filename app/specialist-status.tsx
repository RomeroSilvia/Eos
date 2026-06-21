import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/constants/colors';
import { getSpecialistStatus, type SpecialistStatus } from '@/services/specialist';
import { logout } from '@/services/auth';
import { useFocusEffect, useRouter } from 'expo-router';

export default function SpecialistStatusScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<SpecialistStatus>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextStatus = await getSpecialistStatus();

      if (nextStatus?.license_status === 'verified') {
        router.replace('/(tabs-specialist)' as never);
        return;
      }

      setStatus(nextStatus);
    } catch {
      setError('No pudimos cargar el estado de tu matricula.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void (async () => {
        if (isActive) {
          await loadStatus();
        }
      })();

      return () => {
        isActive = false;
      };
    }, [loadStatus])
  );

  const refreshStatus = useCallback(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleLogout() {
    await logout();
    router.replace('/landing');
  }

  function handleSendApplication() {
    router.push('/register?mode=specialist&requestOnly=1' as never);
  }

  const content = getStatusContent(status);
  const isUnknownStatus = !error && (status === null || !isKnownStatus(status.license_status));
  const canSendApplication = !error && status?.license_status === 'not_submitted';
  const canRetryApplication = !error && status?.license_status === 'rejected';
  const shouldShowMeta = status !== null && status.license_status !== 'not_submitted';

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader fallbackRoute="/(tabs)/home" title="Estado de especialista" />
      <View style={styles.content}>
        <Card style={styles.statusCard}>
          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.description}>Consultando solicitud...</Text>
            </View>
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: content.background }]}>
                <Ionicons color={content.color} name={content.icon} size={28} />
              </View>
              <Text style={styles.statusTitle}>{content.title}</Text>
              <Text style={styles.description}>{error ?? content.description}</Text>

              {status && shouldShowMeta ? (
                <View style={styles.meta}>
                  {status.full_name ? <Text style={styles.metaText}>Nombre: {status.full_name}</Text> : null}
                  <Text style={styles.metaText}>Especialidad: {getSpecialtyLabel(status.specialty)}</Text>
                  {status.license_number ? (
                    <Text style={styles.metaText}>Matricula: {status.license_number}</Text>
                  ) : null}
                  {status.license_status === 'rejected' && status.rejection_reason ? (
                    <Text style={styles.rejectionText}>{status.rejection_reason}</Text>
                  ) : null}
                </View>
              ) : null}

              {status?.license_status === 'not_submitted' && status.full_name ? (
                <View style={styles.meta}>
                  <Text style={styles.metaText}>Nombre: {status.full_name}</Text>
                  <Text style={styles.metaText}>Especialidad: {getSpecialtyLabel(status.specialty)}</Text>
                </View>
              ) : null}

              {canSendApplication ? (
                <Pressable style={styles.primaryButton} onPress={handleSendApplication}>
                  <Text style={styles.primaryButtonText}>Completar solicitud</Text>
                </Pressable>
              ) : null}

              {canRetryApplication ? (
                <>
                  <Text style={styles.description}>
                    Podes volver a enviar la solicitud desde el formulario de especialista.
                  </Text>
                  <Pressable style={styles.primaryButton} onPress={handleSendApplication}>
                    <Text style={styles.primaryButtonText}>Reintentar solicitud</Text>
                  </Pressable>
                </>
              ) : null}

              {error || isUnknownStatus ? (
                <Pressable style={styles.secondaryButton} onPress={refreshStatus}>
                  <Text style={styles.secondaryButtonText}>Reintentar</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </Card>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function getStatusContent(status: SpecialistStatus): {
  background: string;
  color: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
} {
  if (!status) {
    return {
      background: '#FDECEC',
      color: '#B42318',
      description: 'No pudimos interpretar el estado de tu solicitud. Actualiza la pantalla o intenta nuevamente.',
      icon: 'alert-circle-outline',
      title: 'Estado desconocido'
    };
  }

  if (status.license_status === 'pending') {
    return {
      background: '#FFF7E6',
      color: '#B7791F',
      description: 'Estamos revisando tu DNI y titulo profesional.',
      icon: 'time-outline',
      title: 'Solicitud pendiente'
    };
  }

  if (status.license_status === 'rejected') {
    return {
      background: '#FDECEC',
      color: '#B42318',
      description: 'Tu solicitud necesita correcciones antes de ser aprobada.',
      icon: 'close-circle-outline',
      title: 'Solicitud rechazada'
    };
  }

  if (status.license_status === 'verified') {
    return {
      background: '#EBF4EC',
      color: colors.primaryDark,
      description: 'Tu matricula fue verificada. El panel de especialista llegara en el modulo correspondiente.',
      icon: 'checkmark-circle-outline',
      title: 'Matricula verificada'
    };
  }

  if (status.license_status === 'not_submitted') {
    return {
      background: '#EBF4EC',
      color: colors.primaryDark,
      description: 'Todavia no completaste tu solicitud de especialista.',
      icon: 'document-text-outline',
      title: 'Solicitud incompleta'
    };
  }

  return {
    background: '#FDECEC',
    color: '#B42318',
    description: 'Recibimos un estado que la app todavia no reconoce. Actualiza la pantalla o intenta nuevamente.',
    icon: 'alert-circle-outline',
    title: 'Estado desconocido'
  };
}

function isKnownStatus(status: string): boolean {
  return ['pending', 'rejected', 'verified', 'not_submitted'].includes(status);
}

function getSpecialtyLabel(specialty: string | null): string {
  if (!specialty) {
    return 'No informado';
  }

  if (specialty === 'cosmetologo') {
    return 'Cosmetólogo/a';
  }

  if (specialty === 'dermatologo') {
    return 'Dermatólogo/a';
  }

  return 'No informado';
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 24
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900'
  },
  statusCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28
  },
  loading: {
    alignItems: 'center',
    gap: 12
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  meta: {
    alignSelf: 'stretch',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    gap: 8,
    padding: 14
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  rejectionText: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800'
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 8,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800'
  },
  logoutButton: {
    alignItems: 'center',
    borderColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center'
  },
  logoutText: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '800'
  }
});
