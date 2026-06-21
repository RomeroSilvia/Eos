# EOS Skincare App — Agent Instructions

## Project

React Native Expo frontend + Express/Node backend + Supabase.

## Before doing anything

1. Read `docs/plan_entrega2.md` completo — no solo la sección de tu módulo.
2. Read the "Módulo 2 scope" section below.
3. Read `CLAUDE.md` for architecture/conventions that apply to the whole repo.
4. Confirm the tables this module needs already exist in `database/e2_schema.sql`.
5. Run `npm test` in `backend/` to confirm Entrega 1 tests still pass before touching existing code.

## E2 module convention

New backend modules must follow:

```text
routes → controller → service → repository → tests
```

Tests must be written in Spanish, following the existing project style.

## Módulo 2 scope (current focus)

Módulo 2 owns:

- `push_tokens` table usage (register/unregister token).
- `notifications` backend module: routes + controller added on top of the existing `notifications.service.ts`.
- `notificationsService.sendToUser()` (internal, never a public route).
- Cron scheduler in `backend/src/jobs/notification.job.ts`.
- Frontend `registerPushToken()` / `unregisterPushToken()` in `services/notifications.ts`.
- In-app notification center screen (`app/notifications.tsx`), recreating `docs/figma/notifications-all-reference.png` and `docs/figma/notifications-unread-reference.png`.

Use the `expo-push-notifications` skill (`agents/skills/expo-push-notifications/SKILL.md`) for the detailed spec of this module.

Do not implement M1, M3, M4 or M5 unless explicitly requested.

## Expected branch

```text
feature/e2-push-notifications
```

## Backend conventions

- Follow the existing Express module pattern.
- Keep controllers thin.
- Put business rules in services.
- Put Supabase queries in repositories when possible.
- Use existing `ApiError` pattern.
- Do not duplicate logic from other modules if a shared helper already exists.
- Use the Supabase **service role key** for the cron job; never the anon key there.

## Frontend conventions

- Reuse existing app components, colors (`constants/colors.ts`) and route constants (`constants/routes.ts`).
- Add new routes to `constants/routes.ts` when the project uses it.
- Keep the notification center visually consistent with the rest of the app — no new visual language.
- Do not touch the existing local-scheduling logic in `services/notifications.ts` (`scheduleRemindersByTime`); only add the remote-token functions alongside it.

## Verification

Before finishing a task, run the relevant backend tests and check TypeScript if available.

Recommended commands depend on the repo, but usually include one or more of:

```bash
npm test
npm run test
npm run typecheck
npm run lint
```

## Security

- Do not commit secrets.
- Do not expose `POST /api/notifications/send` as a public route — it's internal only.
- Do not use real personal data in seeds or tests.
