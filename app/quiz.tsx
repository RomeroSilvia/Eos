import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { apiConfig } from '@/services/api/client';

const AUTH_TOKEN_KEY = 'eos.auth.token';

const questions = [
  {
    question: '¿Que edad tenes?',
    options: ['-25', '25-30', '35-45', '+45'],
  },
  {
    question: '¿Que tipo de piel tenes?',
    options: ['Normal', 'Mixta', 'Seca', 'Grasa'],
  },
  {
    question: '¿Que tipo de imperfecciones tenes?',
    options: ['Manchas', 'Acné', 'Ojeras marcadas', 'Sin imperfecciones'],
  },
  {
    question: '¿Cual es tu principal objetivo?',
    options: [
      'Controlar el brillo y granitos',
      'Reducir lineas de expresión',
      'Hidratar y dar luminosidad',
      'Unificar el tono',
    ],
  },
  {
    question: '¿Cuantos pasos tiene tu rutina?',
    options: ['Tres pasos', 'Cinco pasos', 'Mas de diez pasos', 'No tengo rutina'],
  },
];

type Answers = Record<string, string>;

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export default function QuizScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  async function handleSaveQuiz() {
    try {
      const token = await getStoredItem(AUTH_TOKEN_KEY);

      if (!token) {
        throw new Error('No encontramos una sesion activa. Inicia sesion nuevamente.');
      }

      const response = await fetch(`${apiConfig.baseUrl}/quiz/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ageRange: answers.step0,
          skinType: answers.step1,
          imperfections: answers.step2,
          mainGoal: answers.step3,
          routineSteps: answers.step4,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos guardar tu perfil de piel.');
      }

      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No pudimos guardar tu perfil de piel.');
    }
  }

  if (currentStep === 5) {
    return (
      <View style={[styles.screen, styles.resultScreen]}>
        <View>
          <Text style={styles.resultText}>Pantalla de resultados (Pendiente)</Text>
        </View>

        <Pressable onPress={handleSaveQuiz} style={styles.finalButton}>
          <Text style={styles.finalButtonText}>Ver mi perfil</Text>
        </Pressable>
      </View>
    );
  }

  const currentQuestion = questions[currentStep];
  const progressWidth: DimensionValue = `${(currentStep / 5) * 100}%`;

  function handleSelect(option: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [`step${currentStep}`]: option,
    }));

    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 400);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <Text style={styles.questionTitle}>{currentQuestion.question}</Text>

      <View style={styles.optionsContainer}>
        {currentQuestion.options.map((option) => (
          <Pressable key={option} onPress={() => handleSelect(option)} style={styles.optionButton}>
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#C98F90',
    borderRadius: 2,
    height: 4,
  },
  questionTitle: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: 'bold',
    lineHeight: 38,
    marginBottom: 30,
    marginTop: 40,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    padding: 15,
    width: '100%',
  },
  optionText: {
    color: '#0B132B',
    fontSize: 16,
  },
  resultScreen: {
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  resultText: {
    color: '#0B132B',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center',
  },
  finalButton: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    width: '100%',
  },
  finalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
