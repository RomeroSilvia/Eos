import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useRouter } from 'expo-router';

export default function CreateRoutineScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>

        <Text style={styles.title}>Nueva Rutina</Text>

        <View style={styles.stepper}>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={styles.step}>
              <View style={[styles.circle, step === 1 && styles.circleActive]}>
                <Text style={styles.stepText}>{step}</Text>
              </View>
              {step < 4 && <View style={styles.line} />}
            </View>
          ))}
        </View>

        <Text style={styles.subtitle}>
          Cuidar tu piel cada día hace la diferencia
        </Text>

        <View style={styles.illustration} />

        <Text style={styles.heading}>Crea tu rutina</Text>
        <Text style={styles.description}>
          Personaliza tu rutina de cuidado facial según tus necesidades y objetivos.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/routine/create/step2')}
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    alignSelf: 'flex-start'
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
    backgroundColor: colors.surface
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
    backgroundColor: colors.surfaceSoft,
    marginTop: 30
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