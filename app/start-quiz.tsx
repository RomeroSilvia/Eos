import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BenefitItemProps = {
  text: string;
};

function BenefitItem({ text }: BenefitItemProps) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIconBox}>
        <Feather color="#528265" name="check" size={20} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export default function StartQuizScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topSection}>
        <Image resizeMode="contain" source={require('@/assets/images/logo.png')} style={styles.logo} />

        <Text style={styles.title}>Tu piel, tu rutina.</Text>
        <Text style={styles.subtitle}>
          Rutinas personalizadas, charla con profesionales y comparti con la comunidad.
        </Text>

        <View style={styles.benefits}>
          <BenefitItem text="Quiz de piel en 5 preguntas" />
          <BenefitItem text="Rutina personalizada al instante" />
          <BenefitItem text="Especialistas y comunidad real" />
        </View>
      </View>

      <View style={styles.buttonSection}>
        <Pressable onPress={() => router.push('/quiz')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Comenzar quiz de piel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  topSection: {
    width: '100%',
  },
  logo: {
    alignSelf: 'center',
    height: 80,
    width: '100%',
  },
  title: {
    color: '#0B132B',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 40,
  },
  subtitle: {
    color: '#6C757D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 15,
  },
  benefits: {
    gap: 20,
    marginTop: 30,
  },
  benefitItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  benefitIconBox: {
    alignItems: 'center',
    backgroundColor: '#D5E8D4',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  benefitText: {
    color: '#495057',
    fontSize: 16,
    marginLeft: 15,
  },
  buttonSection: {
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
