import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { createStep, getStepsByRoutine, updateStep } from '@/services/routines';

export default function AddStep() {
  const router = useRouter();
  const { section, routineId, stepId } = useLocalSearchParams<{
    section: string;
    routineId: string;
    stepId?: string;
  }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const isEditing = typeof stepId === 'string' && stepId.length > 0;

  useEffect(() => {
    if (!routineId || !isEditing) return;

    const loadStep = async () => {
      try {
        const steps = await getStepsByRoutine(routineId);
        const currentStep = steps.find((step) => step.id === stepId);

        if (!currentStep) return;

        setName(currentStep.name);
        setDescription(currentStep.description ?? '');
      } catch (e) {
        console.error(e);
      }
    };

    void loadStep();
  }, [isEditing, routineId, stepId]);

  const handleSave = async () => {
    try {
      if (!routineId || !name.trim()) return;

      if (isEditing) {
        await updateStep(stepId, {
          name: name.trim(),
          description: description || null,
          category: section
        });

        router.back();
        return;
      }

      const existingSteps = await getStepsByRoutine(routineId);
      const sectionSteps = existingSteps.filter((step) => step.category === section);
      const nextOrder =
        Math.max(0, ...sectionSteps.map((step) => step.step_order ?? 0)) + 1;

      await createStep({
        routine_id: routineId,
        name: name.trim(),
        description: description || null,
        category: section,
        step_order: nextOrder
      });

      router.back();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>

        <Text style={styles.title}>
          {isEditing ? 'Editar paso' : section?.charAt(0).toUpperCase() + section?.slice(1)}
        </Text>

        <Text style={styles.label}>Nombre del paso</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Limpieza simple"
          style={styles.input}
        />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe el paso o lo que veas relevante"
          style={[styles.input, styles.textarea]}
          multiline
        />

        <Pressable
          onPress={handleSave}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Guardar</Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 14
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },

  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },

  textarea: {
    height: 120,
    textAlignVertical: 'top'
  },

  button: {
    marginTop: 'auto',
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },

  buttonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16
  }
});
