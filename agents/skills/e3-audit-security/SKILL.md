---
name: e3-audit-security
description: Use this skill for EOS Entrega 3 Módulo 4 — auditoría (emisor y lectura) y checklist de seguridad transversal (RBAC, cifrado en tránsito, exposición de errores).
---

# e3-audit-security

Use this skill only for Módulo 4 — Auditoría & Seguridad Transversal (E3-RF-06 + RNF-Seguridad).

## Scope

Implemented so far:

1. Emisor `recordAuditLog` (best-effort, ya existía antes de esta skill).
2. Lectura filtrable `GET /api/admin/audit-log`.
3. Panel de lectura `app/(tabs-admin)/audit-log.tsx`.
4. Tests unitarios del service/controller de `audit`.

Not implemented yet (ver "Pendiente" abajo):

- T4.6 auditoría de eventos de `auth.service.ts` (login exitoso/fallido, cambio de rol) — coordinar con M2.
- T4.7 revisión de RBAC estricto en las rutas nuevas de M1/M2/M3/M5.
- T4.8 revisión de cifrado en tránsito / headers de seguridad.
- T4.9 revisión de exposición de errores en módulos nuevos.
- RLS de `audit_logs` (ver `docs/e3-supabase-security.md`, sección "audit_logs - estado real").

Do not implement (fuera de M4):

- M1 wizard/performance de rutinas.
- M2 auth federada.
- M3 CRUD de centros (ya completo).
- M5 planes/reportes.

## Branch

Use or suggest:

```text
feature/e3-m4-audit-log-read
```

## Backend

Módulo: `backend/src/modules/audit/`

```text
audit.types.ts        — AuditAction, AuditEntity, RecordAuditLogParams, AuditLogRow, AuditLogEntry (+ actorName/actorProfile/entityLabel/routineStepDetail), AuditLogFilters, AuditLogPage
audit.repository.ts    — auditRepository.findAuditLogs(filters) + lookups batched (findProfileNamesByIds, findCenterNamesByIds, findRoutineNamesByIds, findProductNamesByIds, findSpecialistProfileRows, findSpecialtyByUserIds, findSubscriptionRows, findSubscriptionPlanNamesByIds, findStepsWithProducts, findProfileIdsByRole)
audit.service.ts       — recordAuditLog (emisor, no tocar su contrato) + getAuditLogs (lector, normaliza filtros y pagina) + enrichAuditLogEntries (resuelve actor/entidad/paso de rutina/owner de suscripción) + isIsoDate
audit.controller.ts    — GET / -> getAuditLogs, parsea query params como strings
audit.routes.ts        — authenticate + requireRole('center_admin') + GET /
tests/audit.service.test.ts
tests/audit.controller.test.ts
```

Montado en `backend/src/app.ts` como `app.use('/api/admin/audit-log', auditRouter)`.

### Enriquecimiento en `enrichAuditLogEntries`

- **Actor**: `actorName` (nombre real) + `actorProfile` ("Usuario" / "Especialista - {specialty}" / "Administrador de Centro"), resuelto contra `profiles`/`specialist_profiles`.
- **Entidad afectada**: `entityLabel` se resuelve primero contra la tabla en vivo; si el registro ya no existe (`delete`), cae a `deriveFallbackEntityLabel`, que deriva el nombre desde el `before`/`after` guardado en el propio evento.
- **Paso de rutina** (M1): si `metadata.changeType === 'routine_step'`, arma `routineStepDetail` (categoría, nombre, `hasProducts` resuelto contra `routine_step_products` — es un proxy del estado *actual* del paso, no un historial exacto de "se agregó en este cambio", porque `attachProductToStep`/`detachProductFromStep` no emiten `recordAuditLog`).
- **Suscripciones**: `owner_id`/`ownerId` se reemplaza por `owner` (nombre resuelto vía `profiles` o `centers` según `owner_type`) antes de devolver `before`/`after` — no se expone el id crudo del titular.
- **Filtro `entity=user_profile`**: antes de consultar `audit_logs`, resuelve los ids de `profiles` con `role='user'` (`findProfileIdsByRole`) y los pasa como `entityIdIn`, para no traer eventos de perfiles de especialista/admin bajo ese filtro.

### Contrato de lectura

```text
GET /api/admin/audit-log?entity=&entityId=&actorId=&from=&to=&page=&limit=
```

Ver `docs/e3-contracts.md`, sección "M4 - Auditoria y Seguridad Transversal", para el contrato completo (query params, shape de respuesta, reglas de validación). No hay rol `admin`/`platform_admin` en el sistema — el endpoint usa `requireRole('center_admin')` igual que `/api/admin/*` y `/api/centers`.

### Reglas al extender el service

- `recordAuditLog` es best-effort (nunca lanza). No cambiar ese comportamiento al tocar el archivo.
- `getAuditLogs` sí valida y lanza `ApiError(400, ...)` en español ante filtros inválidos — es un endpoint de lectura protegido, no un emisor best-effort.
- El repository devuelve filas snake_case (`AuditLogRow`); el service las mapea a camelCase (`AuditLogEntry`) antes de responder, igual que `centersService.toCenterSummary`. No exponer snake_case en la respuesta HTTP.
- `normalizePositiveInt(value, fallback, max)` recorta el valor parseado a `Math.min(parsed, max)`. **Cuidado con el `max` de `page`**: hubo un bug donde se pasaba `1` como `max` (`normalizePositiveInt(rawFilters.page, 1, 1)`), lo que forzaba cualquier página pedida a quedar en `1` — "Siguiente" nunca avanzaba. `page` no tiene un tope real, solo `limit` lo tiene (`MAX_PAGE_SIZE`); usar `Number.MAX_SAFE_INTEGER` como `max` de `page`.

## Frontend

```text
types/audit.ts          — AuditAction, AuditEntity, AuditLogEntry (espejo del tipo backend), AuditLogFilters, AuditLogPage
services/audit.ts        — getAuditLogs(filters), getAuditLogErrorMessage(error)
app/(tabs-admin)/audit-log.tsx — pantalla de lectura con filtros (entity, entityId, actorId, rango de fechas) y paginación anterior/siguiente
```

Dependencia agregada: `@react-native-community/datetimepicker` (instalada vía `npx expo install`, no `npm install`, para mantener compatibilidad con Expo SDK 54).

Navegación: tarjeta "Auditoría" en `app/(tabs-admin)/index.tsx`, ruta `routes.adminAuditLog` (`constants/routes.ts`). `app/(tabs-admin)/_layout.tsx` es un `Stack`, no un tab bar — no hace falta declarar la pantalla en una lista de tabs, solo el archivo y el link de navegación.

Reusa `components/Card.tsx`, `constants/colors.ts`, sin introducir estilos nuevos. Sigue el patrón de `app/(tabs-admin)/plans.tsx` (loadData con `useCallback` + `useFocusEffect`, estados de loading/error/vacío explícitos).

### Tarjeta de cada evento

- Meta grid con 4 items: `Actor`, `Perfil`, `Registro` (= `entityLabel`), `Fecha` — todo lo que antes vivía repetido en distintos recuadros del detalle ahora se muestra una sola vez, acá.
- El detalle expandible (`AuditLogCard`) se arma distinto según `entry.action`:
  - `delete` → `DeleteSummaryBlock`: una sola línea, "Elemento eliminado" (actor y fecha ya están en el meta grid, no se repiten).
  - `create` → `CreateBlock`: campos de `after` vía `FieldValue`.
  - resto con diff → `UpdateDiffBlocks`: dos recuadros, "Antes" y "Después", solo con los campos que cambiaron (`buildDiffRows`).
  - `entry.routineStepDetail` (si no es `null`) → `RoutineStepBlock`, **solo si `action === 'create'`** (se agrega un paso).
- `FieldValue` es recursivo: valores anidados (ej. el plan de una suscripción, y dentro sus `features`) se muestran como bullets indentados por nivel, no como una línea aplanada.
- `HIDDEN_FIELD_KEYS` (en el mismo archivo) filtra campos que no deben mostrarse crudos: `id`, `created_at`/`updated_at`, `plan_id`, `owner_id`, `routine_id` (y sus variantes camelCase) — se ocultan en cualquier nivel de anidación porque son ruido o datos sensibles (UUIDs sin nombre resuelto), o porque ya se muestran en otro lado (ej. `entityLabel` arriba).

### Paginación

- Cambiar de página no navega con `router` — es estado local (`page`/`limit`/`total` en `AuditLogScreen`) más `getAuditLogs({ page })`.
- `goToPage(targetPage)` centraliza el cambio: hace `listRef.current?.scrollToOffset({ offset: 0 })` **antes** de lanzar `loadData`, para que el scroll sea instantáneo al tocar el botón y no recién cuando la respuesta llega (si se scrollea reactivamente en un `useEffect` atado a `page`, el usuario queda 1-2s viendo la página vieja porque `page` solo cambia después del `await`).
- Mientras `isLoading` es `true` y ya había datos (`entries.length > 0`), el `ListFooterComponent` reemplaza los botones de paginación por un spinner ("Cargando página...") en vez de desaparecer — si no, el usuario pierde el feedback de carga al estar scrolleado cerca del pie.

## Tests

Tests en español, estilo `centers.service.test.ts` / `centers.controller` (mock del repository/service con `jest.mock`, `jest.mocked`, factories `makeAuditLog(overrides = {})`).

Casos cubiertos:

- Filtros vacíos usan defaults de paginación (`page=1`, `limit=10`).
- Filtros de `entity`/`entityId`/`actorId` se pasan al repository.
- `from` posterior a `to` → `ApiError`.
- Fecha con formato inválido → `ApiError`.
- `limit` se recorta al máximo permitido (100).
- `page` no numérico o no positivo → `ApiError`.
- **`page` solicitado se respeta** (`page: '3'` → el repository se llama con `page: 3`, no se recorta a 1 — regresión del bug de paginación).
- Resolución de `actorName`/`actorProfile` por rol (`user`/`specialist`/`center_admin`).
- Fallback de `entityLabel` desde `before`/`after` cuando el registro fue eliminado.
- `routineStepDetail` con `hasProducts` true/false y `null` cuando el metadata no es de un paso de rutina.
- Filtro `entity=user_profile` resuelve `entityIdIn` con ids de `role='user'` (y devuelve página vacía sin consultar `audit_logs` si no hay ninguno).
- Suscripciones: `owner_id` se reemplaza por `owner` (nombre), tanto para `owner_type='user'` como `'center'`.
- Controller mapea query params `string | string[] | undefined` a `string | undefined` antes de llamar al service.

## Pendiente (no resuelto por esta skill todavía)

1. **RLS de `audit_logs`**: falta una migración nueva que habilite RLS (deny-all por defecto). No se creó en esta iteración porque toca una migración de base de datos — comunicar antes de escribirla. Detalle en `docs/e3-supabase-security.md`.
2. **T4.6**: instrumentar `recordAuditLog` en `auth.service.ts` para login/cambio de rol. Coordinar con el dueño de M2, M4 solo provee el contrato.
3. **T4.7-T4.9**: checklist de seguridad transversal (§7 de `docs/plan_entrega3.md`) sobre las rutas nuevas de M1/M2/M3/M5.

## Verification

```bash
cd backend && npm run typecheck && npx jest --testPathPatterns=audit
npm run lint
```

Manual: generar un evento (crear/editar un centro o rutina, que ya llaman a `recordAuditLog`) y confirmar que aparece en `GET /api/admin/audit-log` y en la pantalla `app/(tabs-admin)/audit-log.tsx` con los filtros correctos.
