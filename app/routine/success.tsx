import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getRoutineById } from '@/services/routines';
import type { Routine, RoutineTimeOfDay } from '@/types/routine';

export default function SuccessScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const { profile } = useProfile();

  useEffect(() => {
    if (!routineId) return;

    getRoutineById(routineId)
      .then(setRoutine)
      .catch((error) => console.error(error));
  }, [routineId]);

  const stepsCount = routine?.routine_steps?.length ?? 0;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <MaterialCommunityIcons name="check" size={48} color={colors.surface} />
          </View>
        </View>

        <Text style={styles.title}>Rutina creada con exito</Text>

        <Text style={styles.subtitle}>
          Tu nueva rutina ha sido creada correctamente.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{routine?.name ?? 'Cargando rutina...'}</Text>

          <View style={styles.row}>
            <MaterialCommunityIcons
              name={routine?.time_of_day === 'night' ? 'weather-night' : 'weather-sunny'}
              size={18}
              color={colors.primaryDark}
            />
            <Text style={styles.cardText}>{getRoutineTimeLabel(routine?.time_of_day)}</Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="format-list-numbered" size={18} color={colors.primaryDark} />
            <Text style={styles.cardText}>{stepsCount} {stepsCount === 1 ? 'paso' : 'pasos'}</Text>
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => router.push((profile?.role === 'specialist' ? '/(tabs-specialist)/rutinas' : '/routine') as never)}
        >
          <Text style={styles.buttonText}>Ver mi rutina</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function getRoutineTimeLabel(timeOfDay?: RoutineTimeOfDay | null) {
  if (timeOfDay === 'morning') return 'Rutina matutina';
  if (timeOfDay === 'night') return 'Rutina nocturna';
  if (timeOfDay === 'custom') return 'Rutina personalizada';

  return 'Sin tipo definido';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },

  iconOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  },

  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center'
  },

  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center'
  },

  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border
  },

  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.textPrimary
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },

  cardText: {
    color: colors.textSecondary
  },

  button: {
    marginTop: 20,
    width: '100%',
    backgroundColor: colors.secondary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },

  buttonText: {
    color: colors.surface,
    fontWeight: '700'
  }
});
