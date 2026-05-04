# Backend setup

El backend de Eos vive en `backend/` y usa Node.js, Express y TypeScript.

## Instalacion

```bash
cd backend
npm install
```

## Desarrollo

```bash
cp .env.example .env
npm run dev
```

El servidor levanta por defecto en:

```txt
http://localhost:3000
```

## Endpoints principales

```txt
GET /api/health
GET /api/auth/health
GET /api/routines/health
GET /api/routines
GET /api/routines/:id
POST /api/routines
PATCH /api/routines/:id
DELETE /api/routines/:id
GET /api/routines/:id/steps
POST /api/routines/:id/steps
PATCH /api/routines/steps/:stepId
DELETE /api/routines/steps/:stepId
GET /api/products/health
GET /api/progress/health
GET /api/progress/routines/:routineId/today
PATCH /api/progress/routines/:routineId/today/steps/:stepId
GET /api/profile/health
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Estado actual

El backend ya implementa CRUD de rutinas y pasos usando Supabase. Tambien guarda el progreso diario de pasos en `routine_logs` y `routine_step_logs`.

La autenticacion real todavia esta pendiente: por ahora las rutas de rutinas/progreso usan `mockAuth` con un usuario fijo de desarrollo.
