import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/constants/colors';
import { getMySpecialist, getSpecialists, type SpecialistSpecialty } from '@/services/specialist';

type SpecialistDetailState = {
  id: string;
  fullName: string;
  specialty: SpecialistSpecialty | null;
};

export default function SpecialistDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    fullName?: string | string[];
    specialty?: SpecialistSpecialty | string | string[];
  }>();

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const specialistId = useMemo(() => asSingleValue(params.id), [params.id]);
  const initialDetail = useMemo<SpecialistDetailState>(
    () => ({
      id: specialistId,
      fullName: asSingleValue(params.fullName) ?? 'Especialista',
      specialty: toSpecialty(asSingleValue(params.specialty))
    }),
    [params.fullName, params.specialty, specialistId]
  );
  const [detail, setDetail] = useState<SpecialistDetailState>(initialDetail);

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);

  useEffect(() => {
    if (!specialistId) {
      return;
    }

    const shouldFetch = !detail.specialty;

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
            specialty: mySpecialist.specialty ?? prev.specialty
          }));
        }

        const hasEnoughDataFromRelation =
          mySpecialist?.id === specialistId && Boolean(mySpecialist.specialty);

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
          specialty: fullDetail.specialty ?? prev.specialty
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
  }, [detail.specialty, specialistId]);

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Especialistas" title="Perfil del especialista" />
      <View style={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Ionicons color={colors.primaryDark} name="medkit-outline" size={30} />
          </View>
          <Text style={styles.name}>{detail.fullName}</Text>
          <Text style={styles.specialty}>
            {detail.specialty ? getSpecialtyLabel(detail.specialty) : 'Especialidad no informada'}
          </Text>
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
