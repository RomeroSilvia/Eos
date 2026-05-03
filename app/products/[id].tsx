import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProducts } from '@/hooks/useProducts';
import type { ProductCategory } from '@/types/product';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cleanser: 'Limpiador',
  toner: 'Tónico',
  serum: 'Sérum',
  moisturizer: 'Hidratante',
  sunscreen: 'Protector solar',
  other: 'Otro'
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products } = useProducts();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Producto no encontrado</Text>
          <Button onPress={() => router.push('/products')}>Volver</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/products')} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="chevron-back" size={18} />
          <Text style={styles.backText}>Volver atras</Text>
        </Pressable>
        <Ionicons color={colors.textSecondary} name="notifications-outline" size={24} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Detalle del Producto</Text>

        <Card style={styles.imageCard}>
          <View style={styles.imagePlaceholder}>
            <Ionicons color={colors.textMuted} name="image-outline" size={48} />
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.fieldLabel}>Nombre</Text>
          <Text style={styles.fieldValue}>{product.name}</Text>

          <Text style={styles.fieldLabel}>Marca</Text>
          <Text style={styles.fieldValue}>{product.brand ?? '—'}</Text>

          <Text style={styles.fieldLabel}>Categoría</Text>
          <Text style={styles.fieldValue}>{CATEGORY_LABELS[product.category]}</Text>

          <Text style={styles.fieldLabel}>Descripción</Text>
          <Text style={styles.fieldValue}>{product.description ?? '—'}</Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button onPress={() => {}} style={styles.editButton} textStyle={{ color: colors.secondary }} variant="ghost">
          Editar información
        </Button>
        <Button onPress={() => {}} style={styles.deleteButton} variant="secondary">
          Eliminar producto
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4
  },
  backBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 160
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900'
  },
  imageCard: {
    padding: 0,
    overflow: 'hidden'
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.border,
    height: 200,
    justifyContent: 'center'
  },
  infoCard: {
    gap: 4
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8
  },
  fieldValue: {
    color: colors.textSecondary,
    fontSize: 15
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    gap: 12,
    left: 0,
    padding: 20,
    paddingBottom: 36,
    position: 'absolute',
    right: 0
  },
  editButton: {
    borderColor: colors.secondary,
    borderWidth: 1
  },
  deleteButton: {},
  notFound: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center'
  },
  notFoundText: {
    color: colors.textSecondary,
    fontSize: 16
  }
});
