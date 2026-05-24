import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig } from '@/services/api/client';

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

    try {
      const token = await getStoredToken();

      if (!token) {
        Alert.alert('Sesion requerida', 'Inicia sesion para guardar los resultados del quiz.');
        router.replace('/login');
        return;
      }

      setCurrentStep(5);
      setIsSaving(true);

      const payload = {
        ageRange: getAnswer(finalAnswers, 0),
        skinType: getAnswer(finalAnswers, 1),
        imperfections: getAnswer(finalAnswers, 2),
        mainGoal: getAnswer(finalAnswers, 3),
        routineSteps: getAnswer(finalAnswers, 4)
      };

      const response = await fetch(`${apiConfig.baseUrl}/quiz/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? 'No pudimos guardar tus respuestas.');
      }

      router.replace('/resultados');
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error al guardar',
        error instanceof Error ? error.message : 'No pudimos guardar tus respuestas.'
      );
      setCurrentStep(quizQuestions.length - 1);
    } finally {
      setIsSaving(false);
    }
  }

  async function getStoredToken() {
    if (Platform.OS === 'web') {
      return localStorage.getItem('eos-access-token');
    }

    return SecureStore.getItemAsync('eos-access-token');
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
        <Text style={styles.resultText}>{getCalculatingText()}</Text>
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
    backgroundColor: '#F8F9FA',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
    width: '100%'
  },
  progressFill: {
    backgroundColor: '#C98F90',
    borderRadius: 2,
    height: 4
  },
  title: {
    color: '#0B132B',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 30,
    marginTop: 40
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#0B132B',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
    width: '100%'
  },
  optionButtonSelected: {
    backgroundColor: '#EADCDC',
    borderColor: '#0B132B'
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
    color: '#0B132B',
    fontSize: 18,
    fontWeight: 'bold'
  },
  optionDescription: {
    color: '#6C757D',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  resultText: {
    color: '#0B132B',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center'
  }
});
