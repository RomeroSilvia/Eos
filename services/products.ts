import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Product, ProductCategory, ProductBrand } from '@/types/product';
import { apiConfig, apiRequest } from '@/services/api/client';

export type ProductImagePayload = {
  imageUri?: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageFilename?: string;
};

function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function getFilename(uri: string): string {
  const base = uri.split('/').pop() ?? 'product.jpg';
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : 'jpg';
  const normalizedExt = ext === 'jpeg' ? 'jpg' : (['jpg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg');
  return `product.${normalizedExt}`;
}

async function appendImageToFormData(formData: FormData, uri: string): Promise<void> {
  const type = getMimeType(uri);
  const name = getFilename(uri);

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('image', new File([blob], name, { type }));
    return;
  }

  formData.append('image', {
    uri,
    type,
    name,
  } as unknown as Blob);
}

function mapToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    brand: (row.brand as ProductBrand) ?? undefined,
    category: row.category as ProductCategory,
    description: (row.notes as string) ?? undefined,
    image_url: (row.image_url as string) ?? null,
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const rows = await apiRequest<Record<string, unknown>[]>({ path: '/products', method: 'GET' });
    return rows.map(mapToProduct);
  } catch (error) {
    console.error('[getProducts]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

export async function createProduct(data: {
  name: string;
  description?: string;
  category: ProductCategory;
  brand: ProductBrand;
} & ProductImagePayload): Promise<Product> {
  try {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('category', data.category);
    formData.append('brand', data.brand);
    if (data.description) formData.append('notes', data.description);

    if (data.imageUri) {
      await appendImageToFormData(formData, data.imageUri);
    }
    appendBase64ImageToFormData(formData, data);

    const res = await fetch(`${apiConfig.baseUrl}/products`, {
      method: 'POST',
      headers: await getMultipartAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al crear producto'));
    return mapToProduct(await res.json() as Record<string, unknown>);
  } catch (error) {
    console.error('[createProduct]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

export async function updateProduct(id: string, data: {
  name?: string;
  description?: string;
  category?: ProductCategory;
  brand?: ProductBrand;
} & ProductImagePayload): Promise<Product> {
  try {
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.category !== undefined) formData.append('category', data.category);
    if (data.brand !== undefined) formData.append('brand', data.brand);
    if (data.description !== undefined) formData.append('notes', data.description);

    if (data.imageUri) {
      await appendImageToFormData(formData, data.imageUri);
    }
    appendBase64ImageToFormData(formData, data);

    const res = await fetch(`${apiConfig.baseUrl}/products/${id}`, {
      method: 'PATCH',
      headers: await getMultipartAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al actualizar producto'));
    return mapToProduct(await res.json() as Record<string, unknown>);
  } catch (error) {
    console.error('[updateProduct]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

function appendBase64ImageToFormData(formData: FormData, data: ProductImagePayload): void {
  if (!data.imageBase64) {
    return;
  }

  formData.append('imageBase64', data.imageBase64);
  formData.append('imageMimeType', data.imageMimeType ?? (data.imageUri ? getMimeType(data.imageUri) : 'image/jpeg'));
  formData.append('imageFilename', data.imageFilename ?? (data.imageUri ? getFilename(data.imageUri) : 'product.jpg'));
}

async function getMultipartAuthHeaders(): Promise<HeadersInit> {
  const token = await getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('eos-access-token');
  }

  return SecureStore.getItemAsync('eos-access-token');
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? fallback;
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await apiRequest<void>({ path: `/products/${id}`, method: 'DELETE' });
  } catch (error) {
    console.error('[deleteProduct]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}
