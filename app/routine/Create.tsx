import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RoutineIllustration } from '@/components/icons/RoutineIllustration';
import { AppHeader } from '@/components/navigation/AppHeader';
import { Stepper } from '@/components/Stepper';
import { markRoutineWizardTransition, useRoutineWizardProfiler } from '@/hooks/useRoutineWizardProfiler';

export default function CreateRoutineScreen() {
  const router = useRouter();
  const { assignClientId } = useLocalSearchParams<{ assignClientId?: string }>();
  useRoutineWizardProfiler('Create', { assignClientId: Boolean(assignClientId) });

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb={assignClientId ? 'Pacientes / Rutinas' : 'Rutinas'} title="Nueva rutina" />
      <View style={styles.container}>
        <Stepper current={1} />

        <Text style={styles.subtitle}>
          Cuidar tu piel cada día hace la diferencia
        </Text>

        <View style={styles.illustration}>
          <RoutineIllustration />
        </View>

        <Text style={styles.heading}>Crea tu rutina</Text>
        <Text style={styles.description}>
          Personaliza tu rutina de cuidado facial según tus necesidades y objetivos.
        </Text>

        <Pressable
          accessibilityLabel="Comenzar creacion de rutina"
          accessibilityRole="button"
          style={styles.button}
          onPress={() => {
            markRoutineWizardTransition('Create', 'Step2', {
              assignClientId: Boolean(assignClientId)
            });

            router.push({
              pathname: '/routine/Step2',
              params: assignClientId ? { assignClientId } : undefined
            });
          }}
        >
          <Text style={styles.buttonText}>Comenzar</Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center'
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  circleActive: {
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: colors.primaryLight
  },
  stepText: {
    fontSize: 12
  },
  line: {
    width: 30,
    height: 2,
    backgroundColor: colors.border
  },

  subtitle: {
    marginTop: 12,
    color: colors.textSecondary,
    textAlign: 'center'
  },

  illustration: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primaryLight,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },

  heading: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },

  description: {
    textAlign: 'center',
    marginTop: 8,
    color: colors.textSecondary
  },

  button: {
    marginTop: 'auto',
    width: '100%',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },

  buttonText: {
    color: colors.surface,
    fontWeight: '700'
  }
});
