import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

export default function AddStep() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>

        <Text style={styles.title}>
          {section?.charAt(0).toUpperCase() + section?.slice(1)}
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