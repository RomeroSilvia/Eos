import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SkinProfileResult = {
  ageRange: string;
  skinType: string;
  imperfections: string;
  mainGoal: string;
};

const mockProfileResult: SkinProfileResult = {
  ageRange: '-25',
  skinType: 'Piel normal',
  imperfections: 'Tendencia a acne',
  mainGoal: 'Hidratar y dar luminosidad',
};

function Badge({ children, variant = 'default' }: { children: string; variant?: 'default' | 'goal' }) {
  return (
    <View style={[styles.badge, variant === 'goal' && styles.goalBadge]}>
      <Text style={[styles.badgeText, variant === 'goal' && styles.goalBadgeText]}>{children}</Text>
    </View>
  );
}

export default function QuizResultsScreen() {
  const router = useRouter();
  const [profileResult, setProfileResult] = useState<SkinProfileResult>(mockProfileResult);

  useEffect(() => {
    setProfileResult(mockProfileResult);
    // Futuro: reemplazar mockProfileResult con GET /api/quiz/profile usando el token del usuario.
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.confirmationIcon}>
        <Ionicons color="#4B7C6E" name="checkmark" size={32} />
      </View>

      <Text style={styles.title}>Análisis completo</Text>
      <Text style={styles.subtitle}>Tu perfil de piel esta listo</Text>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.sectionLabel}>DIAGNOSTICO</Text>
          <View style={styles.badges}>
            <Badge>{profileResult.ageRange}</Badge>
            <Badge>{profileResult.skinType}</Badge>
            <Badge>{profileResult.imperfections}</Badge>
          </View>
        </View>

        <View style={styles.separator} />

        <View>
          <Text style={styles.sectionLabel}>OBJETIVOS</Text>
          <View style={styles.badges}>
            <Badge variant="goal">{profileResult.mainGoal}</Badge>
          </View>
        </View>
      </View>

      <Pressable onPress={() => router.replace('/home')} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Ver mi perfil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  confirmationIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#D1E8E2',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  title: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6C757D',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 40,
    padding: 24,
  },
  sectionLabel: {
    color: '#6C757D',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0,
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    backgroundColor: '#EDF2F7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: {
    color: '#0B132B',
    fontSize: 14,
    fontWeight: '600',
  },
  goalBadge: {
    backgroundColor: '#EADCDC',
  },
  goalBadgeText: {
    color: '#0B132B',
  },
  separator: {
    backgroundColor: '#E2E8F0',
    height: 1,
    marginVertical: 22,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
