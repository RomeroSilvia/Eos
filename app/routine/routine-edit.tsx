import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { AppHeader } from '@/components/navigation/AppHeader';
import { RoutineSectionCard } from '@/components/RoutineSectionCard';
import { deleteStep as deleteStepApi, getRoutineById, getStepsByRoutine, updateRoutine } from '@/services/routines';
import type { RoutineStep, RoutineTimeOfDay } from '@/types/routine';

const routineTypes: {
  value: RoutineTimeOfDay;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: 'morning', label: 'Matutina', icon: 'weather-sunset-up' },
  { value: 'night', label: 'Nocturna', icon: 'weather-night' },
  { value: 'custom', label: 'Personalizada', icon: 'calendar-star' }
];

type SectionKey = 'limpieza' | 'tratamientos' | 'hidratacion' | 'proteccion' | 'complementario';

type SectionConfig = {
  key: SectionKey;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const sections: SectionConfig[] = [
  {
    key: 'limpieza',
    title: 'Limpieza',
    description: 'Elimina impurezas y prepara la piel',
    icon: 'spray-bottle'
  },
  {
    key: 'tratamientos',
    title: 'Tratamientos',
    description: 'Activos especificos segun tus objetivos.',
    icon: 'eyedropper'
  },
  {
    key: 'hidratacion',
    title: 'Hidratacion',
    description: 'Ayuda a mantener la barrera cutanea.',
    icon: 'water-outline'
  },
  {
    key: 'proteccion',
    title: 'Proteccion solar',
    description: 'Cuidado diario para proteger la piel.',
    icon: 'weather-sunny'
  },
  {
    key: 'complementario',
    title: 'Cuidado complementario',
    description: 'Pasos opcionales o de uso semanal para completar tu rutina.',
    icon: 'face-mask'
  }
];

export default function RoutineEdit() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<RoutineTimeOfDay>('morning');
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [isAssignedRoutine, setIsAssignedRoutine] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadRoutine = useCallback(async () => {
    if (!routineId) return;

    try {
      const [routine, routineSteps] = await Promise.all([
        getRoutineById(routineId),
        getStepsByRoutine(routineId)
      ]);

      setName(routine.name);
      setDescription(routine.description ?? '');
      setTimeOfDay(routine.time_of_day ?? 'morning');
      setIsAssignedRoutine(Boolean(routine.assigned_by));
      setSteps(routineSteps);
    } catch (error) {
      console.error(error);
    }
  }, [routineId]);

  useFocusEffect(
    useCallback(() => {
      void loadRoutine();
    }, [loadRoutine])
  );

  const canSave = name.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!routineId || !canSave) return;

    try {
      setIsSaving(true);
      await updateRoutine(routineId, {
        name: name.trim(),
        description: description.trim() || null,
        time_of_day: timeOfDay
      });

      router.back();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const groupedSteps = sections.reduce<Record<SectionKey, RoutineStep[]>>((acc, section) => {
    acc[section.key] = steps
      .filter((step) => getSectionKey(step.category) === section.key)
      .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
    return acc;
  }, {} as Record<SectionKey, RoutineStep[]>);

  const goToAddStep = useCallback((section: SectionKey) => {
    if (!routineId || isAssignedRoutine) return;

    router.push({
      pathname: '/routine/Add-step',
      params: { routineId, section }
    });
  }, [isAssignedRoutine, routineId, router]);

  const editStep = useCallback((stepId: string, section: string) => {
    if (!routineId || isAssignedRoutine) return;

    router.push({
      pathname: '/routine/Add-step',
      params: { routineId, stepId, section }
    });
  }, [isAssignedRoutine, routineId, router]);

  const deleteStep = useCallback(async (stepId: string) => {
    if (!routineId || isAssignedRoutine) return;

    const previousSteps = steps;
    setSteps((current) => current.filter((step) => step.id !== stepId));

    try {
      await deleteStepApi(stepId);
      setSteps(await getStepsByRoutine(routineId));
    } catch (error) {
      console.error(error);
      setSteps(previousSteps);
    }
  }, [isAssignedRoutine, routineId, steps]);

  const confirmDeleteStep = useCallback((stepId: string) => {
    const step = steps.find((item) => item.id === stepId);
    const stepName = step?.name ?? 'este paso';

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Eliminar "${stepName}"? Esta accion no se puede deshacer.`);
      if (confirmed) {
        void deleteStep(stepId);
      }
      return;
    }

    Alert.alert(
      'Eliminar paso',
      `Se eliminara "${stepName}". Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deleteStep(stepId)
        }
      ]
    );
  }, [deleteStep, steps]);

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Rutinas" title="Editar rutina" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la rutina"
          style={styles.input}
        />

        <Text style={styles.label}>Objetivo</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Objetivo o descripcion"
          style={[styles.input, styles.textarea]}
          multiline
        />

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.typeList}>
          {routineTypes.map((type) => {
            const selected = type.value === timeOfDay;

            return (
              <Pressable
                key={type.value}
                onPress={() => setTimeOfDay(type.value)}
                style={[styles.typeItem, selected && styles.typeItemActive]}
              >
                <MaterialCommunityIcons
                  name={type.icon}
                  size={22}
                  color={selected ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[styles.typeText, selected && styles.typeTextActive]}>
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stepsHeader}>
          <Text style={styles.sectionTitle}>Pasos de la rutina</Text>
          {isAssignedRoutine ? (
            <Text style={styles.assignedHint}>La estructura asignada por especialista no se puede modificar.</Text>
          ) : null}
        </View>

        <View style={styles.stepSections}>
          {sections.map((section) => (
            <RoutineSectionCard
              key={section.key}
              title={section.title}
              description={section.description}
              icon={section.icon}
              steps={groupedSteps[section.key].map((step) => ({
                id: step.id,
                nombre: step.name,
                producto: step.description ?? '',
                category: section.key
              }))}
              onAddStep={isAssignedRoutine ? undefined : () => goToAddStep(section.key)}
              onEditStep={isAssignedRoutine ? undefined : editStep}
              onDeleteStep={isAssignedRoutine ? undefined : confirmDeleteStep}
            />
          ))}
        </View>

        <Pressable
          disabled={!canSave}
          onPress={handleSave}
          style={[styles.button, !canSave && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function getSectionKey(category?: string | null): SectionKey {
  if (category === 'limpieza') return 'limpieza';
  if (category === 'tratamientos') return 'tratamientos';
  if (category === 'hidratacion') return 'hidratacion';
  if (category === 'proteccion') return 'proteccion';

  return 'complementario';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    padding: 20,
    gap: 14,
    paddingBottom: 48
  },

  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8
  },

  label: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },

  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    padding: 14
  },

  textarea: {
    height: 110,
    textAlignVertical: 'top'
  },

  typeList: {
    gap: 10
  },

  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14
  },

  typeItemActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight
  },

  typeText: {
    color: colors.textSecondary,
    fontWeight: '600'
  },

  typeTextActive: {
    color: colors.textPrimary
  },

  stepsHeader: {
    gap: 4,
    marginTop: 10
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },

  assignedHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },

  stepSections: {
    gap: 12
  },

  button: {
    marginTop: 14,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },

  buttonDisabled: {
    opacity: 0.5
  },

  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700'
  }
});
