import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { getRoutineById } from '@/services/routines';
import type { Routine, RoutineStep, RoutineTimeOfDay } from '@/types/routine';

type SectionKey = 'limpieza' | 'tratamientos' | 'hidratacion' | 'proteccion' | 'complementario';

const sections: {
  key: SectionKey;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: 'limpieza', title: 'Limpieza', icon: 'spray-bottle' },
  { key: 'tratamientos', title: 'Tratamientos', icon: 'eyedropper' },
  { key: 'hidratacion', title: 'Hidratacion', icon: 'water-outline' },
  { key: 'proteccion', title: 'Proteccion solar', icon: 'weather-sunny' },
  { key: 'complementario', title: 'Cuidado complementario', icon: 'face-mask' }
];

export default function Step6Confirm() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    limpieza: true,
    tratamientos: false,
    hidratacion: false,
    proteccion: false,
    complementario: false
  });

  useEffect(() => {
    if (!routineId) return;

    getRoutineById(routineId)
      .then(setRoutine)
      .catch((error) => console.error(error));
  }, [routineId]);

  const groupedSteps = useMemo(() => {
    const grouped = sections.reduce<Record<SectionKey, RoutineStep[]>>((acc, section) => {
      acc[section.key] = [];
      return acc;
    }, {} as Record<SectionKey, RoutineStep[]>);

    const steps = routine?.routine_steps ?? [];

    steps.forEach((step) => {
      const key = getSectionKey(step.category);
      grouped[key].push(step);
    });

    return grouped;
  }, [routine]);

  const toggle = (key: SectionKey) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Nueva Rutina</Text>

        <View style={{ alignItems: 'center' }}>
          <Stepper current={4} />
        </View>

        <Text style={styles.section}>Confirmacion</Text>
        <Text style={styles.question}>Resumen de tu rutina</Text>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{routine?.name ?? 'Cargando...'}</Text>

            <Text style={styles.label}>Objetivo</Text>
            <Text style={styles.value}>{routine?.description ?? 'Sin objetivo definido'}</Text>

            <Text style={styles.label}>Tipo de rutina</Text>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name={routine?.time_of_day === 'night' ? 'weather-night' : 'weather-sunny'}
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.value}>{getRoutineTimeLabel(routine?.time_of_day)}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Pasos incluidos</Text>

            {sections.map((section) => {
              const steps = groupedSteps[section.key];

              if (steps.length === 0) return null;

              return (
                <View key={section.key}>
                  <Pressable style={styles.sectionRow} onPress={() => toggle(section.key)}>
                    <View style={styles.row}>
                      <View style={styles.icon}>
                        <MaterialCommunityIcons name={section.icon} size={20} color={colors.surface} />
                      </View>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                    </View>

                    <MaterialCommunityIcons
                      name={expanded[section.key] ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>

                  {expanded[section.key] && (
                    <View style={styles.steps}>
                      {steps.map((step) => (
                        <Text key={step.id} style={styles.step}>
                          {step.step_order}. {step.name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Pressable
          style={styles.editBtn}
          onPress={() =>
            router.push({
              pathname: '/routine/Step4',
              params: { routineId }
            })
          }
        >
          <Text style={styles.editText}>Editar pasos</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({
              pathname: '/routine/success',
              params: { routineId }
            })
          }
        >
          <Text style={styles.buttonText}>Confirmar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function getSectionKey(category: string | null): SectionKey {
  if (category === 'limpieza') return 'limpieza';
  if (category === 'tratamientos') return 'tratamientos';
  if (category === 'hidratacion') return 'hidratacion';
  if (category === 'proteccion') return 'proteccion';

  return 'complementario';
}

function getRoutineTimeLabel(timeOfDay?: RoutineTimeOfDay | null) {
  if (timeOfDay === 'morning') return 'Rutina matutina';
  if (timeOfDay === 'night') return 'Rutina nocturna';
  if (timeOfDay === 'custom') return 'Rutina personalizada';

  return 'Sin tipo definido';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    padding: 20
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary
  },

  section: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary
  },

  question: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4
  },

  content: {
    marginTop: 16,
    paddingBottom: 120
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10
  },

  label: {
    fontWeight: '700',
    color: colors.textPrimary
  },

  value: {
    color: colors.textSecondary,
    marginBottom: 6
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10
  },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },

  sectionTitle: {
    fontWeight: '700',
    color: colors.textPrimary
  },

  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },

  steps: {
    backgroundColor: colors.surfaceSoft,
    padding: 10,
    borderRadius: 10,
    marginTop: 6
  },

  step: {
    color: colors.textSecondary,
    marginBottom: 4
  },

  editBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },

  editText: {
    color: colors.secondary,
    fontWeight: '600'
  },

  button: {
    marginTop: 10,
    backgroundColor: colors.secondary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },

  buttonText: {
    color: colors.surface,
    fontWeight: '700'
  }
});
