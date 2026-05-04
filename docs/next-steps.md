# Next steps

## Estado actual

El proyecto ya tiene Supabase conectado mediante API EOS para el modulo Rutinas.

Implementado:

1. CRUD real de rutinas.
2. CRUD real de pasos de rutina.
3. Listado de rutinas del usuario.
4. Lectura de rutina activa/reciente.
5. Persistencia diaria de pasos completados con `routine_logs` y `routine_step_logs`.
6. Home consume la rutina activa y el progreso diario guardado.

## Siguiente tarea recomendada

1. Implementar autenticacion real o definir JWT validado en backend.
2. Reemplazar `mockAuth` por usuario autenticado.
3. Completar el modulo Progreso para leer historial semanal/mensual desde `routine_logs`.
4. Agregar editar/eliminar pasos desde la UI de rutinas.
5. Agregar estados de error/loading visibles en formularios de creacion.
6. Definir RLS/politicas antes de produccion.

## No hacer todavia

- Subida de imagenes.
- Asociacion producto-paso desde Rutinas.
- RLS definitivo sin revision.
- Roles avanzados.

## Criterio de avance

El setup queda listo cuando:

- `npm run typecheck` funciona en `backend/`.
- `npm run dev` levanta Express.
- `GET /api/health` responde JSON.
- `GET /api/routines` responde rutinas reales.
- El check de pasos se recupera despues de recargar la pantalla.
- `services/api/client.ts` centraliza las llamadas HTTP.
