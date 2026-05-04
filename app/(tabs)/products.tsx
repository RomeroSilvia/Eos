import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProducts } from '@/hooks/useProducts';

export default function ProductsScreen() {
  const { products } = useProducts();

  if (products.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Nuevo Producto</Text>
          <Ionicons color={colors.textSecondary} name="notifications-outline" size={24} />
        </View>
        <Text style={styles.subtitle}>Cuidar tu piel cada día hace la diferencia</Text>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons color={colors.primary} name="bag-outline" size={64} />
          </View>
          <Text style={styles.emptyTitle}>Agregá un producto a{'\n'}tu rutina</Text>
          <Text style={styles.emptyDescription}>
            Personaliza tu rutina de cuidado facial según tus necesidades y objetivos.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button onPress={() => router.push('/products/new')} style={styles.button}>
            Comenzar
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis Productos</Text>
          <Ionicons color={colors.textSecondary} name="notifications-outline" size={24} />
        </View>
        {products.map((product) => (
          <Pressable
            key={product.id}
            onPress={() => router.push({ pathname: '/products/[id]', params: { id: product.id } })}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
          >
            <Card style={styles.product}>
              <View style={styles.thumbnail}>
                {product.image_url ? (
                  <Image source={{ uri: product.image_url }} style={styles.thumbnailImage} />
                ) : (
                  <Ionicons color={colors.primaryDark} name="sparkles-outline" size={22} />
                )}
              </View>
              <View style={styles.productText}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productMeta}>
                  {product.brand ?? 'Producto personal'} · {product.category}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
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
    paddingTop: 16
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingHorizontal: 20,
    paddingTop: 6
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 180,
    justifyContent: 'center',
    width: 180
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center'
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  footer: {
    padding: 20,
    paddingBottom: 32
  },
  button: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingVertical: 16
  },
  content: {
    gap: 12,
    padding: 20,
    paddingBottom: 116
  },
  product: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  thumbnail: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44
  },
  thumbnailImage: {
    height: 44,
    width: 44
  },
  productText: {
    flex: 1,
    gap: 3
  },
  productName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  productMeta: {
    color: colors.textSecondary,
    fontSize: 13
  }
});
