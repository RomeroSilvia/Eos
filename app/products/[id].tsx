import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
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
  const { products, removeWithProtection, forceRemove, replaceAndRemove } = useProducts();
  const [isWorking, setIsWorking] = useState(false);
  const [conflict, setConflict] = useState<{
    affectedRoutines: { routineId: string; routineName: string; stepName: string }[];
  } | null>(null);
  const [selectedReplacementId, setSelectedReplacementId] = useState<string | null>(null);
  const { profile } = useProfile();
  const product = products.find((p) => p.id === id);
  const replacementCandidates = useMemo(
    () => products.filter((item) => item.id !== id),
    [id, products]
  );

  if (!products.length && !product) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Cargando producto...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  const handleEdit = () => {
    router.push({
      pathname: '/products/create',
      params: {
        productId: product.id,
        initialName: product.name,
        initialBrand: product.brand ?? '',
        initialCategory: product.category,
        initialDescription: product.description ?? '',
        initialImageUrl: product.image_url ?? '',
        ...(profile?.role === 'specialist' ? { returnTo: 'specialist-products' } : {}),
      },
    });
  };

  const handleDelete = () => {
    const onConfirm = () => {
      void (async () => {
        setIsWorking(true);

        try {
          const result = await removeWithProtection(id);

          if (result.status === 'deleted') {
            router.back();
            return;
          }

          setConflict(result.conflict);
          setSelectedReplacementId(replacementCandidates[0]?.id ?? null);
        } catch (error) {
          Alert.alert('Productos', error instanceof Error ? error.message : 'No pudimos eliminar el producto.');
        } finally {
          setIsWorking(false);
        }
      })();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Se eliminara "${product.name}". Esta accion no se puede deshacer.`)) {
        onConfirm();
      }
      return;
    }
    Alert.alert(
      'Eliminar producto',
      `Se eliminara "${product.name}". Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  };

  const handleForceRemove = () => {
    void (async () => {
      setIsWorking(true);

      try {
        await forceRemove(id);
        setConflict(null);
        router.back();
      } catch (error) {
        Alert.alert('Productos', error instanceof Error ? error.message : 'No pudimos quitar el producto.');
      } finally {
        setIsWorking(false);
      }
    })();
  };

  const handleReplaceAndRemove = () => {
    if (!selectedReplacementId) {
      Alert.alert('Productos', 'Elegi un producto para reemplazar.');
      return;
    }

    void (async () => {
      setIsWorking(true);

      try {
        await replaceAndRemove(id, selectedReplacementId);
        setConflict(null);
        router.back();
      } catch (error) {
        Alert.alert('Productos', error instanceof Error ? error.message : 'No pudimos reemplazar el producto.');
      } finally {
        setIsWorking(false);
      }
    })();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Productos" title="Detalle del producto" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Detalle del Producto</Text>

        <Card style={styles.imageCard}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons color={colors.textMuted} name="image-outline" size={48} />
            </View>
          )}
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
        <Button disabled={isWorking} onPress={handleEdit} style={styles.editButton} textStyle={{ color: colors.secondary }} variant="ghost">
          Editar información
        </Button>
        <Button disabled={isWorking} onPress={handleDelete} style={styles.deleteButton} variant="secondary">
          {isWorking ? 'Procesando...' : 'Eliminar producto'}
        </Button>
      </View>

      {conflict ? (
        <View style={styles.conflictOverlay}>
          <Card style={styles.conflictCard}>
            <Text style={styles.conflictTitle}>Este producto se usa en rutinas activas</Text>
            <Text style={styles.conflictDescription}>Elige como resolverlo antes de eliminar.</Text>

            <View style={styles.conflictList}>
              {conflict.affectedRoutines.map((item) => (
                <Text key={`${item.routineId}-${item.stepName}`} style={styles.conflictItemText}>
                  {`• ${item.routineName} (${item.stepName})`}
                </Text>
              ))}
            </View>

            <Text style={styles.conflictDescription}>Reemplazar por:</Text>
            <View style={styles.replacementList}>
              {replacementCandidates.map((candidate) => {
                const selected = selectedReplacementId === candidate.id;

                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => setSelectedReplacementId(candidate.id)}
                    style={[styles.replacementItem, selected && styles.replacementItemSelected]}
                  >
                    <Text style={[styles.replacementItemText, selected && styles.replacementItemTextSelected]}>
                      {candidate.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.conflictActions}>
              <Button disabled={isWorking} onPress={() => setConflict(null)} variant="ghost">
                Cancelar
              </Button>
              <Button disabled={isWorking} onPress={handleForceRemove} variant="secondary">
                Quitar de rutinas
              </Button>
              <Button disabled={isWorking || replacementCandidates.length === 0} onPress={handleReplaceAndRemove}>
                Reemplazar y eliminar
              </Button>
            </View>
          </Card>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
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
  productImage: {
    width: '100%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.border,
    aspectRatio: 1,
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
  conflictOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(11,19,43,0.45)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
    top: 0
  },
  conflictCard: {
    gap: 10,
    maxHeight: '80%',
    width: '100%'
  },
  conflictTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  conflictDescription: {
    color: colors.textSecondary,
    fontSize: 14
  },
  conflictList: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 10
  },
  conflictItemText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  replacementList: {
    gap: 8,
    maxHeight: 180
  },
  replacementItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  replacementItemSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  replacementItemText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  replacementItemTextSelected: {
    color: colors.primaryDark
  },
  conflictActions: {
    gap: 8,
    marginTop: 4
  },
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
