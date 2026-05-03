import { useEffect, useState } from 'react';
import { createProduct as createProductService, getProducts } from '@/services/products';
import type { Product, ProductCategory } from '@/types/product';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    void getProducts().then(setProducts);
  }, []);

  const createProduct = async (data: {
    name: string;
    description?: string;
    category: ProductCategory;
  }) => {
    const newProduct = await createProductService(data);
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  return { products, createProduct };
}
