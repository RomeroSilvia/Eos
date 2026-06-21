import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { getMySpecialist, type MySpecialist, type SpecialistSpecialty } from '@/services/specialist';

export function SpecialistHomeCard() {
  const router = useRouter();
  const [specialist, setSpecialist] = useState<MySpecialist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadSpecialist = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const nextSpecialist = await getMySpecialist();
      setSpecialist(nextSpecialist);
    } catch {
      setSpecialist(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSpecialist();
    }, [loadSpecialist])
  );

  const hasSpecialist = Boolean(specialist);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{hasSpecialist ? 'Tu especialista' : 'Acompañamiento profesional'}</Text>

      <Card variant="soft" style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <Ionicons color={colors.primaryDark} name="medkit-outline" size={30} />
          </View>

          <View style={styles.copy}>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.description}>Buscando tu especialista...</Text>
              </View>
            ) : hasError ? (
              <>
                <Text style={styles.title}>No pudimos cargar tu especialista</Text>
                <Text style={styles.description}>Intentá nuevamente en unos minutos.</Text>
              </>
            ) : specialist ? (
              <>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{specialist.fullName}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Verificado</Text>
                  </View>
                </View>
                <Text style={styles.description}>{getSpecialtyLabel(specialist.specialty)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Encontrá tu especialista</Text>
                <Text style={styles.description}>
                  Conectá con dermatólogos o cosmetólogos verificados para recibir rutinas personalizadas y hacer consultas sobre tu piel.
                </Text>
              </>
            )}
          </View>
        </View>

        {!isLoading && !hasError && specialist ? (
          <View style={styles.linkedActions}>
            <Button variant="secondary" onPress={() => router.push('/chat')} style={styles.primaryButton}>
              Enviar consulta
            </Button>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/specialists/[id]',
                  params: {
                    id: specialist.id,
                    fullName: specialist.fullName,
                    specialty: specialist.specialty ?? ''
                  }
                })
              }
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Ver perfil</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !hasError && !specialist ? (
          <Button variant="secondary" onPress={() => router.push('/specialists')} style={styles.primaryButton}>
            Buscar especialistas
          </Button>
        ) : null}
      </Card>
    </View>
  );
}

function getSpecialtyLabel(specialty: SpecialistSpecialty | null): string {
  if (specialty === 'dermatologo') {
    return 'Dermatólogo/a';
  }

  if (specialty === 'cosmetologo') {
    return 'Cosmetólogo/a';
  }

  return 'Especialidad no informada';
}

const styles = StyleSheet.create({
  section: {
    gap: 10
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  card: {
    gap: 14,
    padding: 16
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  copy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  title: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  badge: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900'
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  primaryButton: {
    alignSelf: 'stretch',
    minHeight: 48
  },
  linkedActions: {
    gap: 10
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800'
  }
});
