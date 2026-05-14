import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { apiConfig } from '@/services/api/client';
import { getAuthToken } from '@/services/auth';

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
    options: [{ label: '-25' }, { label: '25-30' }, { label: '35-45' }, { label: '+45' }],
  },
  {
    title: '¿Que tipo de piel tenes?',
    options: [
      { label: 'Normal', description: 'Ni demasiado seca ni demasiado grasa' },
      { label: 'Mixta', description: 'Combina piel grasa y piel seca' },
      { label: 'Seca', description: 'Aspera y tirante' },
      { label: 'Grasa', description: 'Sobreproduccion de cebo, brillo excesivo' },
    ],
  },
  {
    title: '¿Que tipo de imperfecciones tenes?',
    options: [
      { label: 'Manchas' },
      { label: 'Acne' },
      { label: 'Ojeras marcadas' },
      { label: 'Sin imperfecciones' },
    ],
  },
  {
    title: '¿Cual es tu principal objetivo?',
    options: [
      { label: 'Controlar el brillo y granitos' },
      { label: 'Reducir lineas de expresion' },
      { label: 'Hidratar y dar luminosidad' },
      { label: 'Unificar el tono' },
    ],
  },
  {
    title: '¿Cuantos pasos tiene tu rutina?',
    options: [
      { label: 'Tres pasos' },
      { label: 'Cinco pasos' },
      { label: 'Mas de diez pasos' },
      { label: 'No tengo rutina' },
    ],
  },
];

export default function QuizScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  function handleSelect(label: string) {
    if (isSaving) return;

    const nextAnswers = { ...answers, [currentStep]: label };
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
    setIsSaving(true);

    try {
      const token = await getAuthToken();

      if (!token) {
        Alert.alert('Error', 'No encontramos tu sesion. Inicia sesion nuevamente.');
        return;
      }

      const response = await fetch(`${apiConfig.baseUrl}/quiz/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ageRange: finalAnswers[0],
          skinType: finalAnswers[1],
          imperfections: finalAnswers[2],
          mainGoal: finalAnswers[3],
          routineSteps: finalAnswers[4],
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        Alert.alert('Error del Servidor', payload.message ?? 'No pudimos guardar tus respuestas.');
        return;
      }

      router.replace('/quiz-results');
    } catch (error) {
      console.error(error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el backend. Revisa tu consola.');
    } finally {
      setIsSaving(false);
    }
  }

  if (currentStep === 5) {
    return (
      <View style={styles.screen}>
        <Text style={styles.resultText}>Calculando resultados...</Text>
      </View>
    );
  }

  const question = quizQuestions[currentStep];
  const progress = `${((currentStep + 1) / quizQuestions.length) * 100}%` as DimensionValue;

  return (
    <View style={styles.screen}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress }]} />
      </View>

      <Text style={styles.title}>{question.title}</Text>

      <View>
        {question.options.map((option) => {
          const isSelected = answers[currentStep] === option.label;

          return (
            <Pressable
              key={option.label}
              disabled={isSaving}
              onPress={() => handleSelect(option.label)}
              style={[styles.option, isSelected ? styles.optionSelected : styles.optionDefault]}
            >
              <Image resizeMode="contain" source={require('@/assets/images/quiz-imagen.png')} style={styles.optionImage} />

              <View style={styles.optionTextContainer}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
              </View>
            </Pressable>
          );
        })}
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
  title: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 40,
  },
  option: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
  },
  optionDefault: {
    backgroundColor: 'transparent',
    borderColor: '#0B132B',
  },
  optionSelected: {
    backgroundColor: '#EADCDC',
    borderColor: '#0B132B',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  optionImage: {
    height: 32,
    width: 32,
  },
  optionLabel: {
    color: '#0B132B',
    fontSize: 20,
    fontWeight: 'bold',
  },
  optionDescription: {
    color: '#6C757D',
    fontSize: 12,
    marginTop: 4,
  },
  resultText: {
    color: '#0B132B',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
