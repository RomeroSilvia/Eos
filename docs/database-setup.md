# Database setup

Eos usa Supabase PostgreSQL como base de datos.

## Crear proyecto en Supabase

1. Crear un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ir a **SQL Editor**.
3. Abrir el archivo `database/initial_schema.sql` del repositorio.
4. Copiar el contenido y ejecutarlo en Supabase.

## Tablas del schema

Lista completa (18 tablas), verificada contra `backend/src/database/tableNames.ts`:

| Tabla | Descripción |
|---|---|
| `profiles` | Perfil del usuario (nombre, email, skin_type, role) |
| `skin_profiles` | Resultado del quiz de diagnóstico de piel por usuario |
| `routines` | Rutinas del usuario (mañana / noche / personalizada); columna `assigned_by` referencia al especialista que la asignó |
| `routine_steps` | Pasos de cada rutina con orden y categoría |
| `products` | Productos de skincare del usuario con imagen |
| `routine_step_products` | Asociación N:M entre pasos y productos |
| `routine_logs` | Registro diario de completitud por rutina |
| `routine_step_logs` | Registro diario de completitud por paso |
| `specialist_profiles` | Datos del especialista: matrícula, especialidad, `license_status`, `center_id` |
| `client_specialist_relations` | Relación especialista-paciente (vínculo activo/inactivo) |
| `push_tokens` | Token Expo de cada dispositivo para envío de push notifications |
| `notification_history` | Historial de notificaciones enviadas al usuario (fuente de verdad del backend) |
| `chat_messages` | Mensajes del chat en tiempo real; soporta tipo `text` e `image` con columnas `media_path`, `media_mime_type`, `media_size`; publicada en `supabase_realtime` |
| `centers` | Centros estéticos (Entrega 3, Módulo 3) |
| `center_admins` | Vínculo entre un usuario `center_admin` y el/los centros que administra |
| `subscription_plans` | Planes de suscripción (Entrega 3, Módulo 5) |
| `subscriptions` | Suscripciones asignadas a un usuario o centro; `status` es informativo, no bloquea otros módulos |
| `audit_logs` | Registro de auditoría transversal (Entrega 3, Módulo 4); ver estado de RLS abajo |

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

## Estado de RLS (Row Level Security)

Ver el detalle completo, tabla por tabla, en `docs/e3-supabase-security.md`. En resumen: `centers`, `center_admins`, `subscription_plans` y `subscriptions` tienen RLS activo (Entrega 3); `audit_logs` todavía no tiene RLS habilitado (el acceso se controla solo vía `requireRole('center_admin')` en el backend). Las policies de `centers`/`center_admins` están versionadas en `database/centers_rls_policies.sql`.

## Otros pendientes

- **Triggers `updated_at`:** Agregar triggers para actualizar automáticamente el campo `updated_at` en cada tabla (comentados en el schema original).
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