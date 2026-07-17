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
audit.types.ts        — AuditAction, AuditEntity, RecordAuditLogParams, AuditLogRow, AuditLogEntry, AuditLogFilters, AuditLogPage
audit.repository.ts    — auditRepository.findAuditLogs(filters) contra TABLE_NAMES.auditLogs
audit.service.ts       — recordAuditLog (emisor, no tocar su contrato) + getAuditLogs (lector, normaliza filtros y pagina) + isIsoDate
audit.controller.ts    — GET / -> getAuditLogs, parsea query params como strings
audit.routes.ts        — authenticate + requireRole('center_admin') + GET /
tests/audit.service.test.ts
tests/audit.controller.test.ts
```

Montado en `backend/src/app.ts` como `app.use('/api/admin/audit-log', auditRouter)`.

### Contrato de lectura

```text
GET /api/admin/audit-log?entity=&entityId=&actorId=&from=&to=&page=&limit=
```

Ver `docs/e3-contracts.md`, sección "M4 - Auditoria y Seguridad Transversal", para el contrato completo (query params, shape de respuesta, reglas de validación). No hay rol `admin`/`platform_admin` en el sistema — el endpoint usa `requireRole('center_admin')` igual que `/api/admin/*` y `/api/centers`.

### Reglas al extender el service

- `recordAuditLog` es best-effort (nunca lanza). No cambiar ese comportamiento al tocar el archivo.
- `getAuditLogs` sí valida y lanza `ApiError(400, ...)` en español ante filtros inválidos — es un endpoint de lectura protegido, no un emisor best-effort.
- El repository devuelve filas snake_case (`AuditLogRow`); el service las mapea a camelCase (`AuditLogEntry`) antes de responder, igual que `centersService.toCenterSummary`. No exponer snake_case en la respuesta HTTP.

## Frontend

```text
types/audit.ts          — AuditAction, AuditEntity, AuditLogEntry, AuditLogFilters, AuditLogPage
services/audit.ts        — getAuditLogs(filters), getAuditLogErrorMessage(error)
app/(tabs-admin)/audit-log.tsx — pantalla de lectura con filtros (entity, entityId, actorId, rango de fechas) y paginación anterior/siguiente
```

Dependencia agregada: `@react-native-community/datetimepicker` (instalada vía `npx expo install`, no `npm install`, para mantener compatibilidad con Expo SDK 54).

Navegación: tarjeta "Auditoría" en `app/(tabs-admin)/index.tsx`, ruta `routes.adminAuditLog` (`constants/routes.ts`). `app/(tabs-admin)/_layout.tsx` es un `Stack`, no un tab bar — no hace falta declarar la pantalla en una lista de tabs, solo el archivo y el link de navegación.

Reusa `components/Card.tsx`, `constants/colors.ts`, sin introducir estilos nuevos. Sigue el patrón de `app/(tabs-admin)/plans.tsx` (loadData con `useCallback` + `useFocusEffect`, estados de loading/error/vacío explícitos).

## Tests

Tests en español, estilo `centers.service.test.ts` / `centers.controller` (mock del repository/service con `jest.mock`, `jest.mocked`, factories `makeAuditLog(overrides = {})`).

Casos cubiertos:

- Filtros vacíos usan defaults de paginación (`page=1`, `limit=20`).
- Filtros de `entity`/`entityId`/`actorId` se pasan al repository.
- `from` posterior a `to` → `ApiError`.
- Fecha con formato inválido → `ApiError`.
- `limit` se recorta al máximo permitido (100).
- `page` no numérico o no positivo → `ApiError`.
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
