import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { ApiRequestError } from '@/services/api/client';
import { getQuizProfile, type SkinProfileResult } from '@/services/quiz';

export default function QuizResultsScreen() {
  const router = useRouter();
  const [skinProfile, setSkinProfile] = useState<SkinProfileResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSkinProfile() {
      try {
        const profile = await getQuizProfile();
        setSkinProfile(profile);
      } catch (error) {
        if (__DEV__) console.error(error);

        if (error instanceof ApiRequestError && error.status === 401) {
          router.replace('/login');
          return;
        }

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
        <Ionicons color={colors.primaryDark} name="checkmark" size={32} />
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

function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'goal' }) {
  return (
    <View style={[styles.badge, variant === 'goal' ? styles.goalBadge : null]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60
  },
  iconBox: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    width: 60
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center'
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 40,
    padding: 24
  },
  sectionLabel: {
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  goalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryLight
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 24
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto',
    width: '100%'
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 40,
    textAlign: 'center'
  }
});
