import type { Product, ProductCategory, ProductBrand } from '@/types/product';
import { apiConfig, apiRequest } from '@/services/api/client';

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

function appendImageToFormData(formData: FormData, uri: string): void {
  formData.append('image', {
    uri,
    type: getMimeType(uri),
    name: getFilename(uri),
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
  imageUri?: string;
}): Promise<Product> {
  try {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('category', data.category);
    formData.append('brand', data.brand);
    if (data.description) formData.append('notes', data.description);

    if (data.imageUri) {
      appendImageToFormData(formData, data.imageUri);
    }

    const res = await fetch(`${apiConfig.baseUrl}/products`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error al crear producto');
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
  imageUri?: string;
}): Promise<Product> {
  try {
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.category !== undefined) formData.append('category', data.category);
    if (data.brand !== undefined) formData.append('brand', data.brand);
    if (data.description !== undefined) formData.append('notes', data.description);

    if (data.imageUri) {
      appendImageToFormData(formData, data.imageUri);
    }

    const res = await fetch(`${apiConfig.baseUrl}/products/${id}`, {
      method: 'PATCH',
      body: formData,
    });
    if (!res.ok) throw new Error('Error al actualizar producto');
    return mapToProduct(await res.json() as Record<string, unknown>);
  } catch (error) {
    console.error('[updateProduct]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await apiRequest<void>({ path: `/products/${id}`, method: 'DELETE' });
  } catch (error) {
    console.error('[deleteProduct]', error);
    throw error instanceof Error ? error : new Error(`Error del servidor: ${String(error)}`);
  }
}
