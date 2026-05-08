import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';

export default function ProfileScreen() {
  const { profile } = useProfile();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Perfil</Text>
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
          <Text style={styles.sectionTitle}>Recordatorios</Text>
          <Text style={styles.description}>Configura permisos y prueba un recordatorio local.</Text>
          
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
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    paddingTop: 8
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
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  }
});
