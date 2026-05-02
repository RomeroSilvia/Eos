import { useState } from 'react';
import type { Routine } from '@/types/routine';

export function useRoutine() {
  const [routine, setRoutine] = useState<Routine>({
    id: '1',
    name: 'Rutina piel luminosa',
    category: 'morning' as const,
    steps: [
      {
        id: '1',
        title: 'Limpieza',
        status: 'pending' as const,
        category: 'morning' as const,
        order: 1,
        products: [
          {
            id: 'p1',
            name: 'Gel de limpieza Cerave',
            category: 'cleanser'
          }
        ]
      },
      {
        id: '2',
        title: 'Serum',
        status: 'pending' as const,
        category: 'morning' as const,
        order: 2,
        products: [
          {
            id: 'p2',
            name: 'Niacinamida The Ordinary',
            category: 'serum'
          }
        ]
      },
      {
        id: '3',
        title: 'Hidratación',
        status: 'pending' as const,
        category: 'morning' as const,
        order: 3,
        products: [
          {
            id: 'p3',
            name: 'Crema hidratante',
            category: 'moisturizer'
          }
        ]
      }
    ]
  });

  return { routine, setRoutine };
}