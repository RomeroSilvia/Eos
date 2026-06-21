# Database setup

Eos usa Supabase PostgreSQL como base de datos.

## Crear proyecto en Supabase

1. Crear un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ir a **SQL Editor**.
3. Abrir el archivo `database/initial_schema.sql` del repositorio.
4. Copiar el contenido y ejecutarlo en Supabase.

## Tablas del schema

| Tabla | Descripción |
|---|---|
| `profiles` | Perfil del usuario (nombre, email, skin_type) |
| `skin_profiles` | Resultado del quiz de diagnóstico de piel por usuario |
| `routines` | Rutinas del usuario (mañana / noche / personalizada) |
| `routine_steps` | Pasos de cada rutina con orden y categoría |
| `products` | Productos de skincare del usuario con imagen |
| `routine_step_products` | Asociación N:M entre pasos y productos |
| `routine_logs` | Registro diario de completitud por rutina |
| `routine_step_logs` | Registro diario de completitud por paso |

## Obtener credenciales

En Supabase, ir a **Project Settings → API**:

- `SUPABASE_URL` — URL del proyecto
- `SUPABASE_ANON_KEY` — Clave anónima (pública)
- `SUPABASE_SERVICE_ROLE_KEY` — Clave de service role (solo backend, nunca exponer)

Completar estas credenciales en `backend/.env` (ver `docs/env.md`).

## Actualizar tipos generados

Si se modifica el schema, regenerar los tipos de TypeScript con la CLI de Supabase:

```bash
npx supabase gen types typescript --project-id <project-id> > backend/src/database/database.types.ts
```

Los aliases de conveniencia (`RoutineRow`, `ProductInsert`, etc.) están en `backend/src/database/schema.types.ts` y deben actualizarse manualmente si cambian las tablas.

## Pendientes antes de producción

- **RLS (Row Level Security):** El schema tiene las políticas comentadas (`-- TODO: Enable RLS policies before production`). Activar y definir políticas por usuario autenticado antes de cualquier despliegue.
- **Triggers `updated_at`:** Agregar triggers para actualizar automáticamente el campo `updated_at` en cada tabla (también comentados en el schema).
- **Índices:** Crear índices en columnas de búsqueda frecuente como `user_id`, `routine_id` y `log_date` (comentados en el schema; confirmar patrones de acceso primero).
- **Enums o constraints:** Definir constraints más estrictos para categorías de productos, roles y estados si se requiere integridad a nivel de base de datos.
- **Seeds de desarrollo:** Considerar datos de prueba si el equipo necesita un estado inicial reproducible.

## Supabase CLI local

No hace falta instalar Supabase CLI globalmente. La raiz del proyecto tiene `supabase` como dev dependency y scripts npm que ejecutan la CLI local.

```bash
npm install
npm run supabase -- --version
```

Para vincular el proyecto y correr migraciones:

```bash
npm run supabase -- login
npm run supabase -- link --project-ref <PROJECT_REF>
npm run supabase:db:push
```

Para regenerar tipos:

```bash
npm run supabase:types -- --project-id <PROJECT_ID> > backend/src/database/database.types.ts
```

Tambien se puede usar `npx` directamente:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > backend/src/database/database.types.ts
```

Si aparece "Supabase CLI no esta instalado", no uses `npm install -g supabase`. Ejecuta `npm install` en la raiz y volve a correr el comando con `npm run supabase -- ...` o `npx supabase ...`.