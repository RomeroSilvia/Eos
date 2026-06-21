import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellButton } from '@/components/BellButton';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';

export default function SpecialistProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Perfil</Text>
          <BellButton />
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons color={colors.primaryDark} name="medkit-outline" size={30} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{profile?.name ?? 'Especialista'}</Text>
            <Text style={styles.meta}>Especialista verificado</Text>
          </View>
        </Card>

        <Card style={styles.settings}>
          <Text style={styles.sectionTitle}>Configuracion</Text>
          <Text style={styles.description}>
            Gestiona contrasena y notificaciones. Los datos profesionales se administran desde la verificacion.
          </Text>
          <Button onPress={() => router.push('/settings' as Href)} variant="ghost" style={styles.actionButton}>
            Abrir configuracion
          </Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
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
  profileCopy: {
    flex: 1
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
  actionButton: {
    width: '100%'
  }
});
