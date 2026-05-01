import { useEffect, useState } from 'react';
import { getProducts } from '@/services/products';
import type { Product } from '@/types/product';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    void getProducts().then(setProducts);
  }, []);

  return { products };
}
