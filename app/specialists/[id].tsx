import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { getMySpecialist, getSpecialists, type SpecialistSpecialty } from '@/services/specialist';

type SpecialistDetailState = {
  id: string;
  fullName: string;
  specialty: SpecialistSpecialty | null;
  email: string | null;
};

export default function SpecialistDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    fullName?: string | string[];
    specialty?: SpecialistSpecialty | string | string[];
    email?: string | string[];
  }>();

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const specialistId = useMemo(() => asSingleValue(params.id), [params.id]);
  const initialDetail = useMemo<SpecialistDetailState>(
    () => ({
      id: specialistId,
      fullName: asSingleValue(params.fullName) ?? 'Especialista',
      specialty: toSpecialty(asSingleValue(params.specialty)),
      email: normalizeEmail(asSingleValue(params.email))
    }),
    [params.email, params.fullName, params.specialty, specialistId]
  );
  const [detail, setDetail] = useState<SpecialistDetailState>(initialDetail);

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);

  useEffect(() => {
    if (!specialistId) {
      return;
    }

    const shouldFetch = !detail.email || !detail.specialty;

    if (!shouldFetch) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoadingDetails(true);

      try {
        const mySpecialist = await getMySpecialist().catch(() => null);

        if (mySpecialist?.id === specialistId && !cancelled) {
          setDetail((prev) => ({
            ...prev,
            fullName: mySpecialist.fullName || prev.fullName,
            specialty: mySpecialist.specialty ?? prev.specialty,
            email: mySpecialist.email ?? prev.email
          }));
        }

        const hasEnoughDataFromRelation =
          mySpecialist?.id === specialistId && Boolean(mySpecialist.email || mySpecialist.specialty);

        if (hasEnoughDataFromRelation) {
          return;
        }

        const specialists = await getSpecialists();
        const fullDetail = specialists.find((item) => item.id === specialistId);

        if (!fullDetail || cancelled) {
          return;
        }

        setDetail((prev) => ({
          ...prev,
          fullName: fullDetail.fullName || prev.fullName,
          specialty: fullDetail.specialty ?? prev.specialty,
          email: fullDetail.email ?? prev.email
        }));
      } finally {
        if (!cancelled) {
          setIsLoadingDetails(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detail.email, detail.specialty, specialistId]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Button onPress={() => router.back()} style={styles.backButton} variant="ghost">
          Volver
        </Button>

        <Card style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Ionicons color={colors.primaryDark} name="medkit-outline" size={30} />
          </View>
          <Text style={styles.name}>{detail.fullName}</Text>
          <Text style={styles.specialty}>
            {detail.specialty ? getSpecialtyLabel(detail.specialty) : 'Especialidad no informada'}
          </Text>
          <Text style={styles.email}>{detail.email ?? 'Email no informado'}</Text>
          {isLoadingDetails ? <Text style={styles.loadingHint}>Completando datos del perfil...</Text> : null}
          <Text style={styles.description}>
            Este perfil muestra los datos del especialista seleccionado.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

function asSingleValue(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function toSpecialty(value?: string): SpecialistSpecialty | null {
  if (value === 'dermatologo' || value === 'cosmetologo') {
    return value;
  }

  return null;
}

function normalizeEmail(value?: string): string | null {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function getSpecialtyLabel(specialty: SpecialistSpecialty): string {
  if (specialty === 'dermatologo') {
    return 'Dermatologo/a';
  }

  return 'Cosmetologo/a';
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 14,
    padding: 20
  },
  backButton: {
    alignSelf: 'flex-start'
  },
  profileCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72
  },
  name: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center'
  },
  specialty: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700'
  },
  email: {
    color: colors.textSecondary,
    fontSize: 14
  },
  loadingHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: -4
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 6,
    textAlign: 'center'
  }
});
