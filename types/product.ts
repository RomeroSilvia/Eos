export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'moisturizer'
  | 'serum'
  | 'sunscreen'
  | 'other';

export type ProductBrand =
  | 'Cerave'
  | 'L’Oreal'
  | 'The Ordinary'
  | 'other';  

export type Product = {
  id: string;
  name: string;
  brand?: ProductBrand;
  category: ProductCategory;
  description?: string;
  image_url?: string | null;
};
