import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
              <Ionicons color="#528265" name="checkmark" size={18} />
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
    backgroundColor: '#F8F9FA',
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
    color: '#0B132B',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 30
  },
  subtitle: {
    color: '#6C757D',
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
    backgroundColor: '#D5E8D4',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  benefitText: {
    color: '#495057',
    fontSize: 16,
    marginLeft: 15
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto',
    width: '100%'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});
