import type { Product } from '@/types/product';

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
  //return mockProducts;
  return []
}
