import type { Product, ProductCategory, ProductBrand } from '@/types/product';

export const mockProducts: Product[] = [
  {
    id: 'product-cerave-cleanser',
    name: 'Gel de limpieza suave de Cerave',
    brand: 'Cerave',
    category: 'cleanser',
    description: 'Ideal para piel normal a seca, ayuda a mantener la barrera natural de la piel.'
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
  return mockProducts;
}

export async function createProduct(data: {
  name: string;
  description?: string;
  category: ProductCategory;
  brand: ProductBrand;
}): Promise<Product> {
  // TODO: reemplazar por llamada real al backend cuando esté conectado
  const newProduct: Product = {
    id: `product-${Date.now()}`,
    name: data.name,
    brand: data.brand,
    category: data.category,
    description: data.description
  };
  mockProducts.push(newProduct);
  return newProduct;
}
