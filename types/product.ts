export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'moisturizer'
  | 'serum'
  | 'sunscreen'
  | 'other';

export type Product = {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  description?: string;
};
