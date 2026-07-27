import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { ApiRequestError } from '@/services/api/client';
import { saveQuiz } from '@/services/quiz';

type QuizOption = {
  label: string;
  description?: string;
};

type QuizQuestion = {
  title: string;
  options: QuizOption[];
};

const quizQuestions: QuizQuestion[] = [
  {
    title: '¿Que edad tenes?',
    options: ['-25', '25-30', '35-45', '+45'].map((label) => ({ label }))
  },
  {
    title: '¿Que tipo de piel tenes?',
    options: [
      { label: 'Normal', description: 'Ni demasiado seca ni demasiado grasa' },
      { label: 'Mixta', description: 'Combina piel grasa y piel seca' },
      { label: 'Seca', description: 'Aspera y tirante' },
      { label: 'Grasa', description: 'Sobreproduccion de cebo, brillo excesivo' }
    ]
  },
  {
    title: '¿Que tipo de imperfecciones tenes?',
    options: ['Manchas', 'Acné', 'Ojeras marcadas', 'Sin imperfecciones'].map((label) => ({
      label
    }))
  },
  {
    title: '¿Cual es tu principal objetivo?',
    options: [
      'Controlar el brillo y granitos',
      'Reducir lineas de expresión',
      'Hidratar y dar luminosidad',
      'Unificar el tono'
    ].map((label) => ({ label }))
  },
  {
    title: '¿Cuantos pasos tiene tu rutina?',
    options: ['Tres pasos', 'Cinco pasos', 'Mas de diez pasos', 'No tengo rutina'].map((label) => ({
      label
    }))
  }
];

export default function QuizScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  function handleSelect(label: string) {
    if (isSaving) {
      return;
    }

    const nextAnswers = {
      ...answers,
      [currentStep]: label
    };

    setAnswers(nextAnswers);

    setTimeout(() => {
      if (currentStep === quizQuestions.length - 1) {
        void saveQuizAnswers(nextAnswers);
        return;
      }

      setCurrentStep((prev) => prev + 1);
    }, 400);
  }

  async function saveQuizAnswers(finalAnswers: Record<number, string>) {
    if (!hasAllQuizAnswers(finalAnswers)) {
      Alert.alert('Quiz incompleto', 'Responde las 5 preguntas antes de guardar tus resultados.');
      return;
    }

    setCurrentStep(5);
    setIsSaving(true);

    try {
      await saveQuiz({
        ageRange: getAnswer(finalAnswers, 0),
        skinType: getAnswer(finalAnswers, 1),
        imperfections: getAnswer(finalAnswers, 2),
        mainGoal: getAnswer(finalAnswers, 3),
        routineSteps: getAnswer(finalAnswers, 4)
      });

      router.replace(routes.resultados);
    } catch (error) {
      if (__DEV__) console.error(error);

      if (error instanceof ApiRequestError && error.status === 401) {
        Alert.alert('Sesion requerida', 'Inicia sesion para guardar los resultados del quiz.');
        router.replace(routes.login);
        return;
      }

      Alert.alert(
        'Error al guardar',
        error instanceof Error ? error.message : 'No pudimos guardar tus respuestas.'
      );
      setCurrentStep(quizQuestions.length - 1);
    } finally {
      setIsSaving(false);
    }
  }

  function getAnswer(finalAnswers: Record<number, string>, index: number) {
    return finalAnswers[index]?.trim() || 'No especificado';
  }

  function hasAllQuizAnswers(finalAnswers: Record<number, string>) {
    return quizQuestions.every((_, index) => Boolean(finalAnswers[index]?.trim()));
  }

  function getCalculatingText() {
    return isSaving ? 'Calculando resultados...' : 'Calculando resultados...';
  }

  if (currentStep === 5) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.calculatingContainer}>
          <LoadingState message={getCalculatingText()} />
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = quizQuestions[currentStep];
  const progressWidth = `${((currentStep + 1) / 5) * 100}%` as DimensionValue;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <Text style={styles.title}>{currentQuestion.title}</Text>

      <View>
        {currentQuestion.options.map((option) => {
          const isSelected = answers[currentStep] === option.label;

          return (
            <Pressable
              disabled={isSaving}
              key={option.label}
              onPress={() => handleSelect(option.label)}
              style={[styles.optionButton, isSelected ? styles.optionButtonSelected : null]}
            >
              <Image source={require('@/assets/images/quiz-imagen.png')} style={styles.optionImage} />

              <View style={styles.optionTextContainer}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.description ? (
                  <Text style={styles.optionDescription}>{option.description}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
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
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
    width: '100%'
  },
  progressFill: {
    backgroundColor: colors.secondary,
    borderRadius: 2,
    height: 4
  },
  title: {
    color: colors.textPrimary,
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 30,
    marginTop: 40
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: colors.textPrimary,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
    width: '100%'
  },
  optionButtonSelected: {
    backgroundColor: colors.secondaryLight,
    borderColor: colors.textPrimary
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 14
  },
  optionImage: {
    height: 32,
    resizeMode: 'contain',
    width: 32
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold'
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  resultText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center'
  },
  calculatingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  }
});
