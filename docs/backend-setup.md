# Backend setup

El backend de Eos vive en `backend/` y usa Node.js, Express y TypeScript conectado a Supabase.

## Instalación

```bash
cd backend
npm install
cp .env.example .env   # Completar con credenciales Supabase
```

## Desarrollo

```bash
npm run dev     # ts-node-dev con hot reload en http://localhost:3000
```

## Scripts disponibles

```bash
npm run dev        # Desarrollo con hot reload
npm run build      # Compilar TypeScript → dist/
npm start          # Producción (requiere build previo)
npm run typecheck  # Verificar tipos sin compilar
npm test           # Todos los tests Jest
npm test -- --testPathPattern=<modulo>   # Tests de un módulo específico
```

## Endpoints

### Health checks (públicos)

```
GET /api/health
GET /api/auth/health
GET /api/routines/health
GET /api/products/health
GET /api/progress/health
GET /api/profile/health
```

### Auth (públicos)

```
POST /api/auth/register        { email, password, username, firstName, lastName, role }
POST /api/auth/login           { email, password }
POST /api/auth/google          { idToken }
POST /api/auth/forgot-password { email }
POST /api/auth/reset-password  { email }
POST /api/auth/update-password { newPassword, accessToken }
```

### Quiz (requieren autenticación)

```
GET  /api/quiz/profile
POST /api/quiz/save   { ageRange, skinType, imperfections, mainGoal, routineSteps }
```

### Rutinas (requieren autenticación)

```
GET    /api/routines
POST   /api/routines
GET    /api/routines/:id
PATCH  /api/routines/:id
DELETE /api/routines/:id
GET    /api/routines/:id/steps
POST   /api/routines/:id/steps
PATCH  /api/routines/steps/:stepId
DELETE /api/routines/steps/:stepId
GET    /api/routines/steps/:stepId/products
POST   /api/routines/steps/:stepId/products
PUT    /api/routines/steps/:stepId/products
DELETE /api/routines/steps/:stepId/products/:productId
```

### Productos (requieren autenticación)

```
GET    /api/products
GET    /api/products/:id
POST   /api/products      (multipart/form-data — imagen incluida)
PATCH  /api/products/:id  (multipart/form-data)
DELETE /api/products/:id
```

### Progreso (requieren autenticación)

```
GET /api/progress/summary
GET /api/progress/stats
GET /api/progress/history
GET /api/progress/history/:date
```

### Perfil (requieren autenticación)

```
GET   /api/profile
PATCH /api/profile
```

## Autenticación

Todos los endpoints protegidos requieren el header:

```
Authorization: Bearer <access_token>
```

El middleware `auth.middleware.ts` valida el token con Supabase y setea `req.user.id`. En desarrollo puede reemplazarse por `mockAuth.middleware.ts`, que inyecta un UUID fijo (`11111111-1111-1111-1111-111111111111`).

## Patrones de implementación

- **Errores controlados:** `throw new ApiError(status, mensaje)` — propagados al middleware de error global.
- **Handlers async:** envolver con `asyncHandler(fn)` para capturar errores sin try/catch manual.
- **userId:** siempre leer de `req.user.id`, nunca del body o query params.
- **Imágenes:** multer con `MemoryStorage`; las imágenes se pasan al service como `req.file`.
- **Tabla names:** usar constantes de `database/tableNames.ts`.
- **Tipos DB:** aliases en `database/schema.types.ts` (RoutineRow, ProductInsert, etc.).

## Estado actual

- Autenticación real implementada con Supabase Auth (JWT Bearer).
- CRUD completo de rutinas, pasos, productos y asociaciones.
- Módulo Progreso implementado (solo lectura, calcula desde `routine_logs`).
- Módulo Quiz implementado (controller + routes; sin service/repository separado).
- Subida de imágenes de productos implementada con Supabase Storage.
- Tests unitarios en `modules/*/tests/` para products, progress y routines.
