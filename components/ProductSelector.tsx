import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { Product } from '@/types/product';

type Props = {
  products: Product[];
  selectedIds: string[];
  onSelect: (product: Product) => void;
};

function ProductSelectorBase({ products, selectedIds, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const available = useMemo(
    () => products.filter((product) => !selectedIdSet.has(product.id)),
    [products, selectedIdSet]
  );

  return (
    <View>
      <Pressable
        accessibilityLabel={open ? 'Cerrar selector de productos' : 'Abrir selector de productos'}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [styles.trigger, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={styles.triggerText}>Tus productos</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {open && (
        <View style={styles.dropdown}>
          {available.length === 0 ? (
            <Text style={styles.emptyText}>No hay más productos disponibles</Text>
          ) : (
            available.map((product) => (
              <Pressable
                accessibilityLabel={`Seleccionar producto ${product.name}`}
                accessibilityRole="button"
                key={product.id}
                onPress={() => {
                  onSelect(product);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.optionName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.optionMeta} numberOfLines={1}>
                  {product.brand ?? 'Producto personal'} · {product.category}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export const ProductSelector = memo(ProductSelectorBase);

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14
  },
  triggerText: {
    color: colors.textSecondary,
    fontSize: 15
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden'
  },
  option: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  optionName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  optionMeta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    padding: 14,
    textAlign: 'center'
  }
});
