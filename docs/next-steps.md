# Next steps

## Siguiente tarea recomendada

1. Copiar `.env.example` a `.env` en la raiz.
2. Copiar `backend/.env.example` a `backend/.env`.
3. Crear proyecto Supabase.
4. Ejecutar `database/initial_schema.sql`.
5. Definir si la autenticacion sera Supabase Auth directa o JWT validado en backend.
6. Implementar primero endpoints reales de lectura:
   - `GET /api/routines`
   - `GET /api/products`
   - `GET /api/progress/summary`
   - `GET /api/profile/me`
7. Crear adaptadores en frontend para elegir entre mocks y API segun `EXPO_PUBLIC_USE_MOCKS`.

## No hacer todavia

- CRUD completo de rutinas.
- CRUD completo de productos.
- Auth real.
- Subida de imagenes.
- RLS definitivo sin revision.
- Reemplazo completo de mocks.
- Cambios de navegacion.

## Criterio de avance

El setup queda listo cuando:

- `npm run typecheck` funciona en `backend/`.
- `npm run dev` levanta Express.
- `GET /api/health` responde JSON.
- Expo conserva mocks actuales.
- `services/api/client.ts` existe para futuras llamadas HTTP.
