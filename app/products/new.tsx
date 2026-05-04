import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { useProducts } from '@/hooks/useProducts';
import type { ProductCategory, ProductBrand } from '@/types/product';

const CATEGORIES: { label: string; value: ProductCategory }[] = [
  { label: 'Limpiador', value: 'cleanser' },
  { label: 'Tónico', value: 'toner' },
  { label: 'Sérum', value: 'serum' },
  { label: 'Hidratante', value: 'moisturizer' },
  { label: 'Protector solar', value: 'sunscreen' },
  { label: 'Otro', value: 'other' }
];

const BRANDS: { label: string; value: ProductBrand }[] = [
  { label: 'Cerave', value: 'Cerave' },
  { label: 'L\'Oreal', value: 'L´Oreal' },
  { label: 'The Ordinary', value: 'The Ordinary' },
  { label: 'Otra', value: 'other' }
];

export default function NewProductScreen() {
  const { createProduct } = useProducts();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('other');
  const [brand, setBrand] = useState<ProductBrand>('other');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[handlePickImage]', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createProduct({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        brand,
        imageUri: imageUri ?? undefined,
      });
      router.replace('/products/result?status=success');
    } catch {
      router.replace('/products/result?status=error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent presentationStyle="pageSheet">
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Nuevo producto</Text>
              <Pressable onPress={() => router.replace('/(tabs)/products')} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Nombre del producto</Text>
            <TextInput
              onChangeText={setName}
              placeholder="Gentle cleanser Cerave"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={name}
            />

            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={setDescription}
              placeholder="Describe el producto o lo que veas relevante"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textarea]}
              value={description}
            />

            <Text style={styles.label}>Marca</Text>
            <View style={styles.categories}>
              {BRANDS.map((br) => (
                <Pressable
                  key={br.value}
                  onPress={() => setBrand(br.value)}
                  style={[styles.chip, brand === br.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, brand === br.value && styles.chipTextActive]}>
                    {br.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Categoría</Text>
            <View style={styles.categories}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[styles.chip, category === cat.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, category === cat.value && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={handlePickImage} style={styles.photoBox}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoPlaceholder}>🖼</Text>
                  <Text style={styles.photoLabel}>Foto del producto</Text>
                </>
              )}
            </Pressable>

            <Button
              onPress={handleSave}
              style={{ ...styles.button, ...( (!name.trim() || loading) && styles.buttonDisabled ) }}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  content: {
    gap: 8,
    padding: 24,
    paddingBottom: 40
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    padding: 14
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top'
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  chip: {
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  chipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  chipTextActive: {
    color: colors.surface
  },
  photoBox: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 120,
    overflow: 'hidden',
    gap: 8,
  },
  photoPreview: {
    height: 200,
    width: '100%'
  },
  photoPlaceholder: {
    fontSize: 36
  },
  photoLabel: {
    color: colors.textMuted,
    fontSize: 13
  },
  button: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    marginTop: 16,
    paddingVertical: 16
  },
  buttonDisabled: {
    opacity: 0.5
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  }
});
