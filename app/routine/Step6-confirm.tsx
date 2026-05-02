import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function Step6Confirm() {
  const router = useRouter();

  const [expanded, setExpanded] = useState({
    limpieza: true,
    hidratacion: false,
    proteccion: false
  });

  const toggle = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>

        <Text style={styles.title}>Nueva Rutina</Text>

        <View style={{ alignItems: 'center' }}>
          <Stepper current={4} />
        </View>

        <Text style={styles.section}>Confirmación</Text>
        <Text style={styles.question}>Resumen de tu rutina</Text>

        <ScrollView contentContainerStyle={styles.content}>

          <View style={styles.card}>

            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>Rutina piel luminosa</Text>

            <Text style={styles.label}>Objetivo</Text>
            <View style={styles.row}>
              <MaterialCommunityIcons name="white-balance-sunny" size={18} color={colors.primaryDark} />
              <Text style={styles.value}>Piel más luminosa</Text>
            </View>

            <Text style={styles.label}>Tipo de rutina</Text>
            <View style={styles.row}>
              <MaterialCommunityIcons name="weather-sunny" size={18} color={colors.primaryDark} />
              <Text style={styles.value}>Rutina matutina</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Pasos incluidos</Text>

            {/* LIMPIEZA */}
            <Pressable style={styles.sectionRow} onPress={() => toggle('limpieza')}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons name="spray-bottle" size={20} color={colors.surface} />
                </View>
                <Text style={styles.sectionTitle}>Limpieza</Text>
              </View>

              <MaterialCommunityIcons
                name={expanded.limpieza ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            {expanded.limpieza && (
              <View style={styles.steps}>
                <Text style={styles.step}>• Primer paso - Aceite de limpieza Skin1004</Text>
                <Text style={styles.step}>• Segundo paso - Gel de limpieza Cerave</Text>
              </View>
            )}

            {/* HIDRATACIÓN */}
            <Pressable style={styles.sectionRow} onPress={() => toggle('hidratacion')}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons name="water-outline" size={20} color={colors.surface} />
                </View>
                <Text style={styles.sectionTitle}>Hidratación</Text>
              </View>

              <MaterialCommunityIcons
                name={expanded.hidratacion ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            {/* PROTECCIÓN */}
            <Pressable style={styles.sectionRow} onPress={() => toggle('proteccion')}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons name="weather-sunny" size={20} color={colors.surface} />
                </View>
                <Text style={styles.sectionTitle}>Protección solar</Text>
              </View>

              <MaterialCommunityIcons
                name={expanded.proteccion ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

          </View>

        </ScrollView>

        <Pressable style={styles.editBtn}>
          <Text style={styles.editText}>Editar información</Text>
        </Pressable>

        <Pressable
            style={styles.button}
            onPress={() => router.push('/routine/success')}
            >
            <Text style={styles.buttonText}>Confirmar</Text>
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