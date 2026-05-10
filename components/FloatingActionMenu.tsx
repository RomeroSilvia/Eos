import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

const tabBarHeight = 76;
const fabSize = 60;
const fabRight = 24;
const fabGapAboveTabBar = 16;
const menuGap = 12;

export function FloatingActionMenu() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const fabBottom = insets.bottom + tabBarHeight + fabGapAboveTabBar;
  const menuBottom = fabBottom + fabSize + menuGap;

  function closeMenu() {
    setIsOpen(false);
  }

  function handleAddProduct() {
    closeMenu();
    // TODO: Navigate to /products/create when that route exists.
  }

  function handleAddRoutine() {
    closeMenu();
    router.push('/routine/Create');
  }

  return (
    <View pointerEvents={isOpen ? 'auto' : 'box-none'} style={styles.overlay}>
      {isOpen ? <Pressable accessibilityLabel="Cerrar menu de acciones" onPress={closeMenu} style={styles.backdrop} /> : null}

      {isOpen ? (
        <View style={[styles.menu, { bottom: menuBottom }]}>
          <ActionMenuItem icon="bag-add-outline" label="Agregar Producto" onPress={handleAddProduct} />
          <View style={styles.separator} />
          <ActionMenuItem icon="leaf-outline" label="Agregar Rutina" onPress={handleAddRoutine} />
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={isOpen ? 'Cerrar acciones rapidas' : 'Abrir acciones rapidas'}
        accessibilityRole="button"
        onPress={() => setIsOpen((current) => !current)}
        style={({ pressed }) => [styles.fab, { bottom: fabBottom }, pressed && styles.pressed]}
      >
        <Ionicons color={colors.surface} name={isOpen ? 'close' : 'add'} size={32} />
      </Pressable>
    </View>
  );
}

function ActionMenuItem({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.itemPressed]}>
      <View style={styles.itemIcon}>
        <Ionicons color={colors.primaryDark} name={icon} size={20} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent'
  },
  menu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 8,
    minWidth: 214,
    overflow: 'hidden',
    position: 'absolute',
    right: fabRight,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14
  },
  itemPressed: {
    backgroundColor: colors.surfaceSoft
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 15,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  itemLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800'
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
    marginLeft: 60
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.background,
    borderRadius: fabSize / 2,
    borderWidth: 4,
    elevation: 9,
    height: fabSize,
    justifyContent: 'center',
    position: 'absolute',
    right: fabRight,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    width: fabSize
  },
  pressed: {
    transform: [{ scale: 0.96 }]
  }
});
