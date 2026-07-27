import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { routes } from '@/constants/routes';

const benefits = [
  'Quiz de piel en 5 preguntas',
  'Rutina personalizada al instante',
  'Especialistas y comunidad real'
];

export default function StartDiagnosisScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      title="Tu piel, tu rutina."
      subtitle="Rutinas personalizadas, charla con profesionales y comparti con la comunidad."
      benefits={benefits}
      buttons={[
        {
          label: 'Comenzar diagnostico de mi piel',
          variant: 'primary',
          onPress: () => router.push(routes.quiz)
        }
      ]}
    />
  );
}
