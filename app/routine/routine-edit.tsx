import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { AppHeader } from '@/components/navigation/AppHeader';
import { getRoutineById, updateRoutine } from '@/services/routines';
import type { RoutineTimeOfDay } from '@/types/routine';

const routineTypes: {
  value: RoutineTimeOfDay;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: 'morning', label: 'Matutina', icon: 'weather-sunset-up' },
  { value: 'night', label: 'Nocturna', icon: 'weather-night' },
  { value: 'custom', label: 'Personalizada', icon: 'calendar-star' }
];

export default function RoutineEdit() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<RoutineTimeOfDay>('morning');
  const [isSaving, setIsSaving] = useState(false);

  const loadRoutine = useCallback(async () => {
    if (!routineId) return;

    try {
      const routine = await getRoutineById(routineId);

      setName(routine.name);
      setDescription(routine.description ?? '');
      setTimeOfDay(routine.time_of_day ?? 'morning');
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

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Rutinas" title="Editar rutina" />
      <View style={styles.container}>
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

        <Pressable
          onPress={() => {
            if (routineId) {
              router.push({
                pathname: '/routine/Step4',
                params: { routineId }
              });
            }
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Agregar pasos</Text>
        </Pressable>

        <Pressable
          disabled={!canSave}
          onPress={handleSave}
          style={[styles.button, !canSave && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</Text>
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

  secondaryButton: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },

  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
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
