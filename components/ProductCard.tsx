import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { Product } from '@/types/product';

type Props = {
  product: Product;
  onRemove: (id: string) => void;
};

export function ProductCard({ product, onRemove }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.thumbnail}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.thumbnailImage} />
        ) : (
          <Ionicons color={colors.primaryDark} name="sparkles-outline" size={18} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {product.brand ?? 'Producto personal'} · {product.category}
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(product.id)}
        accessibilityLabel={`Quitar producto ${product.name}`}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="trash-outline" size={20} color={colors.error} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10
  },
  thumbnail: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 38
  },
  thumbnailImage: {
    height: 38,
    width: 38
  },
  info: {
    flex: 1,
    gap: 2
  },
  name: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  removeBtn: {
    padding: 2
  }
});
