import type { Product, ProductCategory } from '@/types/product';

export const mockProducts: Product[] = [
  {
    id: 'product-cerave-cleanser',
    name: 'Gel de limpieza suave de Cerave',
    brand: 'Cerave',
    category: 'cleanser'
  },
  {
    id: 'product-loreal-toner',
    name: 'Tonico hidratante L’Oreal',
    brand: 'L’Oreal',
    category: 'toner'
  },
  {
    id: 'product-loreal-cream',
    name: 'Crema hidratante L’Oreal',
    brand: 'L’Oreal',
    category: 'moisturizer'
  },
  {
    id: 'product-ordinary-niacinamide',
    name: 'The Ordinary Niacinamide',
    brand: 'The Ordinary',
    category: 'serum'
  },
  {
    id: 'product-ordinary-caffeine',
    name: 'The Ordinary Caffeine',
    brand: 'The Ordinary',
    category: 'serum'
  },
  {
    id: 'product-sunscreen',
    name: 'Protector solar facial',
    category: 'sunscreen'
  }
];

export async function getProducts(): Promise<Product[]> {
  return [];
}

export async function createProduct(data: {
  name: string;
  description?: string;
  category: ProductCategory;
}): Promise<Product> {
  // TODO: reemplazar por llamada real al backend cuando esté conectado
  const newProduct: Product = {
    id: `product-${Date.now()}`,
    name: data.name,
    category: data.category,
    description: data.description
  };
  mockProducts.push(newProduct);
  return newProduct;
}
