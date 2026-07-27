import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';

const benefits = [
  'Quiz de piel en 5 preguntas',
  'Rutina personalizada al instante',
  'Especialistas y comunidad real'
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      title="Tu piel, tu rutina."
      subtitle="Rutinas personalizadas, charla con profesionales y comparti con la comunidad."
      benefits={benefits}
      buttons={[
        {
          label: 'Comenzar análisis de piel',
          variant: 'outline',
          onPress: () => router.push('/register?mode=user' as never)
        },
        {
          label: 'Soy especialista',
          variant: 'primary',
          onPress: () => router.push('/register?mode=specialist' as never)
        },
        {
          label: 'Ya tengo cuenta',
          variant: 'outline',
          onPress: () => router.push('/login')
        }
      ]}
    />
  );
}
