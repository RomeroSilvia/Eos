import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { updateRoutine } from '@/services/routines';

export default function Step3() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();

  const [type, setType] = useState<'mañana' | 'noche'>('mañana');
  const [reminder, setReminder] = useState(false);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Nueva Rutina</Text>

        <View style={{ alignItems: 'center' }}>
          <Stepper current={3} />
        </View>

        <Text style={styles.section}>Tipo de rutina</Text>

        <Text style={styles.question}>
          ¿Cuándo quieres usar esta rutina?
        </Text>

        <Pressable
          onPress={() => setType('mañana')}
          style={[styles.card, type === 'mañana' && styles.cardActive]}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.icon, styles.iconActive]}>
              <MaterialCommunityIcons name="weather-sunset-up" size={26} color={colors.surface} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Rutina matutina</Text>
              <Text style={styles.cardDesc}>
                Para proteger y preparar tu piel durante el día
              </Text>
            </View>
          </View>

          {type === 'mañana' && (
            <View style={styles.checkAbsolute}>
              <MaterialCommunityIcons name="check" size={16} color={colors.surface} />
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => setType('noche')}
          style={[styles.card, type === 'noche' && styles.cardActive]}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.icon, styles.iconActive]}>
              <MaterialCommunityIcons name="weather-night" size={26} color={colors.surface} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Rutina nocturna</Text>
              <Text style={styles.cardDesc}>
                Para reparar y renovar tu piel durante la noche
              </Text>
            </View>
          </View>

          {type === 'noche' && (
            <View style={styles.checkAbsolute}>
              <MaterialCommunityIcons name="check" size={16} color={colors.surface} />
            </View>
          )}
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={async () => {
            if (!routineId || typeof routineId !== 'string') return;

            try {
              await updateRoutine(routineId as string, {
                time_of_day: type === 'mañana' ? 'morning' : 'night'
              });
            } catch (e) {
              console.error(e);
            }

            router.push(`/routine/Step4?routineId=${routineId}`);
          }}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  section: { marginTop: 12, color: colors.textSecondary, fontSize: 13 },
  question: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    position: 'relative'
  },
  cardActive: { borderColor: colors.primaryDark },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  textContainer: { flex: 1 },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconActive: { backgroundColor: colors.secondaryLight },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardDesc: { color: colors.textSecondary, fontSize: 13 },
  checkAbsolute: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    marginTop: 'auto',
    backgroundColor: colors.secondary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: { color: colors.surface, fontWeight: '700' }
});