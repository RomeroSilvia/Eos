import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { getRoutineById, updateRoutine } from '@/services/routines';
import type { RoutineTimeOfDay } from '@/types/routine';

const routineTypes: Array<{
  value: RoutineTimeOfDay;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
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

  useEffect(() => {
    if (!routineId) return;

    const loadRoutine = async () => {
      try {
        const routine = await getRoutineById(routineId);

        setName(routine.name);
        setDescription(routine.description ?? '');
        setTimeOfDay(routine.time_of_day ?? 'morning');
      } catch (error) {
        console.error(error);
      }
    };

    void loadRoutine();
  }, [routineId]);

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
      <View style={styles.container}>
        <Text style={styles.title}>Editar rutina</Text>

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

  button: {
    marginTop: 'auto',
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
