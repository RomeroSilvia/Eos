---
name: e2-module3-roles-specialist
description: Use this skill for EOS Entrega 2 Módulo 3: role enforcement, specialist registration, specialist status screen, role-based navigation, and backend/frontend tests.
---

# e2-module3-roles-specialist

Use this skill only for Módulo 3 — Sistema de Roles y Registro de Especialista.

## Scope

Implement only:

1. Backend role enforcement.
2. `requireRole` middleware.
3. Backend `specialist` module.
4. Specialist registration with license number, specialty, DNI photo and title photo.
5. Specialist license status endpoint.
6. Frontend specialist registration flow.
7. Specialist status screen.
8. Role-based navigation.
9. Tests.

Do not implement:

- M1 Apple Sign-In.
- M2 push notifications.
- M4 specialist panel.
- M5 specialist search or chat.

## Branch

Use or suggest:

```text
feature/e2-roles-specialist-register
```

## Backend requirements

### 1. Extend authenticate

File:

```text
backend/src/middlewares/auth.middleware.ts
```

After validating the Supabase JWT, read the user profile from `profiles` and attach role:

```ts
req.user = {
  id: data.user.id,
  role: profile?.role ?? 'user',
};
```

### 2. Update Express typing

File:

```text
backend/src/types/express.d.ts
```

Expected shape:

```ts
declare namespace Express {
  interface Request {
    user: {
      id: string;
      role: string;
    };
  }
}
```

### 3. Create requireRole middleware

File:

```text
backend/src/middlewares/requireRole.middleware.ts
```

Behavior:

- Allow request if `req.user.role` is included in allowed roles.
- Throw `ApiError(403, 'No tenés permiso para acceder a este recurso.')` otherwise.

Recommended implementation:

```ts
import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const requireRole = (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'No tenés permiso para acceder a este recurso.');
    }

    next();
  };
```

### 4. Create backend module

Create:

```text
backend/src/modules/specialist/
  specialist.routes.ts
  specialist.controller.ts
  specialist.service.ts
  specialist.repository.ts
  tests/specialist.service.test.ts
```

Follow existing project pattern:

```text
routes → controller → service → repository → tests
```

### 5. Endpoints

Implement:

```text
POST /api/specialist/register
GET  /api/specialist/status
GET  /api/specialist/health
```

`POST /api/specialist/register`:

- Requires `authenticate`.
- Uses multipart upload.
- Creates `specialist_profiles` with `license_status='pending'`.

`GET /api/specialist/status`:

- Requires `authenticate`.
- Requires `requireRole('specialist')`.
- Returns `license_status`, `rejection_reason`, `specialty`, `license_number`.

### 6. Specialist service logic

`register(userId, body, files)` must:

1. Validate required fields.
2. Validate `specialty`.
3. Check duplicate `license_number`.
4. Upload DNI and title files to `specialist-docs`.
5. Insert `specialist_profiles` with `license_status = 'pending'`.
6. Return the created specialist profile.

`getStatus(userId)` must:

1. Query `specialist_profiles` by `user_id`.
2. Return status fields.
3. Return `null` if the specialist profile does not exist, unless the project pattern prefers 404.

## Frontend requirements

Modify:

```text
app/(auth)/register.tsx
```

Add conditional flow when `role === 'specialist'`:

1. Base registration fields.
2. Specialty and license number.
3. DNI photo and title photo.

Create:

```text
app/specialist-status.tsx
```

Show:

- pending status
- rejected status with reason
- verified status if needed

Update navigation:

- `user` → current tabs.
- `specialist` + `pending/rejected` → specialist status screen.
- `specialist` + `verified` → specialist tabs if they already exist, otherwise keep status/placeholder without implementing M4.

## Tests

Create or update tests in Spanish.

Required cases:

- duplicate license number throws 409.
- successful registration creates specialist profile with pending status.
- document upload uses `specialist-docs` bucket.
- `requireRole` allows matching role.
- `requireRole` rejects wrong role with 403.
- `requireRole` rejects missing user with 403.

## Integration contract exposed by M3

M3 provides:

```text
DB: profiles.role
DB: specialist_profiles.license_status
Middleware: requireRole('specialist')
Endpoint: GET /api/specialist/status
```

These are consumed by M4 and M5. Keep the contract stable.

## Verification

Before final answer, run relevant tests if possible:

```bash
npm test
```

or the backend-specific command used by the repo.

Also check TypeScript build/lint if available.
