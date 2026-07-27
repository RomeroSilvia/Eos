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
npm test           # Todos los tests Jest (30 suites / 304 tests)
npm test -- --testPathPatterns=<modulo>   # Tests de un módulo específico
```

## Endpoints

Organización por módulo en `backend/src/modules/<modulo>/`. Todos los módulos exponen `GET /health` público (sin autenticación) — ver la lista completa en el `README.md` de la raíz.

### Auth — `/api/auth` (públicos, sin autenticación)

```
POST /api/auth/register        { email, password, username, firstName, lastName, role }
POST /api/auth/login           { email, password }
POST /api/auth/google          { idToken }
POST /api/auth/forgot-password { email }
POST /api/auth/reset-password  { email }
POST /api/auth/update-password { newPassword, accessToken }
```

### Quiz — `/api/quiz` (requieren autenticación)

```
GET  /api/quiz/profile
POST /api/quiz/save   { ageRange, skinType, imperfections, mainGoal, routineSteps }
```

### Rutinas — `/api/routines` (requieren autenticación)

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

### Productos — `/api/products` (requieren autenticación)

```
GET    /api/products
GET    /api/products/:id
POST   /api/products         (multipart/form-data — imagen incluida)
PATCH  /api/products/:id     (multipart/form-data)
DELETE /api/products/:id
DELETE /api/products/:id/force
PUT    /api/products/:id/replace
```

### Progreso — `/api/progress` (requieren autenticación)

```
GET   /api/progress/summary
GET   /api/progress/stats
GET   /api/progress/day/:date
GET   /api/progress/history
GET   /api/progress/history/all
GET   /api/progress/routines/:routineId/today
PATCH /api/progress/routines/:routineId/today/steps/:stepId
```

### Perfil — `/api/profile` (requiere autenticación)

```
PATCH /api/profile
```

### Especialistas — registro/estado — `/api/specialist` (nota: singular)

```
POST /api/specialist/register   (auth + rol specialist; multipart dniPhoto/titlePhoto)
GET  /api/specialist/status     (auth + rol specialist)
```

### Especialistas — directorio y vínculos — `/api/specialists` (nota: plural, router distinto)

```
GET    /api/specialists                         (público, sin auth)
POST   /api/specialists/link                     (auth + rol user)
DELETE /api/specialists/link                     (auth + rol user)
POST   /api/specialists/unlink                    (auth + rol user)
GET    /api/specialists/my-specialist            (auth + rol user)
GET    /api/specialists/my-patients              (auth + rol specialist)
GET    /api/specialists/my-patients/:patientId   (auth + rol specialist)
POST   /api/specialists/my-patients/:patientId/routines  (auth + rol specialist)
```

### Chat — `/api/chat` (requieren autenticación)

```
GET    /api/chat/messages
GET    /api/chat/messages/:messageId
POST   /api/chat/messages       (soporta multipart con imagen)
POST   /api/chat/video-call
PATCH  /api/chat/messages/read
DELETE /api/chat/messages
```

> `POST /api/chat/media` existe en las rutas pero está deprecado: el controller (`chat.controller.ts`) siempre responde `410 Gone` ("Usa POST /chat/messages para enviar imagenes."). El envío de imágenes se hace vía `POST /api/chat/messages` con `multipart/form-data`.

### Notificaciones — `/api/notifications` (requieren autenticación)

```
POST   /api/notifications/token
DELETE /api/notifications/token
GET    /api/notifications
PATCH  /api/notifications/:id/read
```

### Admin — `/api/admin` (requieren autenticación + rol `center_admin`)

```
GET   /api/admin/specialists
GET   /api/admin/specialists/pending
PATCH /api/admin/specialists/:specialistId/center
PATCH /api/admin/specialists/:specialistProfileId/status
GET   /api/admin/specialists/:specialistProfileId/documents
```

### Centros — `/api/centers` (requieren autenticación + rol `center_admin`)

```
GET    /api/centers
POST   /api/centers
GET    /api/centers/:centerId/dashboard
GET    /api/centers/:centerId/specialists
POST   /api/centers/:centerId/image   (multipart, límite 5MB)
PATCH  /api/centers/:centerId
DELETE /api/centers/:centerId
```

### Suscripciones — `/api/subscriptions` y alias `/api/admin/subscriptions` (mismo router, montado dos veces)

```
GET   /api/subscriptions/me                (solo auth)
PATCH /api/subscriptions/me/cancel         (solo auth)
GET   /api/subscriptions/plans             (+ rol center_admin)
POST  /api/subscriptions/plans             (+ rol center_admin)
PATCH /api/subscriptions/plans/:planId     (+ rol center_admin)
GET   /api/subscriptions/users/search      (+ rol center_admin)
GET   /api/subscriptions                   (+ rol center_admin)
POST  /api/subscriptions                   (+ rol center_admin)
PATCH /api/subscriptions/:subscriptionId/status  (+ rol center_admin)
```

### Auditoría — `/api/admin/audit-log` (requiere autenticación + rol `center_admin`)

```
GET /api/admin/audit-log
```

## Autenticación

Todos los endpoints protegidos requieren el header:

```
Authorization: Bearer <access_token>
```

El middleware `auth.middleware.ts` valida el token contra Supabase Auth y setea `req.user.id` + `req.user.role`. No hay ningún middleware de auth mock para desarrollo — siempre se valida un token real de Supabase, incluso en local.

## Patrones de implementación

- **Errores controlados:** `throw new ApiError(status, mensaje)` — propagados al middleware de error global.
- **Handlers async:** envolver con `asyncHandler(fn)` para capturar errores sin try/catch manual.
- **userId:** siempre leer de `req.user.id`, nunca del body o query params.
- **Imágenes:** multer con `MemoryStorage`; las imágenes se pasan al service como `req.file`.
- **Tabla names:** usar constantes de `database/tableNames.ts`.
- **Tipos DB:** aliases en `database/schema.types.ts` (RoutineRow, ProductInsert, etc.).

## Estado actual

- Autenticación real implementada con Supabase Auth (JWT Bearer), login con Google vía `POST /api/auth/google` (el backend lo soporta; el frontend todavía no lo integra — ver README, sección Entrega 3 / Módulo 2).
- 13 módulos de dominio implementados: `auth`, `profile`, `routines`, `products`, `progress`, `quiz`, `chat`, `specialists`, `admin`, `centers`, `audit`, `subscriptions`, `notifications`.
- CRUD completo de rutinas (incluida edición de pasos post-creación), productos, centros y planes/suscripciones.
- Auditoría transversal (`recordAuditLog`) consumida por la mayoría de los módulos que hacen mutaciones.
- Suite de tests: 30 suites / 304 tests, todos en verde (`npm test`).
