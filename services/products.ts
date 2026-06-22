import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Product, ProductCategory, ProductBrand } from '@/types/product';
import { ApiClientError, apiConfig, apiRequest } from '@/services/api/client';

export type ProductUsageConflict = {
  affectedRoutines: { routineId: string; routineName: string; stepName: string }[];
};

export type RemoveWithProtectionResult = 
| { status: 'deleted' }
| { status: 'conflict'; conflict: ProductUsageConflict };

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
  console.log('[products.service] appendImageToFormData', { uri, type, name, platform: Platform.OS });

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
    console.log('[products.service] createProduct', { name: data.name, hasUri: !!data.imageUri, hasBase64: !!data.imageBase64, base64Len: data.imageBase64?.length ?? 0 });
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('category', data.category);
    formData.append('brand', data.brand);
    if (data.description) formData.append('notes', data.description);

    if (data.imageUri && !data.imageBase64) {
      await appendImageToFormData(formData, data.imageUri);
    }
    appendBase64ImageToFormData(formData, data);

    console.log('[products.service] enviando POST /products...');
    const res = await fetch(`${apiConfig.baseUrl}/products`, {
      method: 'POST',
      headers: await getMultipartAuthHeaders(),
      body: formData,
    });
    console.log('[products.service] respuesta POST /products status:', res.status);
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
    console.log('[products.service] updateProduct', { id, hasUri: !!data.imageUri, hasBase64: !!data.imageBase64, base64Len: data.imageBase64?.length ?? 0 });
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.category !== undefined) formData.append('category', data.category);
    if (data.brand !== undefined) formData.append('brand', data.brand);
    if (data.description !== undefined) formData.append('notes', data.description);

    if (data.imageUri && !data.imageBase64) {
      await appendImageToFormData(formData, data.imageUri);
    }
    appendBase64ImageToFormData(formData, data);

    console.log('[products.service] enviando PATCH /products/' + id + '...');
    const res = await fetch(`${apiConfig.baseUrl}/products/${id}`, {
      method: 'PATCH',
      headers: await getMultipartAuthHeaders(),
      body: formData,
    });
    console.log('[products.service] respuesta PATCH status:', res.status);
    if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al actualizar producto'));
    return mapToProduct(await res.json() as Record<string, unknown>);
  } catch (error) {
    console.error('[updateProduct]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

function appendBase64ImageToFormData(formData: FormData, data: ProductImagePayload): void {
  if (!data.imageBase64) {
    console.log('[products.service] appendBase64ImageToFormData: sin base64, se omite');
    return;
  }

  const mimeType = data.imageMimeType ?? (data.imageUri ? getMimeType(data.imageUri) : 'image/jpeg');
  const filename = data.imageFilename ?? (data.imageUri ? getFilename(data.imageUri) : 'product.jpg');
  console.log('[products.service] appendBase64ImageToFormData', { base64Len: data.imageBase64.length, mimeType, filename });
  formData.append('imageBase64', data.imageBase64);
  formData.append('imageMimeType', mimeType);
  formData.append('imageFilename', filename);
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

export async function removeWithProtection(id: string): Promise<RemoveWithProtectionResult> {
  try {
    await apiRequest<void>({ path: `/products/${id}`, method: 'DELETE' });
    return { status: 'deleted' };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 409) {
      return {
        status: 'conflict',
        conflict: normalizeProductUsageConflict(error.details)
      };
    }

    console.error('[removeWithProtection]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

export async function forceRemove(id: string): Promise<void> {
  try {
    await apiRequest<void>({ path: `/products/${id}/force`, method: 'DELETE' });
  } catch (error) {
    console.error('[forceRemove]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

export async function replaceAndRemove(id: string, replacementProductId: string): Promise<void> {
  try {
    await apiRequest<void>({
      path: `/products/${id}/replace`,
      method: 'PUT',
      body: JSON.stringify({ replacementProductId })
    });
  } catch (error) {
    console.error('[replaceAndRemove]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

function normalizeProductUsageConflict(details: unknown): ProductUsageConflict {
  if (!details || typeof details !== 'object') {
    return { affectedRoutines: [] };
  }

  const affectedRoutines = (details as { affectedRoutines?: unknown }).affectedRoutines;

  if (!Array.isArray(affectedRoutines)) {
    return { affectedRoutines: [] };
  }

  return {
    affectedRoutines: affectedRoutines
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const candidate = item as Record<string, unknown>;

        if (
          typeof candidate.routineId !== 'string' ||
          typeof candidate.routineName !== 'string' ||
          typeof candidate.stepName !== 'string'
        ) {
          return null;
        }

        return {
          routineId: candidate.routineId,
          routineName: candidate.routineName,
          stepName: candidate.stepName
        };
      })
      .filter((item): item is ProductUsageConflict['affectedRoutines'][number] => item !== null)
  };
}
