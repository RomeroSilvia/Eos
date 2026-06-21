import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

const quickActions = [
  { icon: 'sparkles' as const, label: 'Consultas', route: '/(tabs-specialist)/consultas' as Href },
  { icon: 'people' as const, label: 'Pacientes', route: '/(tabs-specialist)/pacientes' as Href },
  { icon: 'list' as const, label: 'Rutinas', route: '/(tabs-specialist)/rutinas' as Href },
  { icon: 'calendar' as const, label: 'Agenda', route: '/(tabs-specialist)/consultas' as Href }
];

const pendingConsultations = [
  { initials: 'CR', name: 'Camila Rodriguez', reason: 'Consulta de rutina', time: '10:30 hs' },
  { initials: 'AP', name: 'Agustin Perez', reason: 'Primera consulta', time: '12:00 hs' },
  { initials: 'AP', name: 'Agustin Perez', reason: 'Primera consulta', time: '13:00 hs' }
];

export default function SpecialistHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola, Dra. Marta!</Text>
            <Text style={styles.subtitle}>Lista para cuidar la piel de tus pacientes</Text>
          </View>
          <Pressable accessibilityLabel="Notificaciones" style={styles.notificationButton}>
            <Ionicons color={colors.textSecondary} name="notifications-outline" size={24} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Atende desde donde estes</Text>
            <Text style={styles.heroTitle}>Consultas</Text>
            <Text style={styles.heroDescription}>Conectate, escucha y guia a tus pacientes en tiempo real</Text>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Atender ahora</Text>
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Consultas pendientes</Text>
          <Text style={styles.viewAll}>Ver todas</Text>
        </View>

        <View style={styles.consultationList}>
          {pendingConsultations.map((consultation, index) => (
            <View
              key={`${consultation.name}-${consultation.time}`}
              style={[styles.consultationItem, index === pendingConsultations.length - 1 && styles.lastItem]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{consultation.initials}</Text>
              </View>
              <View style={styles.consultationCopy}>
                <Text style={styles.consultationName}>{consultation.name}</Text>
                <Text style={styles.consultationReason}>{consultation.reason}</Text>
              </View>
              <View style={styles.timePill}>
                <Text style={styles.timeText}>{consultation.time}</Text>
              </View>
            </View>
          ))}
        </View>
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
  notificationButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44
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
    minHeight: 84
  },
  quickLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center'
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
    fontSize: 14,
    fontWeight: '800'
  }
});
