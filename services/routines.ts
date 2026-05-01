import type { Routine } from '@/types/routine';
import { mockProducts } from './products';

const findProducts = (ids: string[]) => mockProducts.filter((product) => ids.includes(product.id));

export const mockActiveRoutine: Routine = {
  id: 'routine-morning',
  name: 'Rutina matutina',
  category: 'morning',
  steps: [
    {
      id: 'step-cleanser',
      title: 'Limpieza',
      category: 'morning',
      products: findProducts(['product-cerave-cleanser']),
      status: 'completed',
      order: 1
    },
    {
      id: 'step-hydration',
      title: 'Hidratacion',
      category: 'morning',
      products: findProducts(['product-loreal-toner', 'product-loreal-cream']),
      status: 'completed',
      order: 2
    },
    {
      id: 'step-serum',
      title: 'Serum',
      category: 'morning',
      products: findProducts(['product-ordinary-niacinamide', 'product-ordinary-caffeine']),
      status: 'pending',
      order: 3
    },
    {
      id: 'step-sunscreen',
      title: 'Protector solar',
      category: 'morning',
      products: findProducts(['product-sunscreen']),
      status: 'pending',
      order: 4
    }
  ]
};

export async function getActiveRoutine(): Promise<Routine> {
  return mockActiveRoutine;
}
