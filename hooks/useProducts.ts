import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createProduct as createProductService,
  deleteProduct as deleteProductService,
  forceRemove as forceRemoveService,
  getProducts,
  removeWithProtection as removeWithProtectionService,
  replaceAndRemove as replaceAndRemoveService,
  type ProductImagePayload,
  type RemoveWithProtectionResult,
  updateProduct as updateProductService,
} from '@/services/products';
import type { Product, ProductBrand, ProductCategory } from '@/types/product';

const STALE_AFTER_MS = 30_000;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedAt = useRef<number>(0);

  const refreshProducts = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetchedAt.current < STALE_AFTER_MS) return;
    try {
      setIsLoading(true);
      const data = await getProducts();
      setProducts(data);
      lastFetchedAt.current = Date.now();
    } catch (err) {
      console.error('No pudimos cargar los productos.', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProducts(true);
  }, [refreshProducts]);

  const createProduct = async (data: {
    name: string;
    description?: string;
    category: ProductCategory;
    brand: ProductBrand;
  } & ProductImagePayload) => {
    const newProduct = await createProductService(data);
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = async (id: string, data: {
    name?: string;
    description?: string;
    category?: ProductCategory;
    brand?: ProductBrand;
  } & ProductImagePayload) => {
    const updated = await updateProductService(id, data);
    setProducts((prev) => prev.map((p) => p.id === id ? updated : p));
    return updated;
  };

  const removeProduct = async (id: string) => {
    await deleteProductService(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const removeWithProtection = async (id: string) => {
    const result = await removeWithProtectionService(id);

    if (result.status === 'deleted') {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }

    return result;
  };

  const forceRemove = async (id: string) => {
    await forceRemoveService(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const replaceAndRemove = async (id: string, replacementProductId: string) => {
    await replaceAndRemoveService(id, replacementProductId);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    products,
    createProduct,
    updateProduct,
    removeProduct,
    removeWithProtection,
    forceRemove,
    replaceAndRemove,
    isLoading,
    refreshProducts
  };
}
