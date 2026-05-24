import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig } from '@/services/api/client';

type SkinProfileResult = {
  ageRange: string;
  skinType: string;
  imperfections: string;
  mainGoal: string;
};

type QuizProfileResponse = {
  skinProfile?: {
    age_range?: string | null;
    skin_type?: string | null;
    imperfections?: string | null;
    main_goal?: string | null;
  };
  message?: string;
};

export default function QuizResultsScreen() {
  const router = useRouter();
  const [skinProfile, setSkinProfile] = useState<SkinProfileResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSkinProfile() {
      try {
        const token = await getStoredToken();

        if (!token) {
          router.replace('/login');
          return;
        }

        const response = await fetch(`${apiConfig.baseUrl}/quiz/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = (await response.json().catch(() => null)) as QuizProfileResponse | null;

        if (!response.ok || !data?.skinProfile) {
          throw new Error(data?.message ?? 'No pudimos cargar tus resultados.');
        }

        setSkinProfile({
          ageRange: data.skinProfile.age_range ?? '',
          skinType: data.skinProfile.skin_type ?? '',
          imperfections: data.skinProfile.imperfections ?? '',
          mainGoal: data.skinProfile.main_goal ?? ''
        });
      } catch (error) {
        console.error(error);
        Alert.alert('Error', error instanceof Error ? error.message : 'No pudimos cargar tus resultados.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadSkinProfile();
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.loadingText}>Cargando resultados...</Text>
      </SafeAreaView>
    );
  }

  if (!skinProfile) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.loadingText}>No encontramos resultados para este usuario.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.iconBox}>
        <Ionicons color="#4B7C6E" name="checkmark" size={32} />
      </View>

      <Text style={styles.title}>Analisis completo</Text>
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

async function getStoredToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem('eos-access-token');
  }

  return SecureStore.getItemAsync('eos-access-token');
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
  },
  loadingText: {
    color: '#0B132B',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 40,
    textAlign: 'center'
  }
});
