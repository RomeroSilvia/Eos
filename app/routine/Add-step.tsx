import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { createStep, getStepProducts, getStepsByRoutine, setStepProducts, updateStep } from '@/services/routines';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { ProductSelector } from '@/components/ProductSelector';
import type { Product } from '@/types/product';

export default function AddStep() {
  const router = useRouter();
  const { section, routineId, stepId } = useLocalSearchParams<{
    section: string;
    routineId: string;
    stepId?: string;
  }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const isEditing = typeof stepId === 'string' && stepId.length > 0;

  const { products, refreshProducts } = useProducts();

  useFocusEffect(
    useCallback(() => {
      void refreshProducts();
    }, [refreshProducts])
  );

  useEffect(() => {
    if (!routineId || !isEditing) return;

    const loadStep = async () => {
      try {
        const [steps, existingProducts] = await Promise.all([
          getStepsByRoutine(routineId),
          getStepProducts(stepId)
        ]);

        const currentStep = steps.find((step) => step.id === stepId);
        if (!currentStep) return;

        setName(currentStep.name);
        setDescription(currentStep.description ?? '');
        setSelectedProducts(existingProducts);
      } catch (e) {
        console.error(e);
      }
    };

    void loadStep();
  }, [isEditing, routineId, stepId]);

  const handleSave = async () => {
    try {
      if (!routineId || !name.trim()) return;

      const productIds = selectedProducts.map((p) => p.id);

      if (isEditing) {
        await updateStep(stepId, {
          name: name.trim(),
          description: description || null,
          category: section
        });
        await setStepProducts(stepId, productIds);
        router.back();
        return;
      }

      const existingSteps = await getStepsByRoutine(routineId);
      const sectionSteps = existingSteps.filter((step) => step.category === section);
      const nextOrder =
        Math.max(0, ...sectionSteps.map((step) => step.step_order ?? 0)) + 1;

      const newStep = await createStep({
        routine_id: routineId,
        name: name.trim(),
        description: description || null,
        category: section,
        step_order: nextOrder
      });

      await setStepProducts(newStep.id, productIds);
      router.back();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProducts((prev) => [...prev, product]);
  };

  const handleRemoveProduct = (id: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {isEditing ? 'Editar paso' : section?.charAt(0).toUpperCase() + section?.slice(1)}
        </Text>

        <Text style={styles.label}>Nombre del paso</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Limpieza simple"
          style={styles.input}
        />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe el paso o lo que veas relevante"
          style={[styles.input, styles.textarea]}
          multiline
        />

        <Text style={styles.label}>Producto</Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.infoText}>
            Agrega los productos que uses en cada paso. Puedes hacerlo ahora o más tarde desde los detalles de la rutina.
          </Text>
        </View>

        {selectedProducts.map((product) => (
          <ProductCard key={product.id} product={product} onRemove={handleRemoveProduct} />
        ))}

        <ProductSelector
          products={products}
          selectedIds={selectedProducts.map((p) => p.id)}
          onSelect={handleSelectProduct}
        />

        <Pressable
          onPress={() => router.push('/products/create?returnTo=add-step')}
          style={({ pressed }) => [styles.outlineButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.outlineButtonText}>+ Agregar producto</Text>
        </Pressable>

        <Pressable
          onPress={handleSave}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Guardar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 40
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top'
  },
  infoBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 14
  },
  infoText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  outlineButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700'
  },
  button: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16
  }
});
