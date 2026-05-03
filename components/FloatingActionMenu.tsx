import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';

const ROUTE_MAP: Record<string, string> = {
  '/home':     '/routine/newRoutine',
  '/routine':  '/routine/newRoutine',
  '/products': '/products/newProduct',
  '/progress': '/routine/newRoutine',
  '/profile':  '/profile/editProfile',
};

export function FloatingActionMenu() {
  const pathname = usePathname();

  const handlePress = () => {
    const route = ROUTE_MAP[pathname] ?? '/routine/newRoutine';
    router.push(route as never);
  }

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        accessibilityLabel="Abrir acciones rapidas"
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons color={colors.surface} name="add" size={25} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    bottom: 60,
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
    height: 40,
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: 40
  },
  pressed: {
    transform: [{ scale: 0.96 }]
  }
});
