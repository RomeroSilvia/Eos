import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellButton } from '@/components/BellButton';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { getMySpecialist, unlinkSpecialist } from '@/services/specialist';
import type { MySpecialist } from '@/services/specialist';
import { useCallback, useState } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [mySpecialist, setMySpecialist] = useState<MySpecialist | null>(null);
  const [unlinking, setUnlinking] = useState(false);

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
            <Text style={styles.meta}>Piel mixta · Usuario</Text>
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
                </View>
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
            <Button onPress={() => router.push('/specialists' as Href)} variant="secondary" style={styles.actionButton}>
              {mySpecialist ? 'Gestionar especialista' : 'Buscar especialista'}
            </Button>
            <Button onPress={() => router.push('/chat' as Href)} style={styles.actionButton}>
              Ir al chat
            </Button>
          </View>

          {mySpecialist ? (
            <View style={styles.unlinkSection}>
              <Button onPress={handleUnlink} variant="ghost" style={styles.unlinkButton}>
                {unlinking ? 'Desvinculando...' : 'Desvincular especialista'}
              </Button>
            </View>
          ) : null}
        </Card>

        <Card style={styles.settings}>
          <Text style={styles.sectionTitle}>Recordatorios</Text>
          <Text style={styles.description}>Configura permisos y prueba un recordatorio local.</Text>
          <Text style={styles.reminderHint}>Activa notificaciones para no perder tus rutinas diarias.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
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
  reminderHint: {
    color: colors.textSecondary,
    fontSize: 13
  },
  mySpecialistCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  specialistRow: {
    alignItems: 'center',
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
  }
});
