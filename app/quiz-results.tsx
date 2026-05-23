import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SkinProfileResult = {
  ageRange: string;
  skinType: string;
  imperfections: string;
  mainGoal: string;
};

const mockSkinProfile: SkinProfileResult = {
  ageRange: '-25',
  skinType: 'Piel normal',
  imperfections: 'Tendencia a acné',
  mainGoal: 'Hidratar y dar luminosidad'
};

export default function QuizResultsScreen() {
  const router = useRouter();
  const [skinProfile, setSkinProfile] = useState<SkinProfileResult>(mockSkinProfile);

  useEffect(() => {
    async function loadSkinProfile() {
      // Futuro: GET /api/quiz/profile para reemplazar mockSkinProfile con datos de Supabase.
      setSkinProfile(mockSkinProfile);
    }

    void loadSkinProfile();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.iconBox}>
        <Ionicons color="#4B7C6E" name="checkmark" size={32} />
      </View>

      <Text style={styles.title}>Análisis completo</Text>
      <Text style={styles.subtitle}>Tu perfil de piel esta listo</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>DIAGNOSTICO</Text>
        <View style={styles.badges}>
          <Badge label={skinProfile.ageRange} />
          <Badge label={skinProfile.skinType} />
          <Badge label={skinProfile.imperfections} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>OBJETIVOS</Text>
        <Badge label={skinProfile.mainGoal} variant="goal" />
      </View>

      <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/home')}>
        <Text style={styles.buttonText}>Ver mi perfil</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'goal' }) {
  return (
    <View style={[styles.badge, variant === 'goal' ? styles.goalBadge : null]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60
  },
  iconBox: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#D1E8E2',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    width: 60
  },
  title: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center'
  },
  subtitle: {
    color: '#6C757D',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 40,
    padding: 24
  },
  sectionLabel: {
    color: '#6C757D',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 10
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  badge: {
    backgroundColor: '#EDF2F7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  goalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EADCDC'
  },
  badgeText: {
    color: '#0B132B',
    fontSize: 14,
    fontWeight: '600'
  },
  divider: {
    backgroundColor: '#E2E8F0',
    height: 1,
    marginVertical: 24
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto',
    width: '100%'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});
