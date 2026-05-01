# Database setup

Eos usara Supabase PostgreSQL como base de datos.

## Crear proyecto en Supabase

1. Crear un proyecto nuevo en Supabase.
2. Entrar a SQL Editor.
3. Abrir el archivo `database/initial_schema.sql`.
4. Copiar el contenido y ejecutarlo en Supabase.

## Esquema inicial

El SQL propone estas tablas:

- `profiles`
- `routines`
- `routine_steps`
- `products`
- `routine_step_products`
- `routine_logs`
- `routine_step_logs`

## Pendiente

- Definir enums o constraints mas estrictos para categorias y estados.
- Agregar triggers para actualizar `updated_at`.
- Activar RLS antes de produccion.
- Crear politicas por usuario autenticado.
- Agregar seeds de desarrollo si el equipo los necesita.

## RLS

El archivo SQL deja una seccion comentada:

```sql
-- TODO: Enable RLS policies before production
```

No activar produccion sin reglas de seguridad revisadas.
