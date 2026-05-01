import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';

export function FloatingActionMenu() {
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        accessibilityLabel="Abrir acciones rapidas"
        accessibilityRole="button"
        onPress={() => router.push('/routine')}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons color={colors.surface} name="add" size={34} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    bottom: 24,
    left: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.background,
    borderRadius: 34,
    borderWidth: 5,
    height: 68,
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: 68
  },
  pressed: {
    transform: [{ scale: 0.96 }]
  }
});
