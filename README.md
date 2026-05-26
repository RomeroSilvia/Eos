# Eos

Aplicación móvil de seguimiento personal de rutinas de skincare. Permite registrar rutinas diarias, productos, completar pasos y visualizar el progreso a lo largo del tiempo.

Proyecto académico — UTN, cuarto año, Aplicaciones Móviles.

## Stack

**Frontend**
- Expo SDK 54 / React Native 0.81 / React 19.1
- TypeScript estricto
- expo-router (navegación basada en archivos)
- expo-secure-store (almacenamiento de tokens)
- expo-notifications (recordatorios locales)
- expo-image-picker (fotos de perfil y productos)
- @react-native-google-signin/google-signin

**Backend**
- Node.js + Express 4 + TypeScript
- Supabase (PostgreSQL + Auth + Storage)
- multer (subida de imágenes)
- Jest + ts-jest (tests)

## Requisitos

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`) o usar `npx expo`
- Aplicación Expo Go en el celular, o emulador Android/iOS
- Cuenta en Supabase con el schema cargado (ver `docs/database-setup.md`)

## Instalación y desarrollo

### 1. App móvil (raíz)

```bash
npm install
cp .env.example .env   # Completar EXPO_PUBLIC_API_URL si se usa backend real
npm start              # Expo en modo desarrollo
```

Variables de entorno del frontend (`.env`):

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_USE_MOCKS=false
```

Con `EXPO_PUBLIC_USE_MOCKS=true` la app funciona sin backend, devolviendo datos hardcodeados.

### 2. Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env   # Completar con credenciales Supabase
npm run dev            # Servidor con hot reload en http://localhost:3000
```

Variables de entorno del backend (`backend/.env`):

```
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
CORS_ORIGIN=http://localhost:8081
PASSWORD_RESET_REDIRECT_URL=http://localhost:8081/update-password
```

### 3. Base de datos

Crear un proyecto en Supabase, abrir el SQL Editor y ejecutar `database/initial_schema.sql`. Ver `docs/database-setup.md` para más detalles.

### Dispositivo físico

Reemplazar `localhost` en `EXPO_PUBLIC_API_URL` por la IP local de la máquina (ej. `http://192.168.1.x:3000/api`). En Android, el cliente HTTP también mapea automáticamente `localhost` a `10.0.2.2` para emuladores.

## Comandos principales

### Frontend

```bash
npm start          # Expo DevTools
npm run android    # Android
npm run ios        # iOS
npm run lint       # ESLint
```

### Backend

```bash
npm run dev        # Desarrollo con hot reload
npm run typecheck  # Verificar tipos
npm test           # Todos los tests
npm test -- --testPathPattern=products   # Tests de un módulo
npm run build      # Compilar a dist/
npm start          # Producción (requiere build previo)
```

### Health checks

```
GET http://localhost:3000/api/health
GET http://localhost:3000/api/auth/health
GET http://localhost:3000/api/routines/health
GET http://localhost:3000/api/products/health
GET http://localhost:3000/api/progress/health
GET http://localhost:3000/api/profile/health
```

## Funcionalidades implementadas

### Autenticación
- Registro con foto de perfil, rol (usuario / especialista) y datos personales
- Login con email y contraseña
- Login con Google
- Recuperación y actualización de contraseña
- Sesión persistida con `expo-secure-store`

### Quiz de diagnóstico de piel
- 5 preguntas sobre edad, tipo de piel, imperfecciones, objetivo y preferencias de rutina
- Resultado guardado en `skin_profiles` vinculado al usuario
- Flujo: `landing → register → start-diagnosis → start-quiz → quiz → quiz-results → home`

### Rutinas
- CRUD completo de rutinas (mañana / noche / personalizada)
- CRUD de pasos con categorías y orden
- Asociación de productos a pasos
- Edición de rutinas existentes
- Wizard de creación en 6 pasos (Create → Step2 → Step3 → Step4 → Step5-products → Step6-confirm → success)

### Productos
- CRUD de productos con imagen (subida a Supabase Storage)
- Categorización y asociación a pasos de rutina

### Progreso
- Resumen semanal y mensual de cumplimiento
- Racha actual y mejor racha histórica
- Calendario mensual de cumplimiento por día
- Historial detallado por fecha
- Estadísticas avanzadas de rutinas y productos

### Home
- Saludo personalizado
- Rutina activa del día con progreso
- Métricas rápidas
- Recordatorios con toggle

## Estructura del proyecto

```
Eos/
├── app/                  Pantallas y navegación (expo-router)
│   ├── (auth)/           Login, registro, recuperación de contraseña
│   ├── (tabs)/           Home, Rutinas, Productos, Progreso, Perfil
│   ├── routine/          Wizard de creación, edición y Add-step
│   ├── products/         Lista, detalle, creación
│   ├── progress/         Historial y estadísticas
│   └── quiz*.tsx         Flujo de diagnóstico de piel
├── components/           UI reutilizable (Button, Card, ProgressBar, etc.)
├── hooks/                Lógica por módulo (useHome, useRoutine, useProducts, etc.)
├── services/             Clientes HTTP y servicios de dominio
│   └── api/client.ts     apiRequest centralizado con manejo de auth y errores
├── types/                Tipos TypeScript compartidos
├── constants/            colors.ts y routes.ts
├── utils/                Helpers de formateo (fechas, métricas, calendario)
├── assets/               Imágenes y fuentes
├── docs/                 Documentación técnica del proyecto
├── database/             Schema SQL inicial
└── backend/              Servidor Express independiente
    └── src/
        ├── modules/      auth · quiz · routines · products · progress · profile
        ├── middlewares/  auth · error · notFound
        ├── database/     Tipos generados por Supabase + tableNames
        ├── config/       Variables de entorno y cliente Supabase
        └── utils/        ApiError y asyncHandler
```

## Documentación adicional

| Archivo | Contenido |
|---|---|
| `docs/estructura-proyecto.md` | Estructura detallada y convenciones |
| `docs/backend-setup.md` | Endpoints y setup del backend |
| `docs/database-setup.md` | Schema de base de datos y pendientes |
| `docs/env.md` | Variables de entorno completas |
| `docs/division-modulos.md` | División de responsabilidades por integrante |
| `docs/progress-module-contract.md` | Contrato técnico del módulo Progreso |
| `docs/plan-tecnico.md` | Plan técnico de las tres entregas |
| `CLAUDE.md` | Guía para Claude Code |
