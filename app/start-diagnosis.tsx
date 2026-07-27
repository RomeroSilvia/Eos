import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

const benefits = [
  'Quiz de piel en 5 preguntas',
  'Rutina pesonalizada al instante',
  'Especialistas y comunidad real'
];

export default function StartDiagnosisScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />

      <Text style={styles.title}>Tu piel, tu rutina.</Text>
      <Text style={styles.subtitle}>
        Rutinas personalizadas, charla con profesionales y comparti con la comunidad.
      </Text>

      <View>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Ionicons color={colors.primary} name="checkmark" size={18} />
            </View>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.button} onPress={() => router.push('/quiz')}>
        <Text style={styles.buttonText}>Comenzar diagnostico de mi piel</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
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
    marginTop: 30
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 40,
    marginTop: 15
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 20
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
  }
});
