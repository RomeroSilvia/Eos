---
name: e3-centers-admin
description: Use this skill for EOS Entrega 3 Modulo 3: aesthetic centers, center-scoped admins, specialist-center assignment, and basic admin dashboard by center.
---

# e3-centers-admin

Use this skill only for E3-M3: Centros Esteticos & Tablero Admin.

## Scope

M3 implements:

1. Aesthetic centers with soft delete.
2. Center-scoped admins through `center_admins`.
3. Specialist assignment to centers through `specialist_profiles.center_id`.
4. Basic dashboard counters filtered by center.
5. Admin frontend screens for center management and basic metrics.

Do not implement:

- M1 routines.
- M2 auth/session changes.
- M4 audit module internals.
- M5 advanced reports, exports, subscriptions or metrics.

## Backend Contract

Routes follow the existing project pattern:

```text
routes -> controller -> service -> repository -> tests
```

Implemented endpoints:

```text
GET    /api/centers
POST   /api/centers
PATCH  /api/centers/:centerId
DELETE /api/centers/:centerId
GET    /api/centers/:centerId/dashboard
PATCH  /api/admin/specialists/:specialistId/center
```

All routes require `authenticate`.

Center routes require:

```ts
requireRole('center_admin')
```

Admin specialist-center assignment also requires:

```ts
requireRole('center_admin')
```

## Database Contract

M3 owns:

```text
centers
center_admins
specialist_profiles.center_id
```

Minimum schema consumed by other modules:

```text
centers(id, name, address, phone, is_active, created_at, updated_at)
center_admins(user_id, center_id, role)
specialist_profiles.center_id uuid null references centers(id)
```

Do not add `platform_admin` unless a later plan explicitly asks for it.

## Permissions

Access is scoped by `center_admins`.

A `center_admin` can only list, edit, delete, view dashboard data for, or assign specialists to centers where a matching row exists:

```text
center_admins.user_id = auth/admin user id
center_admins.center_id = target center id
center_admins.role = 'center_admin'
```

If access is missing, return 403 with a friendly message.

If a center does not exist or is inactive, return 404 with a friendly message.

## Dashboard

M3 dashboard is intentionally basic:

```ts
{
  specialistsTotal: number;
  specialistsVerified: number;
  specialistsPending: number;
  clientsTotal: number;
}
```

It counts specialists by `specialist_profiles.center_id` and clients through existing `client_specialist_relations`.

Advanced reporting, date ranges, exports, subscriptions and heavy aggregations belong to M5.

## Audit

Audit is best-effort/TODO until M4 exists.

Do not implement M4 inside this module.

## Verification

Relevant commands:

```bash
cd backend && npm test -- centers
cd backend && npm test -- admin
cd backend && npm run typecheck
npx tsc --noEmit
```
