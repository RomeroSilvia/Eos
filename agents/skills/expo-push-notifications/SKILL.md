---
name: expo-push-notifications
description: Use this skill when implementing EOS Entrega 2 Módulo 2 — remote push notifications with Expo Push API, token registration in push_tokens, the notification.job.ts cron scheduler, and the in-app notification center screen.
---

# expo-push-notifications

Use this skill only for Módulo 2 — Push Notifications Remotas.

## Scope

Implement only:

1. Backend `notifications` module additions: routes + controller for token register/unregister (the module already has `notifications.service.ts`, keep it).
2. `push_tokens` repository methods.
3. `notificationsService.sendToUser()` (service-to-service, not exposed as a public endpoint).
4. Cron scheduler (`backend/src/jobs/notification.job.ts`) that checks reminder times and triggers sends.
5. Frontend: extend `services/notifications.ts` with `registerPushToken()` / token cleanup on logout.
6. Frontend: in-app notification center screen (`app/notifications.tsx`) — list of past notifications with "Todas" / "No leídas" tabs, grouped by day.
7. Tests.

Do not implement:

- M1 Apple Sign-In or skin type update.
- M3 roles / specialist registration.
- M4 specialist panel.
- M5 specialist search or chat.

## Branch

Use or suggest:

```text
feature/e2-push-notifications
```

## Required reading before coding

1. Read `docs/plan_entrega2.md` completo, especialmente la sección **"Módulo 2 — Push Notifications Remotas"**.
2. Read `database/e2_schema.sql` and confirm `push_tokens` exists (columns: `id`, `user_id` UNIQUE, `expo_token`, `platform`, `updated_at`).
3. Read `services/notifications.ts` — local scheduling already exists with `expo-notifications`; do not duplicate it, only add the remote-token half.
4. Read `CLAUDE.md` section **"Notificaciones: dos sistemas independientes"** — local vs. remote must stay separate.
5. Look at `docs/figma/notifications-all-reference.png` and `docs/figma/notifications-unread-reference.png` for the in-app notification center UI.

## Backend requirements

### 1. Extend the `notifications` module

Existing file (keep as-is, only add to it if needed):

```text
backend/src/modules/notifications/notifications.service.ts
```

Add, following the standard pattern (`routes → controller → service → repository`):

```text
backend/src/modules/notifications/notifications.routes.ts
backend/src/modules/notifications/notifications.controller.ts
backend/src/modules/notifications/notifications.repository.ts
backend/src/modules/notifications/tests/notifications.service.test.ts
```

`notifications` is one of the documented exceptions in `CLAUDE.md` (only had service, no routes/controller). Adding routes/controller here is exactly what closes that gap for E2 — do not move sending logic out of the service.

### 2. Repository

```ts
export const notificationsRepository = {
  upsertToken: async (userId: string, expoToken: string, platform: 'ios' | 'android') => {
    // UPSERT en push_tokens (onConflict: 'user_id')
  },
  deleteToken: async (userId: string) => { /* ... */ },
  findTokenByUserId: async (userId: string) => { /* ... */ },
  findTokensByUserIds: async (userIds: string[]) => { /* ... */ }
};
```

### 3. Endpoints

```text
POST   /api/notifications/token    → authenticate, body: { expoToken, platform } → 200 OK
DELETE /api/notifications/token    → authenticate (logout) → 204 No Content
GET    /api/notifications/health   → health check
```

`POST /api/notifications/send` is **not** a public route — `notificationsService.sendToUser()` is called directly from other modules (or from the cron job), never exposed to the client. Do not add a controller/route for it.

### 4. Cron scheduler

Create:

```text
backend/src/jobs/notification.job.ts
```

```ts
import cron from 'node-cron';

cron.schedule('* * * * *', async () => {
  // 1. Calcular currentTime 'HH:mm'
  // 2. Buscar perfiles con notifications_enabled=true y reminder_time=currentTime
  // 3. Para cada uno, verificar si tiene rutina activa pendiente hoy
  // 4. notificationsService.sendToUser(userId, title, body, data)
});
```

Register it from `backend/src/server.ts` (import for side effect on boot). Install first:

```bash
npm install node-cron
npm install -D @types/node-cron
```

Use the **service role key** for any Supabase query inside the job (never the anon key) — see `CLAUDE.md` env conventions.

## Frontend requirements

### 1. Extend `services/notifications.ts`

Add alongside the existing local-scheduling functions (do not touch `scheduleRemindersByTime`):

```ts
export async function registerPushToken(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId
  });

  await apiRequest({
    path: '/notifications/token',
    method: 'POST',
    body: JSON.stringify({ expoToken: tokenData.data, platform: Platform.OS })
  });
}

export async function unregisterPushToken(): Promise<void> {
  await apiRequest({ path: '/notifications/token', method: 'DELETE' });
}
```

Call `registerPushToken()` from `services/auth.ts` after a successful login/register (mirror how the project already wires post-login side effects). Call `unregisterPushToken()` on logout, before clearing the stored session.

### 2. In-app notification center screen

Create:

```text
app/notifications.tsx
```

This is a top-level `Stack.Screen` (register it in `app/_layout.tsx`, same pattern as `specialist-status`), not a tab — it's reached from a bell icon, it is not part of `(tabs)`.

Recreate `docs/figma/notifications-all-reference.png` and `docs/figma/notifications-unread-reference.png`:

- Header "Notificaciones" + bell icon with unread-count badge.
- Two tabs: "Todas" / "No leídas" (with unread count badge on the second tab).
- List grouped by day ("Hoy", "Ayer", ...).
- Each item: colored circular icon (color/icon depends on notification kind), bold title, secondary-color body text.
- Reuse `colors` from `constants/colors.ts`, the `Card`-style rounded surfaces, and `Ionicons` — do not introduce a new visual language.

Add the route to `constants/routes.ts` (`notifications: '/notifications'`).

## Tests

Create tests in Spanish, following the existing `jest.mock` + `make*` factory pattern (see `products.service.test.ts` as reference).

Required cases for `notifications.service.test.ts`:

- `registerToken` hace upsert correctamente en `push_tokens`.
- `sendToUser` no falla si el usuario no tiene token registrado.
- `sendToUser` llama a la Expo Push API con el payload correcto (`to`, `title`, `body`, `data`).
- `deleteToken` elimina el token del usuario.

## Integration contract exposed by M2

```text
Endpoint: POST   /api/notifications/token   → 200 OK
Endpoint: DELETE /api/notifications/token   → 204 No Content
Función interna: notificationsService.sendToUser(userId, title, body, data?)
Tabla: push_tokens
```

`sendToUser()` is consumed directly (function import, not HTTP) by M4 (rutina asignada) and M5 (mensaje nuevo). Keep its signature stable.

## Verification

Before the final answer, run:

```bash
cd backend && npm test -- --testPathPattern=notifications
cd backend && npm run typecheck
npm run lint
```
