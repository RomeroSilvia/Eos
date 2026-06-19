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

## Migraciones Entrega 2 - Modulo 3

Antes de probar el registro de especialistas, ejecutar en Supabase SQL Editor, en este orden:

```sql
-- 1
-- database/e2_schema.sql

-- 2
-- database/specialist_docs_storage_policies.sql

-- 3
-- database/specialist_profiles_rls_policies.sql

-- 4
-- database/e2_profiles_rls_policies.sql
```

### Alcance real Modulo 3

Implementado realmente:

- Registro con roles `user` y `specialist`.
- Bloqueo de `center_admin` en registro publico.
- Middleware `authenticate`.
- Middleware `requireRole`.
- Registro de especialista con documentacion.
- Estado de especialista `pending`, `verified` y `rejected`.
- Panel admin para aprobar o rechazar especialistas.
- Storage privado para documentos y signed URLs temporales.
- Navegacion protegida por rol y `license_status`.

Placeholder / fuera del Modulo 3:

- Gestion real de clientes.
- Consultas/chat.
- Buscador de especialistas.
- Asignacion de rutinas.
- Tabs especialista con datos reales.

## Modulos verticales

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
