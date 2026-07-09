import { Alert, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useRoutineWizard } from '@/hooks/useRoutineWizard';
import {
  clearRoutineWizardTransition,
  logRoutineWizardWork,
  markRoutineWizardTransition,
  useRoutineWizardProfiler
} from '@/hooks/useRoutineWizardProfiler';
import type { RoutineTimeOfDay } from '@/types/routine';

export default function Step3() {
  const router = useRouter();
  const { routineId, assignClientId } = useLocalSearchParams<{ routineId: string; assignClientId?: string }>();

  const { state, setTimeOfDay, updateRoutineDataInBackground } = useRoutineWizard();
  const effectiveRoutineId = typeof routineId === 'string' && routineId.trim()
    ? routineId
    : state.routineId;
  const type = state.time_of_day ?? 'morning';
  useRoutineWizardProfiler('Step3', { assignClientId: Boolean(assignClientId) });

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb={assignClientId ? 'Pacientes / Rutinas' : 'Rutinas'} title="Nueva rutina" />
      <View style={styles.container}>
        <View style={{ alignItems: 'center' }}>
          <Stepper current={3} />
        </View>

        <Text style={styles.section}>Tipo de rutina</Text>

        <Text style={styles.question}>
          ¿Cuándo quieres usar esta rutina?
        </Text>

        <Pressable
          accessibilityLabel="Seleccionar rutina matutina"
          accessibilityRole="radio"
          accessibilityState={{ selected: type === 'morning' }}
          onPress={() => setTimeOfDay('morning')}
          style={[styles.card, type === 'morning' && styles.cardActive]}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.icon, styles.iconActive]}>
              <MaterialCommunityIcons name="weather-sunset-up" size={26} color={colors.surface} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Rutina matutina</Text>
              <Text style={styles.cardDesc}>
                Para proteger y preparar tu piel durante el día
              </Text>
            </View>
          </View>

          {type === 'morning' && (
            <View style={styles.checkAbsolute}>
              <MaterialCommunityIcons name="check" size={16} color={colors.surface} />
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Seleccionar rutina nocturna"
          accessibilityRole="radio"
          accessibilityState={{ selected: type === 'night' }}
          onPress={() => setTimeOfDay('night')}
          style={[styles.card, type === 'night' && styles.cardActive]}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.icon, styles.iconActive]}>
              <MaterialCommunityIcons name="weather-night" size={26} color={colors.surface} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Rutina nocturna</Text>
              <Text style={styles.cardDesc}>
                Para reparar y renovar tu piel durante la noche
              </Text>
            </View>
          </View>

          {type === 'night' && (
            <View style={styles.checkAbsolute}>
              <MaterialCommunityIcons name="check" size={16} color={colors.surface} />
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel={effectiveRoutineId ? 'Continuar a pasos de rutina' : 'Preparando rutina'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !effectiveRoutineId }}
          disabled={!effectiveRoutineId}
          style={[styles.button, !effectiveRoutineId && styles.buttonDisabled]}
          onPress={() => {
            if (!effectiveRoutineId) return;

            const selectedTimeOfDay: RoutineTimeOfDay = type === 'night' ? 'night' : 'morning';
            const transitionStartedAt = markRoutineWizardTransition('Step3', 'Step4', {
              routineId: effectiveRoutineId,
              assignClientId: Boolean(assignClientId)
            });

            router.push({
              pathname: '/routine/Step4',
              params: assignClientId
                ? { routineId: effectiveRoutineId, assignClientId }
                : { routineId: effectiveRoutineId }
            });

            updateRoutineDataInBackground(effectiveRoutineId, {
              time_of_day: selectedTimeOfDay
            })
              .then(() => {
                logRoutineWizardWork('Step3 update routine after navigation', transitionStartedAt, {
                  routineId: effectiveRoutineId
                });
              })
              .catch((error) => {
                clearRoutineWizardTransition();
                console.error(error);
                Alert.alert('Rutina', 'No pudimos guardar el tipo de rutina. Podés intentarlo nuevamente.');
              });
          }}
        >
          <Text style={styles.buttonText}>{effectiveRoutineId ? 'Continuar' : 'Preparando...'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  section: { marginTop: 12, color: colors.textSecondary, fontSize: 13 },
  question: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    position: 'relative'
  },
  cardActive: { borderColor: colors.primaryDark },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  textContainer: { flex: 1 },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconActive: { backgroundColor: colors.secondaryLight },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardDesc: { color: colors.textSecondary, fontSize: 13 },
  checkAbsolute: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    marginTop: 'auto',
    backgroundColor: colors.secondary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: { color: colors.surface, fontWeight: '700' }
});
