import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProducts } from '@/hooks/useProducts';

export default function ProductsScreen() {
  const { products } = useProducts();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Productos</Text>
        {products.map((product) => (
          <Card key={product.id} style={styles.product}>
            <View style={styles.icon}>
              <Ionicons color={colors.primaryDark} name="sparkles-outline" size={22} />
            </View>
            <View style={styles.productText}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productMeta}>{product.brand ?? 'Producto personal'} · {product.category}</Text>
            </View>
          </Card>
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
  content: {
    gap: 12,
    padding: 20,
    paddingBottom: 116
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    paddingBottom: 8,
    paddingTop: 8
  },
  product: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
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
