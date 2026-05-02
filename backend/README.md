# Eos Backend

Backend inicial de Eos con Node.js, Express, TypeScript y Supabase.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Health checks

```txt
GET http://localhost:3000/api/health
GET http://localhost:3000/api/auth/health
GET http://localhost:3000/api/routines/health
GET http://localhost:3000/api/products/health
GET http://localhost:3000/api/progress/health
GET http://localhost:3000/api/profile/health
```

## Variables

Ver `backend/.env.example`.

No colocar credenciales reales en el repositorio. `SUPABASE_SERVICE_ROLE_KEY` es solo para backend.
