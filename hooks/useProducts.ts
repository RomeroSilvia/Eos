import { useCallback, useEffect, useState } from 'react';
import {
  createProduct as createProductService,
  deleteProduct as deleteProductService,
  getProducts,
  updateProduct as updateProductService,
} from '@/services/products';
import type { Product, ProductBrand, ProductCategory } from '@/types/product';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error('No pudimos cargar los productos.', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  const createProduct = async (data: {
    name: string;
    description?: string;
    category: ProductCategory;
    brand: ProductBrand;
    imageUri?: string;
  }) => {
    const newProduct = await createProductService(data);
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = async (id: string, data: {
    name?: string;
    description?: string;
    category?: ProductCategory;
    brand?: ProductBrand;
    imageUri?: string;
  }) => {
    const updated = await updateProductService(id, data);
    setProducts((prev) => prev.map((p) => p.id === id ? updated : p));
    return updated;
  };

  const removeProduct = async (id: string) => {
    await deleteProductService(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return { products, createProduct, updateProduct, removeProduct, isLoading, refreshProducts };
}
