import type { Product, ProductCategory, ProductBrand } from '@/types/product';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
    const res = await fetch(`${BASE_URL}/products`);
    if (!res.ok) throw new Error('Error al obtener productos');
    const rows = await res.json() as Record<string, unknown>[];
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
      const uri = data.imageUri;
      const filename = uri.split('/').pop() ?? 'product.jpg';
      const ext = filename.includes('.')
        ? filename.split('.').pop()!.toLowerCase()
        : 'jpg';
 
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        heic: 'image/heic',
      };
      const mimeType = mimeMap[ext] ?? 'image/jpeg';
      const normalizedExt = ext === 'jpeg' ? 'jpg' : (mimeMap[ext] ? ext : 'jpg');
 
      formData.append('image', {
        uri,
        type: mimeType,
        name: `product.${normalizedExt}`,
      } as unknown as Blob);
    }

    const res = await fetch(`${BASE_URL}/products`, {
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
