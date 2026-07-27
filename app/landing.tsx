import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

const benefits = [
  'Quiz de piel en 5 preguntas',
  'Rutina personalizada al instante',
  'Especialistas y comunidad real'
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />

        <Text style={styles.title}>Tu piel, tu rutina.</Text>
        <Text style={styles.subtitle}>
          Rutinas personalizadas, charla con profesionales y comparti con la comunidad.
        </Text>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <BenefitItem key={benefit} text={benefit} />
          ))}
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable style={[styles.button, styles.outlineButton]} onPress={() => router.push('/register?mode=user' as never)}>
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Comenzar análisis de piel</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.primaryButton]} onPress={() => router.push('/register?mode=specialist' as never)}>
          <Text style={[styles.buttonText, styles.primaryButtonText]}>Soy especialista</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.outlineButton]} onPress={() => router.push('/login')}>
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Ya tengo cuenta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIcon}>
        <Feather color={colors.primary} name="check" size={18} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 60
  },
  logo: {
    alignSelf: 'center',
    height: 145,
    resizeMode: 'contain',
    width: 145
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 40
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 15
  },
  benefits: {
    gap: 20,
    marginTop: 30
  },
  benefitItem: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  benefitIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  benefitText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginLeft: 15
  },
  buttons: {
    gap: 15
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    width: '100%'
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: colors.textPrimary,
    borderWidth: 1
  },
  primaryButton: {
    backgroundColor: colors.secondary
  },
  buttonText: {
    fontSize: 16
  },
  outlineButtonText: {
    color: colors.textPrimary,
    fontWeight: '500'
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '600'
  }
});
