import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>

        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <MaterialCommunityIcons name="check" size={48} color={colors.surface} />
          </View>
        </View>

        <Text style={styles.title}>¡Rutina creada con éxito!</Text>

        <Text style={styles.subtitle}>
          Tu nueva rutina ha sido creada correctamente.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rutina piel luminosa</Text>

          <View style={styles.row}>
            <MaterialCommunityIcons name="weather-sunny" size={18} color={colors.primaryDark} />
            <Text style={styles.cardText}>Rutina matutina</Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="format-list-numbered" size={18} color={colors.primaryDark} />
            <Text style={styles.cardText}>3 pasos</Text>
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/routine')}
        >
          <Text style={styles.buttonText}>Ver mi rutina</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },

  iconOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  },

  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center'
  },

  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center'
  },

  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border
  },

  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.textPrimary
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },

  cardText: {
    color: colors.textSecondary
  },

  button: {
    marginTop: 20,
    width: '100%',
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