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

## Endpoints placeholder

```txt
GET /api/health
GET /api/auth/health
GET /api/routines/health
GET /api/products/health
GET /api/progress/health
GET /api/profile/health
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Importante

Este backend todavia no implementa CRUD, autenticacion real ni reglas de negocio. Solo deja montada la estructura para trabajar por modulos.
