import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { RoutineSectionCard } from '@/components/RoutineSectionCard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getStepsByRoutine } from '@/services/routines';
import { AppHeader } from '@/components/navigation/AppHeader';

type SectionItem = {
  id: string;
  nombre: string;
  producto: string;
};

type Sections = {
  limpieza: SectionItem[];
  tratamientos: SectionItem[];
  hidratacion: SectionItem[];
  proteccion: SectionItem[];
  complementario: SectionItem[];
};

export default function Step4() {
  const router = useRouter();
  const { routineId, assignClientId } = useLocalSearchParams<{ routineId: string; assignClientId?: string }>();

  const [sections, setSections] = useState<Sections>({
    limpieza: [],
    tratamientos: [],
    hidratacion: [],
    proteccion: [],
    complementario: []
  });

  useFocusEffect(useCallback(() => {
    if (!routineId) return;

    const fetchSteps = async () => {
      try {
        const steps = await getStepsByRoutine(routineId);

        const grouped: Sections = {
          limpieza: [],
          tratamientos: [],
          hidratacion: [],
          proteccion: [],
          complementario: []
        };

        steps.forEach((step) => {
          const category = (step.category ?? 'complementario') as keyof Sections;

          if (!grouped[category]) return;

          grouped[category].push({
            id: step.id,
            nombre: step.name ?? 'Paso',
            producto: step.description ?? ''
          });
        });

        setSections(grouped);
      } catch (e) {
        console.error(e);
      }
    };

    fetchSteps();
  }, [routineId]));

  const goToAddStep = (section: string) => {
    router.push({
      pathname: '/routine/Add-step',
      params: assignClientId ? { section, routineId, assignClientId } : { section, routineId }
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb={assignClientId ? 'Pacientes / Rutinas' : 'Rutinas'} title="Nueva rutina" />
      <View style={styles.container}>
        <View style={{ alignItems: 'center' }}>
          <Stepper current={4} />
        </View>

        <Text style={styles.section}>Pasos de la rutina</Text>

        <Text style={styles.question}>
          ¿Qué pasos quieres incluir?
        </Text>

        <Text style={styles.desc}>
          Organiza los pasos de tu rutina por categorías.{"\n"}
          Puedes añadir más de un producto o paso dentro de cada sección.
        </Text>

        <ScrollView contentContainerStyle={styles.list}>
          <RoutineSectionCard
            title="Limpieza"
            description="Elimina impurezas y prepara la piel"
            icon="spray-bottle"
            steps={sections.limpieza}
            onAddStep={() => goToAddStep('limpieza')}
          />

          <RoutineSectionCard
            title="Tratamientos"
            description="Activos específicos según tus objetivos."
            icon="eyedropper"
            steps={sections.tratamientos}
            onAddStep={() => goToAddStep('tratamientos')}
          />

          <RoutineSectionCard
            title="Hidratación"
            description="Ayuda a mantener la barrera cutánea."
            icon="water-outline"
            steps={sections.hidratacion}
            onAddStep={() => goToAddStep('hidratacion')}
          />

          <RoutineSectionCard
            title="Protección solar"
            description=""
            icon="weather-sunny"
            steps={sections.proteccion}
            onAddStep={() => goToAddStep('proteccion')}
          />

          <RoutineSectionCard
            title="Cuidado complementario"
            description="Pasos opcionales o de uso semanal para completar tu rutina."
            icon="face-mask"
            steps={sections.complementario}
            onAddStep={() => goToAddStep('complementario')}
          />
        </ScrollView>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({
              pathname: '/routine/Step6-confirm',
              params: assignClientId ? { routineId, assignClientId } : { routineId }
            })
          }
        >
          <Text style={styles.buttonText}>Continuar</Text>
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

  desc: {
    marginTop: 6,
    color: colors.textSecondary,
    lineHeight: 18
  },

  list: {
    marginTop: 16,
    gap: 14,
    paddingBottom: 120
  },

  button: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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
