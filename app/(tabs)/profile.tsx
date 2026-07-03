import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellButton } from '@/components/BellButton';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RemindersSection } from '@/components/RemindersSection';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { logout } from '@/services/auth';
import { formatSkinType } from '@/utils/skinType';
import { getMySpecialist, unlinkSpecialist } from '@/services/specialist';
import type { MySpecialist } from '@/services/specialist';
import { useCallback, useState } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [mySpecialist, setMySpecialist] = useState<MySpecialist | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [isCenterModalVisible, setIsCenterModalVisible] = useState(false);
  const [isSpecialistMenuOpen, setIsSpecialistMenuOpen] = useState(false);

  const loadMySpecialist = useCallback(async () => {
    try {
      const specialist = await getMySpecialist();
      setMySpecialist(specialist);
    } catch {
      setMySpecialist(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMySpecialist();
    }, [loadMySpecialist])
  );

  const handleUnlink = () => {
    setIsSpecialistMenuOpen(false);
    Alert.alert(
      'Desvincular especialista',
      `¿Querés desvincular a ${mySpecialist?.fullName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            setUnlinking(true);
            try {
              await unlinkSpecialist();
              setMySpecialist(null);
            } finally {
              setUnlinking(false);
            }
          }
        }
      ]
    );
  };

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

  async function handleOpenCenterMaps() {
    const center = mySpecialist?.center;

    if (!center?.address) {
      return;
    }

    const query = [center.name, center.address, center.city, center.province].filter(Boolean).join(' ');
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Centro estetico', 'No pudimos abrir Google Maps.');
    }
  }

  function handleOpenCenterModal() {
    if (!mySpecialist?.center) {
      return;
    }

    setIsSpecialistMenuOpen(false);
    setIsCenterModalVisible(true);
  }

  function handleManageSpecialist() {
    setIsSpecialistMenuOpen(false);
    router.push('/specialists' as Href);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Perfil</Text>
          <BellButton />
        </View>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons color={colors.primaryDark} name="person" size={30} />
          </View>
          <View>
            <Text style={styles.name}>{profile?.name ?? 'Marta'}</Text>
            <Text style={styles.meta}>{formatSkinType(profile?.skinType)} · {formatRole(profile?.role)}</Text>
          </View>
        </Card>
        <Card style={styles.settings}>
          <Text style={styles.sectionTitle}>Configuracion</Text>
          <Text style={styles.description}>Edita tu perfil, contrasena y notificaciones.</Text>
          <Button onPress={() => router.push('/settings' as Href)} variant="ghost" style={styles.actionButton}>
            Abrir configuracion
          </Button>
        </Card>

        <Card style={styles.settings}>
          <Text style={styles.sectionTitle}>Acompanamiento profesional</Text>
          <Text style={styles.description}>
            Gestiona tu especialista y entra al chat desde un solo lugar.
          </Text>

          {mySpecialist ? (
            <View style={styles.mySpecialistCard}>
              <View style={styles.specialistCardHeader}>
                <View style={styles.specialistRow}>
                  <View style={styles.specialistIconWrap}>
                    <Ionicons color={colors.primaryDark} name="medkit-outline" size={22} />
                  </View>
                  <View style={styles.specialistTextBlock}>
                    <Text style={styles.specialistName}>{mySpecialist.fullName}</Text>
                    <View style={styles.specialtyPill}>
                      <Text style={styles.specialtyPillText}>
                        {mySpecialist.specialty ? getSpecialtyLabel(mySpecialist.specialty) : 'Especialidad no informada'}
                      </Text>
                    </View>
                    {mySpecialist.center ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={handleOpenCenterModal}
                        style={({ pressed }) => [styles.centerAction, pressed && styles.pressed]}
                      >
                        <Ionicons color={colors.primaryDark} name="business-outline" size={14} />
                        <Text style={styles.specialistCenterLink}>{getCenterLabel(mySpecialist.center)}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.specialistCenterText}>{getCenterLabel(mySpecialist.center)}</Text>
                    )}
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsSpecialistMenuOpen(true)}
                  style={({ pressed }) => [styles.overflowButton, pressed && styles.pressed]}
                >
                  <Ionicons color={colors.textPrimary} name="ellipsis-horizontal" size={22} />
                </Pressable>
              </View>

              <Text style={styles.description}>Este es tu especialista vinculado actualmente.</Text>
            </View>
          ) : (
            <View style={styles.emptySpecialistState}>
              <Ionicons color={colors.textSecondary} name="person-add-outline" size={18} />
              <Text style={styles.emptySpecialistText}>Todavia no tenes especialista vinculado.</Text>
            </View>
          )}

          <View style={styles.actionsWrap}>
            <Button
              onPress={() => router.push((mySpecialist ? '/chat' : '/specialists') as Href)}
              style={styles.actionButton}
              variant={mySpecialist ? 'primary' : 'secondary'}
            >
              {mySpecialist ? 'Ir al chat' : 'Buscar especialista'}
            </Button>
          </View>
        </Card>

        <RemindersSection />

        <Pressable
          accessibilityRole="button"
          disabled={isLoggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, isLoggingOut && styles.disabled]}
        >
          <Text style={styles.logoutText}>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsSpecialistMenuOpen(false)}
        transparent
        visible={isSpecialistMenuOpen}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsSpecialistMenuOpen(false)}
          style={styles.actionSheetBackdrop}
        >
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.actionSheetContainer}>
            <Card style={styles.actionSheetCard}>
              <View style={styles.actionSheetHandle} />
              <Text style={styles.actionSheetTitle}>Acciones del especialista</Text>

              <Pressable accessibilityRole="button" onPress={handleManageSpecialist} style={styles.sheetAction}>
                <Ionicons color={colors.textSecondary} name="people-outline" size={18} />
                <Text style={styles.sheetActionText}>Gestionar especialista</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={!mySpecialist?.center}
                onPress={handleOpenCenterModal}
                style={[styles.sheetAction, !mySpecialist?.center && styles.disabled]}
              >
                <Ionicons color={colors.textSecondary} name="business-outline" size={18} />
                <Text style={styles.sheetActionText}>Ver centro</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={unlinking}
                onPress={handleUnlink}
                style={[styles.sheetAction, unlinking && styles.disabled]}
              >
                <Ionicons color={colors.error} name="unlink-outline" size={18} />
                <Text style={styles.sheetDestructiveText}>
                  {unlinking ? 'Desvinculando...' : 'Desvincular especialista'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setIsSpecialistMenuOpen(false)}
                style={styles.sheetCancelButton}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsCenterModalVisible(false)}
        transparent
        visible={isCenterModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.centerModalCard}>
            {mySpecialist?.center?.imageUrl ? (
              <Image source={{ uri: mySpecialist.center.imageUrl }} style={styles.centerImage} resizeMode="cover" />
            ) : (
              <View style={styles.centerImagePlaceholder}>
                <Ionicons color={colors.primaryDark} name="business-outline" size={28} />
              </View>
            )}

            <View style={styles.centerModalHeader}>
              <Text style={styles.centerModalTitle}>{mySpecialist?.center?.name ?? 'Centro estetico'}</Text>
              <Text style={styles.description}>Informacion del centro asociado a tu especialista.</Text>
            </View>

            <View style={styles.centerDetails}>
              <InfoRow label="Direccion" value={mySpecialist?.center?.address ?? 'Direccion no cargada'} />
              <InfoRow label="Ciudad" value={mySpecialist?.center?.city ?? 'Ciudad no cargada'} />
              <InfoRow label="Provincia" value={mySpecialist?.center?.province ?? 'Provincia no cargada'} />
              <InfoRow label="Telefono" value={mySpecialist?.center?.phone ?? 'Telefono no cargado'} />
            </View>

            {mySpecialist?.center?.address ? (
              <Button onPress={handleOpenCenterMaps} style={styles.actionButton} variant="secondary">
                Ver en Google Maps
              </Button>
            ) : null}

            <Button onPress={() => setIsCenterModalVisible(false)} style={styles.actionButton} variant="ghost">
              Cerrar
            </Button>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatRole(role?: string | null): string {
  if (role === 'specialist') return 'Especialista';
  if (role === 'center_admin') return 'Admin';
  return 'Usuario';
}

function getSpecialtyLabel(specialty: MySpecialist['specialty']): string {
  if (specialty === 'dermatologo') {
    return 'Dermatologo/a';
  }

  if (specialty === 'cosmetologo') {
    return 'Cosmetologo/a';
  }

  return 'Especialidad no informada';
}

function getCenterLabel(center?: MySpecialist['center']): string {
  if (!center?.name) {
    return 'Centro: Sin centro asignado';
  }

  const location = [center.city, center.province].filter(Boolean).join(', ');
  return location ? `Centro: ${center.name} · ${location}` : `Centro: ${center.name}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 3
  },
  settings: {
    gap: 12
  },
  actionsWrap: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 4
  },
  actionButton: {
    width: '100%'
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  unlinkSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 10
  },
  unlinkButton: {
    alignSelf: 'center'
  },
  mySpecialistCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  specialistCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  specialistRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12
  },
  specialistIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  specialistTextBlock: {
    flex: 1,
    gap: 4
  },
  specialistName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  specialtyPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  specialtyPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  specialistCenterText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18
  },
  centerAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 2
  },
  specialistCenterLink: {
    color: colors.primaryDark,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textDecorationLine: 'underline'
  },
  overflowButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  actionSheetBackdrop: {
    backgroundColor: 'rgba(16, 42, 67, 0.32)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16
  },
  actionSheetContainer: {
    width: '100%'
  },
  actionSheetCard: {
    gap: 8,
    padding: 16
  },
  actionSheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: 4,
    width: 42
  },
  actionSheetTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center'
  },
  sheetAction: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  sheetActionText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '800'
  },
  sheetDestructiveText: {
    color: colors.error,
    flex: 1,
    fontSize: 15,
    fontWeight: '900'
  },
  sheetCancelButton: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 12
  },
  sheetCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '900'
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 42, 67, 0.32)',
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  centerModalCard: {
    gap: 14,
    maxWidth: 420,
    width: '100%'
  },
  centerImage: {
    borderRadius: 14,
    height: 132,
    width: '100%'
  },
  centerImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    height: 132,
    justifyContent: 'center',
    width: '100%'
  },
  centerModalHeader: {
    gap: 4
  },
  centerModalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  centerDetails: {
    gap: 10
  },
  infoRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 3,
    paddingBottom: 8
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  emptySpecialistState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  emptySpecialistText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1
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
